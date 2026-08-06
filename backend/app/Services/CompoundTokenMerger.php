<?php

namespace App\Services;

use App\Models\DictionaryEntry;

/**
 * Склейка составных слов (компаундов) в токенизированном тексте.
 *
 * MeCab (fugashi + unidic-lite) разбивает идиоматические выражения вроде
 * 気がつく на отдельные морфемы (気 + が + つく), хотя JMdict, импортированный
 * в dictionary_entries, хранит их как одну запись. Здесь мы склеиваем соседние
 * токены обратно, если конкатенация их словарных форм совпадает с термином
 * из словаря (жадный longest-match).
 */
class CompoundTokenMerger
{
    private const MAX_TOKENS  = 6;     // максимум токенов в компаунде
    private const MAX_TERM_LEN = 14;   // максимум символов термина

    /**
     * @param  array<int, array<string, mixed>>  $tokens  токены от NLP-сервиса
     * @return array<int, array<string, mixed>>
     */
    public static function merge(array $tokens): array
    {
        $count = count($tokens);
        if ($count < 2) {
            return $tokens;
        }

        $termSets = self::loadTermSets($tokens);

        $merged = [];
        $i = 0;
        while ($i < $count) {
            $token = $tokens[$i];

            $terms  = $termSets[$token['base_form']] ?? [];
            $bestJ  = null;

            if ($terms !== [] && ! self::isBoundary($token) && ! self::isAuxStart($token)) {
                $concat = $token['base_form'];
                $length = mb_strlen($concat);

                for ($j = $i + 1; $j < $count && $j - $i <= self::MAX_TOKENS; $j++) {
                    $next = $tokens[$j];
                    if (self::isBoundary($next)) {
                        break;
                    }

                    $concat .= $next['base_form'];
                    $length += mb_strlen($next['base_form']);

                    if ($length > self::MAX_TERM_LEN) {
                        break;
                    }

                    if (isset($terms[$concat])) {
                        $bestJ = $j;
                    }
                }
            }

            if ($bestJ !== null) {
                $merged[] = self::buildCompound($tokens, $i, $bestJ);
                $i = $bestJ + 1;
            } else {
                $merged[] = $token;
                $i++;
            }
        }

        return $merged;
    }

    /**
     * 助動詞 (た, ない, だ…) не может начинать словарный компаунд: иначе «た + の»
     * ошибочно склеивается в омоним из словаря «たの», а не в た + のに.
     *
     * @param  array<string, mixed>  $token
     */
    private static function isAuxStart(array $token): bool
    {
        return ($token['pos'] ?? '') === '助動詞';
    }

    /**
     * Для каждого уникального base_form первого токена загружаем термины
     * словаря с таким префиксом. Индекс idx_entries_term позволяет быстро
     * находить их по LIKE 'префикс%'.
     *
     * @param  array<int, array<string, mixed>>  $tokens
     * @return array<string, array<string, int>>  map: base_form → term → 1
     */
    private static function loadTermSets(array $tokens): array
    {
        $prefixes = [];
        foreach ($tokens as $token) {
            $prefixes[$token['base_form']] = true;
        }

        $sets = [];
        foreach (array_keys($prefixes) as $prefix) {
            $terms = DictionaryEntry::where('term', 'like', $prefix . '%')
                ->whereRaw('LENGTH(term) <= ?', [self::MAX_TERM_LEN])
                ->distinct()
                ->pluck('term')
                ->all();

            $sets[$prefix] = array_flip($terms);
        }

        return $sets;
    }

    /**
     * Собирает один составной токен из диапазона исходных токенов.
     *
     * @param  array<int, array<string, mixed>>  $tokens
     * @return array<string, mixed>
     */
    private static function buildCompound(array $tokens, int $from, int $to): array
    {
        $surface = '';
        $base    = '';
        $reading = '';

        for ($k = $from; $k <= $to; $k++) {
            $surface .= $tokens[$k]['surface'];
            $base    .= $tokens[$k]['base_form'];
            $reading .= $tokens[$k]['reading'] ?? '';
        }

        return [
            'surface'   => $surface,
            'base_form' => $base,
            'reading'   => $reading,
            'pos'       => '連語',
            'start'     => $tokens[$from]['start'],
            'end'       => $tokens[$to]['end'],
        ];
    }

    /**
     * Через границы (пробелы, пунктуация) склейка не выполняется.
     *
     * @param  array<string, mixed>  $token
     */
    private static function isBoundary(array $token): bool
    {
        $surface = $token['surface'] ?? '';
        if ($surface === '' || preg_match('/^\s+$/u', $surface)) {
            return true;
        }

        return ($token['pos'] ?? '') === '記号' || ($token['pos'] ?? '') === '補助記号';
    }
}
