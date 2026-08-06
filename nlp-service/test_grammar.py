"""Тесты грамматического матчера nlp-service.

Запуск (внутри контейнера nlp):
    python -m unittest discover -s . -p 'test_*.py'
"""
import unittest

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def grammar(text: str, pattern: str, code: str = "test"):
    resp = client.post("/grammar", json={
        "text": text,
        "patterns": [{"code": code, "pattern": pattern}],
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["patterns"]


def surfaces(text: str, pattern: str) -> list[str]:
    return [m["surface"] for m in grammar(text, pattern)]


class PosPredicatesTest(unittest.TestCase):
    def test_meishi(self):
        self.assertEqual(surfaces("私は学生です", "{meishi}"), ["学生"])

    def test_doushi(self):
        self.assertEqual(surfaces("彼は走る", "{doushi}"), ["走る"])

    def test_keiyoshi(self):
        self.assertEqual(surfaces("高い山", "{keiyoshi}"), ["高い"])

    def test_keiyodoushi(self):
        self.assertEqual(surfaces("綺麗な花", "{keiyodoushi}"), ["綺麗"])

    def test_daimeishi(self):
        self.assertEqual(surfaces("私は学生です", "{daimeishi}"), ["私"])

    def test_pos_union(self):
        # {meishi|keiyoshi} — объединение предикатов: и 形容詞, и 名詞
        self.assertEqual(surfaces("美しい猫", "{meishi|keiyoshi}"), ["美しい", "猫"])
        self.assertEqual(surfaces("黒い犬", "{meishi|keiyoshi}"), ["黒い", "犬"])


class FormPredicatesTest(unittest.TestCase):
    def test_kohonkei(self):
        # 読む — 終止形-一般
        self.assertEqual(surfaces("本を読む", "{kohonkei}"), ["読む"])

    def test_kohonkei_rentai(self):
        # 走る перед существительным — 連体形-一般
        self.assertEqual(surfaces("走る人", "{kohonkei}"), ["走る"])

    def test_renyokei(self):
        # 食べ и 寝 — оба 連用形-一般
        self.assertEqual(surfaces("食べて寝た", "{renyokei}"), ["食べ", "寝"])

    def test_renyokei_adj(self):
        # 高く — 形容詞 連用形-一般
        self.assertEqual(surfaces("高く美しい", "{renyokei}"), ["高く"])

    def test_kakokei(self):
        # 食べ + た
        self.assertEqual(surfaces("昨日ご飯を食べた", "{kakokei}"), ["食べた"])

    def test_kakokei_adj(self):
        # 高かっ + た
        self.assertEqual(surfaces("今日は高かった", "{kakokei}"), ["高かった"])

    def test_hiteikei(self):
        # 食べ + ない
        self.assertEqual(surfaces("私はご飯を食べない", "{hiteikei}"), ["食べない"])

    def test_hiteikei_adj(self):
        # 高く + ない
        self.assertEqual(surfaces("この山は高くない", "{hiteikei}"), ["高くない"])

    def test_hiteikei_ja_nai(self):
        # じゃ + ない
        self.assertEqual(surfaces("これは本じゃない", "{hiteikei}"), ["じゃない"])

    def test_hiteikei_de_wa_nai(self):
        # で + は + ない
        self.assertEqual(surfaces("これは本ではない", "{hiteikei}"), ["ではない"])


class AuxAbsorptionTest(unittest.TestCase):
    """POS-предикаты поглощают следующие 助動詞 (ます, た, だ…):
    «吸います» — это вежливая форма «吸う», поэтому {doushi} покрывает
    всю сказуемую группу до последующего литерала."""

    def test_doushi_shi_polite(self):
        self.assertEqual(
            surfaces("多いし、少ないし、吸いますし、お金もないし、美しいし、熱心だし、真面目だし、言いましたし",
                     "{doushi}し"),
            ["吸いますし", "言いましたし"],
        )

    def test_doushi_shi_plain(self):
        # Без 助動詞 между глаголом и し поглощение не нужно.
        self.assertEqual(surfaces("吸うし", "{doushi}し"), ["吸うし"])

    def test_doushi_shi_masu(self):
        self.assertEqual(surfaces("吸いますし", "{doushi}し"), ["吸いますし"])

    def test_doushi_shi_mashita(self):
        self.assertEqual(surfaces("言いましたし", "{doushi}し"), ["言いましたし"])

    def test_keiyodoushi_shi_with_copula(self):
        # 熱心 + だ + し: предикат поглощает связку だ.
        self.assertEqual(surfaces("熱心だし、真面目だし", "{keiyodoushi}し"), ["熱心だし", "真面目だし"])

    def test_keiyoshi_shi(self):
        self.assertEqual(surfaces("多いし、少ないし", "{keiyoshi}し"), ["多いし", "少ないし"])

    def test_shortest_match_preserved(self):
        # Поглощение не меняет результат для паттерна из одного предиката:
        # 学生 берётся без です (кратчайший вариант первым).
        self.assertEqual(surfaces("私は学生です", "{meishi}"), ["学生"])

    def test_copula_da_not_broken(self):
        # {meishi|keiyodoushi}だ: вариант без поглощения даёт литерал だ.
        self.assertEqual(surfaces("綺麗だ", "{meishi|keiyodoushi}だ"), ["綺麗だ"])
        self.assertEqual(surfaces("学生だ", "{meishi|keiyodoushi}だ"), ["学生だ"])


class LiteralRegressionTest(unittest.TestCase):
    """Существующие паттерны не должны ломаться."""

    def test_tari(self):
        self.assertEqual(surfaces("食べたり飲んだりする", "!{た|だ}り"), ["たり", "だり"])

    def test_te_shimau(self):
        # Матч по словарной форме しまう: ядро конструкции покрывает все
        # спряжения て/で + しまう без перечисления форм.
        self.assertEqual(surfaces("食べてしまう", "{て|で}{しまう|仕舞う|終う|了う}"), ["てしまう"])
        self.assertEqual(surfaces("飲んでしまった", "{て|で}{しまう|仕舞う|終う|了う}"), ["でしまっ"])
        self.assertEqual(surfaces("飲んでしまいました", "{て|で}{しまう|仕舞う|終う|了う}"), ["でしまい"])

    def test_toori_ni(self):
        self.assertEqual(surfaces("言ったとおりに", "!{と|ど}おりに"), ["とおりに"])

    def test_tame_ni(self):
        self.assertEqual(surfaces("勉強のために", "!ために"), ["ために"])

    def test_katsute(self):
        self.assertEqual(surfaces("かつて", "!かつて"), ["かつて"])

    def test_toki(self):
        self.assertEqual(surfaces("時に", "{時には|時}"), ["時"])


class NewPatternsTest(unittest.TestCase):
    """Новые паттерны для переписанных мёртвых правил."""

    def test_copula_da_meishi(self):
        self.assertEqual(surfaces("学生だ", "{meishi|keiyodoushi}だ"), ["学生だ"])

    def test_copula_da_keiyodoushi(self):
        self.assertEqual(surfaces("綺麗だ", "{meishi|keiyodoushi}だ"), ["綺麗だ"])

    def test_particle_ga(self):
        self.assertEqual(surfaces("リンゴが好き", "~が"), ["リンゴが"])

    def test_particle_wa(self):
        self.assertEqual(surfaces("私は学生だ", "~は"), ["私は"])

    def test_multiple_patterns_in_one_request(self):
        resp = client.post("/grammar", json={
            "text": "私は学生だ",
            "patterns": [
                {"code": "particle-wa", "pattern": "~は"},
                {"code": "copula-da", "pattern": "{meishi|keiyodoushi}だ"},
            ],
        })
        self.assertEqual(resp.status_code, 200, resp.text)
        matches = resp.json()["patterns"]
        self.assertEqual(
            [(m["grammar_code"], m["surface"]) for m in matches],
            [("particle-wa", "私は"), ("copula-da", "学生だ")],
        )

    def test_response_returns_raw_tokens_with_patterns(self):
        # /grammar отдаёт сырые токены (без словарной склейки) — спаны матчей
        # выровнены с ними. «のに» не склеен в токен, но матч no-ni покрывает
        # оба токена の и に.
        resp = client.post("/grammar", json={
            "text": "食べたのに。",
            "patterns": [{"code": "no-ni", "pattern": "!のに"}],
        })
        self.assertEqual(resp.status_code, 200, resp.text)
        data = resp.json()

        self.assertEqual(
            [(t["surface"], t["start"], t["end"]) for t in data["tokens"]],
            [("食べ", 0, 2), ("た", 2, 3), ("の", 3, 4), ("に", 4, 5), ("。", 5, 6)],
        )

        self.assertEqual(
            [(m["grammar_code"], m["start"], m["end"]) for m in data["patterns"]],
            [("no-ni", 3, 5)],
        )


class LookbehindTest(unittest.TestCase):
    """Синтаксис [A|B]C — lookbehind: подсвечивается только C, A не входит в спан."""

    def test_meishi_da_highlights_only_da(self):
        # [meishi|keiyodoushi]だ подсвечивает только だ, не 学生だ
        self.assertEqual(surfaces("学生だ", "[meishi|keiyodoushi]だ"), ["だ"])

    def test_keiyodoushi_da(self):
        self.assertEqual(surfaces("綺麗だ", "[meishi|keiyodoushi]だ"), ["だ"])

    def test_da_not_matched_after_where_de_ga(self):
        # после 学生 — です (lemma です), не だ
        self.assertEqual(surfaces("私は学生です", "[meishi|keiyodoushi]だ"), [])

    def test_span_covers_only_da_token(self):
        resp = client.post("/grammar", json={
            "text": "綺麗だ",
            "patterns": [{"code": "t", "pattern": "[meishi|keiyodoushi]だ"}],
        })
        self.assertEqual(resp.status_code, 200, resp.text)
        m = resp.json()["patterns"][0]
        self.assertEqual((m["surface"], m["start"], m["end"]), ("だ", 2, 3))

    def test_doushi_shi_with_aux_absorption(self):
        # lookbehind поглощает 助動詞: 吸います = 吸い+ます, 言いました = 言い+まし+た
        self.assertEqual(
            surfaces("吸いますし、言いましたし", "[doushi]し"),
            ["し", "し"],
        )

    def test_doushi_shi_plain(self):
        self.assertEqual(surfaces("吸うし", "[doushi]し"), ["し"])

    def test_keiyoshi_shi(self):
        self.assertEqual(surfaces("多いし", "[keiyoshi]し"), ["し"])

    def test_original_mode_da_surface_only(self):
        # ! — поиск по оригинальному тексту: に (lemma だ) не матчится как だ
        self.assertEqual(
            surfaces("昔のようにまともに", "![meishi|keiyodoushi]だ"),
            [],
        )

    def test_original_mode_da_surface(self):
        self.assertEqual(
            surfaces("学生だ、綺麗だ", "![meishi|keiyodoushi]だ"),
            ["だ", "だ"],
        )

    def test_unknown_bracket_is_literal(self):
        # неизвестные ключи внутри [...] не делают lookbehind — обрабатываются как литерал
        self.assertEqual(surfaces("a[b]c", "[b]"), ["[b]"])


if __name__ == "__main__":
    unittest.main()
