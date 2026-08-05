<?php

namespace App\Jobs;

use App\Models\Dictionary;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Импортирует один файл term_bank_N.json.
 * Запускается как часть Batch из ImportDictionaryJob.
 */
class ImportTermBankJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;  // 5 минут на файл — хватит для любого размера
    public int $tries   = 3;
    public int $backoff = 10;

    private const BATCH_SIZE = 500;

    public function __construct(
        private int    $dictionaryId,
        private string $filePath,
        private int    $fileIndex,
        private int    $totalFiles,
    ) {}

    public function handle(): void
    {
        // Если batch был отменён — выходим
        if ($this->batch()?->cancelled()) {
            return;
        }

        Log::info("[TermBank Import] Processing file {$this->fileIndex}/{$this->totalFiles}: " . basename($this->filePath));

        if (!file_exists($this->filePath)) {
            Log::error("[TermBank Import] File not found: {$this->filePath}");
            return;
        }

        $content = file_get_contents($this->filePath);
        $entries = json_decode($content, true);

        if (!is_array($entries)) {
            Log::warning("[TermBank Import] Failed to parse: {$this->filePath}");
            return;
        }

        $batch   = [];
        $count   = 0;
        $now     = now()->toDateTimeString();

        foreach ($entries as $entry) {
            if (!is_array($entry) || count($entry) < 6) continue;

            [
                $term,
                $reading,
                $posTags,
                $rules,
                $score,
                $definitions,
                $sequence,
                $termTags,
            ] = array_pad($entry, 8, '');

            if (empty($definitions)) continue;

            $batch[] = [
                'dictionary_id' => $this->dictionaryId,
                'term'          => (string) $term,
                'reading'       => (string) $reading,
                'pos_tags'      => (string) ($posTags ?? ''),
                'rules'         => (string) ($rules ?? ''),
                'score'         => (int) ($score ?? 0),
                'definitions'   => json_encode($definitions, JSON_UNESCAPED_UNICODE),
                'sequence'      => (int) ($sequence ?? 0),
                'term_tags'     => (string) ($termTags ?? ''),
                'created_at'    => $now,
                'updated_at'    => $now,
            ];

            $count++;

            if (count($batch) >= self::BATCH_SIZE) {
                DB::table('dictionary_entries')->insert($batch);
                $batch = [];
            }
        }

        // Вставляем остаток
        if (!empty($batch)) {
            DB::table('dictionary_entries')->insert($batch);
        }

        // Обновляем прогресс в процентах
        $progress = (int) round(($this->fileIndex + 1) / $this->totalFiles * 100);
        Dictionary::where('id', $this->dictionaryId)->update([
            'import_progress' => $progress,
        ]);

        Log::info("[TermBank Import] Done: " . basename($this->filePath) . " → {$count} entries, progress: {$progress}%");
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("[TermBank Import] Failed: {$this->filePath} — " . $exception->getMessage());
    }
}
