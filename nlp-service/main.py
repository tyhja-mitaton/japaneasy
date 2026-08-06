from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import fugashi

app = FastAPI(title="Japanese NLP Service")

# Инициализируем тагер один раз при старте
tagger = fugashi.Tagger()

class TextRequest(BaseModel):
    text: str


class WordRequest(BaseModel):
    word: str


class GrammarRequest(BaseModel):
    text: str
    patterns: list[dict] = []   # [{code: str, pattern: str}, ...]


class WordResponse(BaseModel):
    surface: str        # исходное слово
    base_form: str      # словарная форма
    reading: str        # чтение (катакана)
    pos: str            # часть речи

# ── Грамматический матчер ─────────────────────────────────────────────────────

# Ключевые слова-плейсхолдеры. Один атом — целый токен (или цепочка из 2–3 токенов
# для форм спряжения), начинающийся на границе токена.
#
# POS (unidic-lite):
#   meishi      — существительное (名詞)
#   keiyoshi    — прилагательное (形容詞)
#   keiyodoushi — адъективное существительное / な-прилагательное (形状詞)
#   doushi      — глагол (動詞)
#   daimeishi   — местоимение (代名詞)
# Формы:
#   kohonkei    — словарная форма (несклоняемые или cform = 終止形-一般/連体形-一般)
#   renyokei    — 連用形 (соединительная форма)
#   kakokei     — прошедшее время (連用形 + た/だ)
#   hiteikei    — отрицательная форма (…ない/無い/ず/ん)

POS_PREDICATES = {
    "meishi":      lambda t: t["pos"] == "名詞",
    "keiyoshi":    lambda t: t["pos"] == "形容詞",
    "keiyodoushi": lambda t: t["pos"] == "形状詞",
    "doushi":      lambda t: t["pos"] == "動詞",
    "daimeishi":   lambda t: t["pos"] == "代名詞",
    "kohonkei":    lambda t: t["pos"] in ("動詞", "形容詞", "助動詞", "形状詞")
        and t["cform"] in ("*", "終止形-一般", "連体形-一般", "文語基本形"),
    "renyokei":    lambda t: t["cform"].startswith("連用形-"),
}


def _match_kakokei(tokens: list[dict], i: int) -> int:
    """Прошедшее время: 連用形 (動詞/形容詞/助動詞) + 助動詞 た (поверхность た/だ)."""
    if i + 1 >= len(tokens):
        return 0
    a, b = tokens[i], tokens[i + 1]
    if a["pos"] not in ("動詞", "形容詞", "助動詞"):
        return 0
    if not a["cform"].startswith("連用形-"):
        return 0
    if b["pos"] == "助動詞" and b["lemma"] == "た":
        return 2
    return 0


def _is_negative_marker(t: dict) -> bool:
    return (
        (t["pos"] == "助動詞" and t["lemma"] == "ない")
        or (t["pos"] == "形容詞" and t["lemma"] in ("ない", "無い"))
        or (t["lemma"] == "ず")
        or (t["pos"] == "助動詞" and t["surface"] == "ん")
    )


def _match_hiteikei(tokens: list[dict], i: int) -> int:
    """
    Отрицательная форма:
      食べない/行かない    — 未然形 (動詞) + ない
      ませ(ん)             — 未然形 (助動詞) + ん
      高くない            — 連用形 (形容詞) + ない
      じゃない             — じゃ + ない
      ではない            — で + は + ない
    """
    if i + 1 >= len(tokens):
        return 0
    a, b = tokens[i], tokens[i + 1]

    if _is_negative_marker(b):
        if a["pos"] == "動詞" and a["cform"].startswith("未然形"):
            return 2
        if a["pos"] == "助動詞" and a["cform"].startswith("未然形"):
            return 2
        if a["pos"] == "形容詞" and a["cform"].startswith("連用形"):
            return 2
        if a["pos"] == "助動詞" and a["surface"] == "じゃ":
            return 2

    if (
        i + 2 < len(tokens)
        and a["surface"] == "で" and a["pos"] == "助詞"
        and tokens[i + 1]["surface"] == "は"
        and _is_negative_marker(tokens[i + 2])
    ):
        return 3

    return 0


MULTI_PREDICATES = {
    "kakokei":  _match_kakokei,
    "hiteikei": _match_hiteikei,
}


def _predicate_consumes(tokens: list[dict], i: int, keyword: str) -> int:
    """Сколько токенов поглощает ключевое слово, начиная с i (0 = нет совпадения)."""
    if keyword in POS_PREDICATES:
        if i < len(tokens) and POS_PREDICATES[keyword](tokens[i]):
            return 1
        return 0
    fn = MULTI_PREDICATES.get(keyword)
    if fn:
        return fn(tokens, i)
    return 0


def _predicate_consumptions(tokens: list[dict], i: int, keyword: str) -> list[int]:
    """Все возможные длины поглощения предиката (0 = нет совпадения).

    POS-предикаты поглощают основу И следующие подряд вспомогательные глаголы
    (助動詞): «吸います» — вежливая форма «吸う», поэтому {doushi} покрывает
    всю сказуемую группу. Возвращается [1] и [1+k] для каждого следующего
    助動詞 (для 言い+まし+た → [1, 2, 3]). Кратчайший вариант пробуется первым,
    что сохраняет прежнее поведение для простых паттернов.
    """
    if keyword in POS_PREDICATES:
        if i >= len(tokens) or not POS_PREDICATES[keyword](tokens[i]):
            return []
        lengths = [1]
        j = i + 1
        while j < len(tokens) and tokens[j]["pos"] == "助動詞":
            lengths.append(lengths[-1] + 1)
            j += 1
        return lengths
    fn = MULTI_PREDICATES.get(keyword)
    if fn:
        consumed = fn(tokens, i)
        return [consumed] if consumed else []
    return []


LOOKBEHIND_MAX_TOKENS = 6


def _behind_matches(tokens: list[dict], bounds: list[tuple[int, int]],
                    p: int, keywords: list[str]) -> bool:
    """True, если непосредственно перед позицией p заканчивается предикатная
    группа, удовлетворяющая хотя бы одному ключевому слову (lookbehind).

    Lookbehind поглощает следующие подряд 助動詞: `[doushi]し` совпадает с
    吸いますし, т.к. группа покрывает 吸い+ます. Скан назад ограничен
    LOOKBEHIND_MAX_TOKENS (поглощение 助動詞 редко превышает 2–3 токена).
    """
    j = None
    for idx, (_, e) in enumerate(bounds):
        if e == p:
            j = idx
            break
        if e > p:
            break
    if j is None:
        return False
    for kw in keywords:
        for s in range(j, max(-1, j - LOOKBEHIND_MAX_TOKENS), -1):
            for consumed in _predicate_consumptions(tokens, s, kw):
                if s + consumed - 1 == j:
                    return True
    return False


def compile_pattern(pattern: str) -> list[tuple]:
    """
    Компилирует паттерн в последовательность атомов:
      ("lit", text)       — литерал (подстрока)
      ("opts", [text,..]) — один из литералов {A|B}
      ("any",)            — любой непустой текст (ленивый) ~
      ("pred", [kw,..])   — группа предикатов {meishi|keiyoshi} — целый токен
      ("behind", [kw,..]) — lookbehind: предикаты сразу перед матчем (нулевой
                            ширины, в спан не входят)

    {A|B|..} трактуется как группа-предикат только если ВСЕ варианты — ключевые
    слова; иначе это литеральные варианты (существующее поведение).
    """
    atoms = []
    literal: list[str] = []
    i = 0
    n = len(pattern)

    def flush() -> None:
        if literal:
            atoms.append(("lit", "".join(literal)))
            literal.clear()

    while i < n:
        ch = pattern[i]
        if ch == "~":
            flush()
            atoms.append(("any",))
            i += 1
        elif ch == "{":
            end = pattern.find("}", i)
            if end == -1:
                literal.append(ch)
                i += 1
                continue
            options = pattern[i + 1:end].split("|")
            if options and all(k in POS_PREDICATES or k in MULTI_PREDICATES for k in options):
                flush()
                atoms.append(("pred", options))
            else:
                flush()
                atoms.append(("opts", options))
            i = end + 1
        elif ch == "[":
            end = pattern.find("]", i)
            if end == -1:
                literal.append(ch)
                i += 1
                continue
            options = pattern[i + 1:end].split("|")
            if options and all(k in POS_PREDICATES or k in MULTI_PREDICATES for k in options):
                flush()
                atoms.append(("behind", options))
            else:
                literal.append(ch)
                i += 1
                continue
            i = end + 1
        else:
            literal.append(ch)
            i += 1

    flush()
    return atoms


def _valid_token_starts(tokens: list[dict], bounds: list[tuple[int, int]],
                        keywords: list[str], min_pos: int) -> list[int]:
    """Позиции в рабочем тексте, где токен удовлетворяет хотя бы одному ключевому слову."""
    starts = []
    for i, (s, _) in enumerate(bounds):
        if s <= min_pos:
            continue
        if any(_predicate_consumes(tokens, i, kw) for kw in keywords):
            starts.append(s)
    return starts


def _candidate_positions(atom: tuple, text: str, min_pos: int,
                         token_starts: list[int]) -> list[int]:
    """Куда может начаться следующий атом после `~` (позиции > min_pos)."""
    kind = atom[0]
    if kind == "any":
        return []
    if kind == "lit":
        return _occurrences(text, atom[1], min_pos)
    if kind == "opts":
        positions = []
        for opt in atom[1]:
            positions.extend(_occurrences(text, opt, min_pos))
        return sorted(set(positions))
    if kind == "pred":
        return [s for s in token_starts if s > min_pos]
    # kind == "behind" и др. → []: `~[A]C` не поддерживается (нулевая ширина
    # lookbehind после ~ требует позиций конца токенов; не требуется на практике).
    return []


def _occurrences(text: str, needle: str, min_pos: int) -> list[int]:
    if not needle:
        return []
    positions = []
    pos = text.find(needle, min_pos + 1)
    while pos != -1:
        positions.append(pos)
        pos = text.find(needle, pos + 1)
    return positions


def find_matches(text: str, bounds: list[tuple[int, int]],
                 tokens: list[dict], atoms: list[tuple]) -> list[tuple[int, int]]:
    """
    Возвращает непересекающиеся совпадения (start, end) в рабочем тексте,
    аналогично re.finditer для паттерна, заякоренного на стартовой позиции.
    """
    if not atoms:
        return []

    # Схлопываем идущие подряд "any" в один
    collapsed = []
    for atom in atoms:
        if atom[0] == "any" and collapsed and collapsed[-1][0] == "any":
            continue
        collapsed.append(atom)
    atoms = collapsed

    # Предикатные стартовые позиции (для ~ и прямых pred-совпадений)
    pred_starts: dict[int, list[int]] = {}
    for ai, atom in enumerate(atoms):
        if atom[0] == "pred":
            pred_starts[ai] = _valid_token_starts(tokens, bounds, atom[1], -1)

    memo: dict[tuple[int, int], list[int]] = {}

    def match_here(ai: int, p: int) -> list[int]:
        """Все возможные конечные позиции (отсортированы по возрастанию)."""
        if ai == len(atoms):
            return [p] if p <= len(text) else []
        key = (ai, p)
        if key in memo:
            return memo[key]

        results: list[int] = []
        atom = atoms[ai]
        kind = atom[0]

        if kind == "lit":
            s = atom[1]
            if text.startswith(s, p):
                results = match_here(ai + 1, p + len(s))
        elif kind == "opts":
            for opt in atom[1]:
                if text.startswith(opt, p):
                    results = match_here(ai + 1, p + len(opt))
                    if results:
                        break
        elif kind == "any":
            if ai + 1 == len(atoms):
                # `~` в конце — совпадает весь остаток текста
                if p < len(text):
                    results = [len(text)]
            else:
                nxt = atoms[ai + 1]
                candidates = _candidate_positions(nxt, text, p, pred_starts.get(ai + 1, []))
                for q in candidates:
                    r = match_here(ai + 1, q)
                    if r:
                        results = r
                        break
        elif kind == "behind":
            # Lookbehind: нулевой ширины, токен-группа должна заканчиваться ровно
            # в p (в спан матча не входит — спан начинается с p).
            if _behind_matches(tokens, bounds, p, atom[1]):
                results = match_here(ai + 1, p)
        elif kind == "pred":
            # Требуем начало токена
            idx = None
            for ti, (s, _) in enumerate(bounds):
                if s == p:
                    idx = ti
                    break
                if s > p:
                    break
            if idx is not None:
                for kw in atom[1]:
                    for consumed in _predicate_consumptions(tokens, idx, kw):
                        end = bounds[idx + consumed - 1][1]
                        results.extend(match_here(ai + 1, end))
                    if results:
                        break
                # Кратчайший вариант первым — прежнее поведение (основа без
                # поглощённых 助動詞) сохраняется.
                results = sorted(set(results))

        memo[key] = results
        return results

    matches = []
    p = 0
    n = len(text)
    while p < n:
        ends = match_here(0, p)
        if ends:
            end = ends[0]
            if end > p:
                matches.append((p, end))
                p = end
            else:
                p += 1
        else:
            p += 1
    return matches

# ── Хелперы ───────────────────────────────────────────────────────────────────

def tokenize_text(text: str) -> list[dict]:
    tokens = list(tagger(text))
    result = []
    offset = 0
    for word in tokens:
        surface = word.surface
        start = text.find(surface, offset)
        end = start + len(surface)
        offset = end
        feature = word.feature
        lemma = feature.lemma or surface
        result.append({
            "surface":   surface,
            "base_form": lemma,
            "reading":   feature.kana or "",
            "pos":       feature.pos1 or "",
            "cform":     getattr(feature, "cForm", None) or "*",
            "ctype":     getattr(feature, "cType", None) or "*",
            "lemma":     lemma,
            "start":     start,
            "end":       end,
        })
    return result

def build_normalized_index(tokens: list[dict]) -> tuple[str, list[tuple[int, int]], list[tuple[int, int]]]:
    """
    Строит нормализованный текст (словарные формы токенов) и индекс:
    для каждой позиции символа в нормализованном тексте →
    соответствующий диапазон (start, end) в оригинальном тексте.

    Возвращает:
      normalized_text: str
      char_map: list of (orig_start, orig_end) — по одному на каждый символ normalized_text
      token_bounds: list of (norm_start, norm_end) — диапазоны токенов в normalized_text
    """
    normalized_parts = []
    char_map = []  # для каждого символа нормализованного текста — позиция в оригинале
    token_bounds = []
    offset = 0

    for tok in tokens:
        base = tok["base_form"] or tok["surface"]
        orig_start = tok["start"]
        orig_end   = tok["end"]

        normalized_parts.append(base)

        start = offset
        offset += len(base)
        token_bounds.append((start, offset))

        # Каждый символ base_form маппируется на весь диапазон оригинального токена
        for _ in base:
            char_map.append((orig_start, orig_end))

    normalized_text = "".join(normalized_parts)
    return normalized_text, char_map, token_bounds

# ── Эндпоинты ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze/word", response_model=WordResponse)
def analyze_word(req: WordRequest):
    if not req.word:
        raise HTTPException(status_code=422, detail="Word is empty")

    tokens = list(tagger(req.word))

    if not tokens:
        raise HTTPException(status_code=404, detail="Could not analyze word")

    # Ищем первый значимый токен (не частицу, не вспомогательный глагол)
    skip_pos = {"助詞", "助動詞", "記号", "補助記号"}
    main_token = next(
        (t for t in tokens if t.feature.pos1 not in skip_pos),
        tokens[0]  # fallback — первый токен
    )

    return {
        "surface":   req.word,                          # возвращаем исходный ввод целиком
        "base_form": main_token.feature.lemma or main_token.surface,
        "reading":   "".join(t.feature.kana or "" for t in tokens),  # чтение всего слова
        "pos":       main_token.feature.pos1 or "",
    }

@app.post("/tokenize")
def tokenize(req: TextRequest):
    if not req.text:
        raise HTTPException(status_code=422, detail="Text is empty")
    return {"tokens": tokenize_text(req.text)}


@app.post("/grammar")
def analyze_grammar(req: GrammarRequest):
    """
    Грамматический анализ на основе паттернов из БД.

    Алгоритм:
    1. Токенизируем текст, получаем словарные формы.
    2. Строим нормализованный текст из словарных форм.
    3. Применяем паттерны к нормализованному тексту.
    4. Найденные позиции маппируем обратно в оригинальный текст.

    Синтаксис паттерна:
      ~                    → любой непустой текст (ленивый)
      {A|B|C}              → один из литералов (если ни один элемент не ключевое слово)
      {meishi|keiyoshi}    → группа POS/форм (если ВСЕ элементы — ключевые слова)
      [meishi|keiyodoushi] → lookbehind: предикатная группа сразу перед матчем
                             (в спан не входит, нулевой ширины); поглощает
                             следующие подряд 助動詞 (ます/た и т.п.)
      остальное            → литерал
      !<паттерн>           → поиск по оригинальному тексту без нормализации
                             (например ![meishi]だ — только поверхность だ)

    Ключевые слова: meishi, keiyoshi, keiyodoushi, doushi, daimeishi,
                    kohonkei, kakokei, hiteikei, renyokei
    """
    if not req.text:
        raise HTTPException(status_code=422, detail="Text is empty")

    if not req.patterns:
        return {"patterns": []}

    # 1. Токенизация
    tokens = tokenize_text(req.text)

    # 2. Нормализованный текст + карта позиций + границы токенов
    normalized, char_map, norm_bounds = build_normalized_index(tokens)
    orig_bounds = [(t["start"], t["end"]) for t in tokens]

    matches = []
    seen_orig_spans: set[tuple[int, int]] = set()

    for p in req.patterns:
        code    = p.get("code", "")
        pattern = p.get("pattern", "")
        if not code or not pattern:
            continue

        # ! — поиск по оригинальному тексту без нормализации
        use_original = pattern.startswith("!")
        raw_pattern  = pattern[1:] if use_original else pattern

        atoms = compile_pattern(raw_pattern)
        if not atoms:
            continue

        search_text = req.text if use_original else normalized
        bounds      = orig_bounds if use_original else norm_bounds

        for norm_start, norm_end in find_matches(search_text, bounds, tokens, atoms):
            if norm_end <= norm_start:
                continue

            if use_original:
                orig_start = norm_start
                orig_end   = norm_end
            else:
                if norm_start >= len(char_map) or norm_end - 1 >= len(char_map):
                    continue
                # Маппируем обратно в оригинальный текст
                orig_start = char_map[norm_start][0]
                orig_end   = char_map[norm_end - 1][1]

            span = (orig_start, orig_end)
            if span in seen_orig_spans:
                continue
            seen_orig_spans.add(span)

            matches.append({
                "grammar_code": code,
                "surface":      req.text[orig_start:orig_end],
                "start":        orig_start,
                "end":          orig_end,
            })

    matches.sort(key=lambda x: x["start"])
    # Токены возвращаются сырыми (без склейки): спаны матчей всегда выровнены
    # с ними, а словарная группировка выполняется на фронтенде/в PHP-мерджере
    # отдельно для режима перевода.
    return {"tokens": tokens, "patterns": matches}


