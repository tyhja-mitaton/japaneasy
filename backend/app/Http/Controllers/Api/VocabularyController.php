<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VocabularyItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class VocabularyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = VocabularyItem::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'surface'          => ['required', 'string', 'max:100'],
            'base_form'        => ['required', 'string', 'max:100'],
            'reading'          => ['nullable', 'string', 'max:100'],
            'pos'              => ['nullable', 'string', 'max:50'],
            'translation'      => ['nullable', 'string', 'max:500'],
            'context_sentence' => ['nullable', 'string', 'max:1000'],
            'source_text_id'   => ['nullable', 'integer', 'exists:user_texts,id'],
        ]);

        $item = VocabularyItem::updateOrCreate(
            ['user_id' => $request->user()->id, 'base_form' => $data['base_form']],
            [...$data, 'user_id' => $request->user()->id]
        );

        return response()->json($item, 201);
    }

    public function destroy(Request $request, VocabularyItem $vocabularyItem): JsonResponse
    {
        if ($vocabularyItem->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $vocabularyItem->delete();

        return response()->json(['message' => 'Word removed from vocabulary.']);
    }

    // Экспорт в формат Anki (tab-separated)
    public function exportAnki(Request $request): Response
    {
        $items = VocabularyItem::where('user_id', $request->user()->id)->get();

        // Anki формат: Front\tBack\n
        // Front: слово + чтение, Back: перевод
        $lines = $items->map(function (VocabularyItem $item) {
            $front = $item->base_form;
            if ($item->reading) {
                $front .= "（{$item->reading}）";
            }
            $back = $item->translation ?? '';
            if ($item->context_sentence) {
                $back .= "\n\n" . $item->context_sentence;
            }
            return "{$front}\t{$back}";
        })->join("\n");

        return response($lines, 200, [
            'Content-Type'        => 'text/plain; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="vocabulary.txt"',
        ]);
    }
}
