from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import fugashi
import re

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

# ── Паттерн-компилятор ────────────────────────────────────────────────────────

def pattern_to_regex(pattern_str: str) -> str:
    """
    Конвертирует паттерн из БД в регулярное выражение.

    Синтаксис:
      ~          → любой непустой текст (ленивый)
      {A|B|C}    → одно из значений
      остальное  → литерал (экранируется)

    Примеры:
      は                     → は
      {に|を}乗り出す         → (?:に|を)乗り出す
      ~{た|だ}り~{た|だ}りする → .+?(た|だ)り.+?(た|だ)りする
    """
    result = ''
    i = 0
    while i < len(pattern_str):
        ch = pattern_str[i]
        if ch == '~':
            result += '.+?'
            i += 1
        elif ch == '{':
            try:
                end = pattern_str.index('}', i)
                options = pattern_str[i + 1:end].split('|')
                result += '(?:' + '|'.join(re.escape(o) for o in options) + ')'
                i = end + 1
            except ValueError:
                result += re.escape(ch)
                i += 1
        else:
            result += re.escape(ch)
            i += 1
    return result

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
        result.append({
            "surface":   surface,
            "base_form": word.feature.lemma or surface,
            "reading":   word.feature.kana or "",
            "pos":       word.feature.pos1 or "",
            "start":     start,
            "end":       end,
        })
    return result

def build_normalized_index(tokens: list[dict]) -> tuple[str, list[tuple[int, int]]]:
    """
    Строит нормализованный текст (словарные формы токенов) и индекс:
    для каждой позиции символа в нормализованном тексте →
    соответствующий диапазон (start, end) в оригинальном тексте.

    Возвращает:
      normalized_text: str
      char_map: list of (orig_start, orig_end) — по одному на каждый символ normalized_text
    """
    normalized_parts = []
    char_map = []  # для каждого символа нормализованного текста — позиция в оригинале

    for tok in tokens:
        base = tok["base_form"] or tok["surface"]
        orig_start = tok["start"]
        orig_end   = tok["end"]

        normalized_parts.append(base)

        # Каждый символ base_form маппируется на весь диапазон оригинального токена
        for _ in base:
            char_map.append((orig_start, orig_end))

    normalized_text = "".join(normalized_parts)
    return normalized_text, char_map

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
    """
    if not req.text:
        raise HTTPException(status_code=422, detail="Text is empty")

    if not req.patterns:
        return {"patterns": []}

    # 1. Токенизация
    tokens = tokenize_text(req.text)

    # 2. Нормализованный текст + карта позиций
    normalized, char_map = build_normalized_index(tokens)

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
        search_text  = req.text if use_original else normalized

        try:
            regex_str = pattern_to_regex(raw_pattern)
            for m in re.finditer(regex_str, search_text, re.DOTALL):
                if use_original:
                    orig_start = m.start()
                    orig_end   = m.end()
                else:
                    norm_start = m.start()
                    norm_end   = m.end() - 1  # последний символ совпадения
                    if norm_start >= len(char_map) or norm_end >= len(char_map):
                        continue
                    # Маппируем обратно в оригинальный текст
                    orig_start = char_map[norm_start][0]
                    orig_end   = char_map[norm_end][1]

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
        except re.error:
            continue

    matches.sort(key=lambda x: x["start"])
    return {"patterns": matches}


