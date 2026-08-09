<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserText;
use App\Models\VocabularyItem;
use App\Services\PlanLimits;
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

        PlanLimits::checkVocabulary($request->user(), $data['base_form']);

        // IDOR: источник текста должен принадлежать текущему пользователю
        if (!empty($data['source_text_id'])) {
            $owned = UserText::where('id', $data['source_text_id'])
                ->where('user_id', $request->user()->id)
                ->exists();
            if (!$owned) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
        }

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

    // Экспорт в формат Anki (tab-separated, одна запись = одна строка)
    public function exportAnki(Request $request): Response
    {
        $items = VocabularyItem::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        // Anki формат: Слово\tПеревод\tЧтение (хирагана)\tКонтекст
        $lines = $items->map(function (VocabularyItem $item) {
            return implode("\t", [
                $item->base_form,
                $item->translation ?? '',
                mb_convert_kana($item->reading ?? '', 'c'),
                $item->context_sentence ?? '',
            ]);
        })->join("\n");

        return response($lines, 200, [
            'Content-Type'        => 'text/plain; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="vocabulary.txt"',
        ]);
    }

    // Экспорт словаря в CSV (для Excel/Google Sheets и импорта в Anki)
    public function exportCsv(Request $request): Response
    {
        $items = VocabularyItem::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get();

        // CSV injection: экранируем ячейки, начинающиеся с формульных символов
        $safe = function (?string $value): string {
            $value ??= '';
            if ($value !== '' && str_contains('=+-@', $value[0])) {
                return "'" . $value;
            }
            return $value;
        };

        $handle = fopen('php://temp', 'w+');

        // UTF-8 BOM для корректного открытия в Excel
        fwrite($handle, "\xEF\xBB\xBF");

        fputcsv($handle, [
            'surface', 'base_form', 'reading', 'pos',
            'translation', 'context_sentence', 'created_at',
        ]);

        foreach ($items as $item) {
            fputcsv($handle, [
                $safe($item->surface),
                $safe($item->base_form),
                $safe($item->reading),
                $safe($item->pos),
                $safe($item->translation),
                $safe($item->context_sentence),
                $item->created_at?->toDateTimeString(),
            ]);
        }

        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return response($content, 200, [
            'Content-Type'        => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="vocabulary.csv"',
        ]);
    }
}
