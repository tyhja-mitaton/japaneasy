<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dictionary;
use App\Models\DictionaryEntry;
use App\Models\UserDictionaryPreference;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;

class DictionaryController extends Controller
{
    public function lookup(Request $request): JsonResponse
    {
        $request->validate(['word' => ['required', 'string', 'max:100']]);

        $word = $request->input('word');
        $user = $request->user();

        // Точное совпадение термина в словаре (например составное 気がつく).
        // Если терм найден — не отправляем слово в NLP /analyze/word: MeCab
        // разбил бы 気がつく на 気/が/つく, и поиск по базовой форме не сработал бы.
        $hasExactTerm = DictionaryEntry::where('term', $word)->exists();

        $baseForm = $word;
        $reading  = '';
        $pos      = '';

        if (! $hasExactTerm) {
            // NLP-анализ для базовой формы
            $nlpResponse = Http::timeout(10)
                ->post(config('services.nlp.url') . '/analyze/word', ['word' => $word])
                ->json();

            $baseForm = $nlpResponse['base_form'] ?? $word;
            $reading  = $nlpResponse['reading']   ?? '';
            $pos      = $nlpResponse['pos']        ?? '';
        }

        // Ищем в БД-словарях
        $orderedDictionaries = $this->getOrderedDictionaries($user);
        $results = [];
        $jlpt    = null;

        if ($orderedDictionaries->isNotEmpty()) {
            $dictionaryIds = $orderedDictionaries->pluck('id');

            $entries = DictionaryEntry::whereIn('dictionary_id', $dictionaryIds)
                ->where(function ($q) use ($baseForm, $reading) {
                    $q->where('term', $baseForm)
                        ->orWhere('reading', $baseForm)
                        ->orWhere('term', $reading);
                })
                ->orderBy('score', 'desc')
                ->get();

            // Для составных слов (точное совпадение термина) NLP не вызывался —
            // добираем чтение и часть речи из первой найденной записи.
            if ($entries->isNotEmpty() && $reading === '') {
                $first = $entries->first();
                $reading = $first->reading;
                $pos     = $first->pos_tags;
            }

            foreach ($orderedDictionaries as $dict) {
                $dictEntries = $entries->where('dictionary_id', $dict->id);
                if ($dictEntries->isEmpty()) continue;

                $grouped = $dictEntries->groupBy('sequence');

                $results[] = [
                    'dictionary_id'   => $dict->id,
                    'dictionary_name' => $dict->name,
                    'dictionary_lang' => $dict->target_lang,
                    'source'          => 'db',
                    'entries'         => $grouped->map(function ($group) use (&$jlpt) {
                        $primary = $group->sortByDesc('score')->first();

                        // Извлекаем JLPT из первой попавшейся записи
                        if (!$jlpt) {
                            foreach ($primary->getTagsArray() as $tag) {
                                if (preg_match('/^jlpt-n\d$/i', $tag)) {
                                    $jlpt = $tag;
                                    break;
                                }
                            }
                        }

                        return [
                            'term'        => $primary->term,
                            'reading'     => $primary->reading,
                            'pos_tags'    => $primary->pos_tags,
                            'definitions' => $this->flattenDefinitions($primary->definitions),
                            'is_common'   => $primary->isCommon(),
                            'forms'       => $group->count() > 1
                                ? $group->map(fn ($e) => [
                                    'term'    => $e->term,
                                    'reading' => $e->reading,
                                ])->values()
                                : [],
                        ];
                    })->values(),
                ];
            }
        }

        // ── Jisho fallback ────────────────────────────────────────────────────
        // Всегда добавляем Jisho последним — как неотключаемый словарь с наименьшим приоритетом.
        // Если БД-словари вернули результаты, Jisho идёт в конец.
        // Если словарей нет совсем — Jisho единственный источник.
        $jishoResult = $this->lookupJisho($baseForm);
        if ($jishoResult) {
            $results[] = $jishoResult;

            // JLPT из Jisho если не нашли в БД
            if (!$jlpt) {
                $jlpt = $jishoResult['entries'][0]['jlpt'] ?? null;
            }
        }

        // Первый перевод для быстрого отображения
        $translation = $this->buildTranslation($results);

        return response()->json([
            'surface'     => $word,
            'base_form'   => $baseForm,
            'reading'     => $reading,
            'pos'         => $pos,
            'jlpt'        => $jlpt,
            'results'     => $results,
            'translation' => $translation,
        ]);
    }

    /**
     * Возвращает список словарей в порядке приоритета для пользователя.
     */
    private function getOrderedDictionaries($user)
    {
        if (!$user) {
            // Гость: все активные словари в порядке default_priority
            return Dictionary::where('is_active', true)
                ->orderBy('default_priority')
                ->get();
        }

        // Проверяем есть ли у пользователя настройки
        $prefs = UserDictionaryPreference::where('user_id', $user->id)
            ->where('is_enabled', true)
            ->with('dictionary')
            ->orderBy('priority')
            ->get();

        if ($prefs->isNotEmpty()) {
            return $prefs->map(fn($p) => $p->dictionary)->filter();
        }

        // Нет настроек — используем умолчания
        // Для RU пользователей: русский словарь первым
        $userLang = $user->language ?? 'ru';
        return Dictionary::where('is_active', true)
            ->orderByRaw("CASE WHEN target_lang = ? THEN 0 ELSE 1 END", [$userLang])
            ->orderBy('default_priority')
            ->get();
    }

    /**
     * Собирает перевод из результатов первого словаря.
     */
    private function buildTranslation(array $results): ?string
    {
        $definitions = $results[0]['entries'][0]['definitions'] ?? null;
        if (!$definitions) return null;

        $flat = $this->flattenDefinitions($definitions);
        $flat = array_values(array_unique(array_filter(
            $flat,
            fn ($d) => trim((string) $d) !== ''
        )));

        return $flat ? implode(', ', $flat) : null;
    }

    /**
     * Приводит определения к плоскому списку строк.
     * JMdict хранит переводы в двух форматах:
     *  — плоские строки ("1) есть", "2) жить"),
     *  — structured-content (вложенные JSON-узлы с полями tag/content).
     */
    private function flattenDefinitions(?array $definitions): array
    {
        if (!$definitions) return [];

        $flat = [];
        foreach ($definitions as $definition) {
            if (is_string($definition)) {
                $flat[] = $definition;
            } elseif (is_array($definition)) {
                $this->extractStructuredContent($definition, $flat);
            }
        }
        return $flat;
    }

    private function extractStructuredContent(array $node, array &$out): void
    {
        // Пропускаем секции, которые не являются переводом (например, "notes")
        if (isset($node['tag'], $node['data']['content']) && $node['tag'] === 'ul' && $node['data']['content'] !== 'glossary') {
            return;
        }

        // li-элементы содержат сам перевод
        if (isset($node['tag'], $node['content']) && $node['tag'] === 'li' && is_string($node['content'])) {
            $out[] = $node['content'];
            return;
        }

        if (!isset($node['content']) || !is_array($node['content'])) return;

        if (array_is_list($node['content'])) {
            foreach ($node['content'] as $child) {
                if (is_array($child)) $this->extractStructuredContent($child, $out);
            }
        } else {
            $this->extractStructuredContent($node['content'], $out);
        }
    }

    private function lookupJisho(string $word): ?array
    {
        try {
            $response = Http::timeout(8)
                ->get('https://jisho.org/api/v1/search/words', ['keyword' => $word]);

            if ($response->failed()) return null;

            $data = $response->json('data');
            if (empty($data)) return null;

            $entries = collect($data)->take(3)->map(function (array $item) {
                $sense       = $item['senses'][0]    ?? [];
                $japanese    = $item['japanese'][0]  ?? [];
                $definitions = $sense['english_definitions'] ?? [];
                $tags        = $item['jlpt'] ?? [];
                $isCommon    = $item['is_common'] ?? false;

                return [
                    'term'        => $japanese['word']    ?? $japanese['reading'] ?? '',
                    'reading'     => $japanese['reading'] ?? '',
                    'pos_tags'    => implode(' ', $sense['parts_of_speech'] ?? []),
                    'definitions' => $definitions,
                    'is_common'   => $isCommon,
                    'jlpt'        => $tags[0] ?? null,
                    'forms'       => [],
                ];
            })->values()->toArray();

            if (empty($entries)) return null;

            return [
                'dictionary_id'   => null,
                'dictionary_name' => 'Jisho',
                'dictionary_lang' => 'en',
                'source'          => 'jisho',
                'entries'         => $entries,
            ];
        } catch (\Throwable) {
            return null;
        }
    }

}
