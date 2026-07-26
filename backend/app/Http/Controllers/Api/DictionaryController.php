<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Http\JsonResponse;

class DictionaryController extends Controller
{
    public function lookup(Request $request): JsonResponse
    {
        $request->validate([
            'word' => ['required', 'string', 'max:100'],
        ]);

        $word = $request->input('word');

        // 1. Получаем морфологический анализ от Python NLP
        $nlpResponse = Http::timeout(10)
            ->post(config('services.nlp.url') . '/analyze/word', [
                'word' => $word,
            ]);

        if ($nlpResponse->failed()) {
            return response()->json(
                ['error' => 'NLP service unavailable'],
                503
            );
        }

        $nlp = $nlpResponse->json();

        // 2. Ищем перевод в Jisho API по словарной форме
        $jishoResponse = Http::timeout(10)
            ->get('https://jisho.org/api/v1/search/words', [
                'keyword' => $nlp['base_form'],
            ]);

        $translation = null;
        $jlpt        = null;

        if ($jishoResponse->ok()) {
            $data = $jishoResponse->json('data');

            if (!empty($data)) {
                $entry       = $data[0];
                $translation = collect($entry['senses'][0]['english_definitions'] ?? [])
                    ->join(', ');
                $jlpt        = $entry['jlpt'][0] ?? null;
            }
        }

        return response()->json([
            'surface'     => $nlp['surface'],
            'base_form'   => $nlp['base_form'],
            'reading'     => $nlp['reading'],
            'pos'         => $nlp['pos'],
            'translation' => $translation,
            'jlpt'        => $jlpt,
        ]);
    }
}
