<?php

namespace App\Jobs;

use App\Models\Dictionary;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Bus\Batch;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Главный джоб импорта словаря.
 * Читает index.json, создаёт или пересоздаёт запись Dictionary,
 * затем диспатчит по одному ImportTermBankJob на каждый term_bank файл.
 * Все дочерние джобы объединяются в Laravel Batch для отслеживания прогресса.
 */
class ImportDictionaryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 60;   // сам джоб быстрый — только читает индекс и диспатчит
    public int $tries   = 1;

    public function __construct(
        private string $path,
        private bool   $force = false,
    ) {}

    public function handle(): void
    {
        $path = rtrim($this->path, '/');

        // Читаем метаданные
        $indexPath = "{$path}/index.json";
        if (!file_exists($indexPath)) {
            Log::error("[Dictionary Import] index.json not found: {$indexPath}");
            return;
        }

        $index      = json_decode(file_get_contents($indexPath), true);
        $title      = $index['title']    ?? 'Unknown Dictionary';
        $slug       = $this->makeSlug($title);
        $targetLang = $this->detectLanguage($title);

        // Удаляем старый словарь если --force
        $existing = Dictionary::where('slug', $slug)->first();
        if ($existing) {
            if ($this->force) {
                Log::info("[Dictionary Import] Deleting existing dictionary '{$slug}'");
                $existing->delete();
            } else {
                Log::warning("[Dictionary Import] Dictionary '{$slug}' already exists. Use force=true.");
                return;
            }
        }

        // Создаём запись с начальным статусом
        $dictionary = Dictionary::create([
            'name'             => $title,
            'slug'             => $slug,
            'source_lang'      => 'jp',
            'target_lang'      => $targetLang,
            'is_active'        => false,    // включим после завершения импорта
            'default_priority' => $targetLang === 'ru' ? 0 : 10,
            'import_status'    => 'pending',
            'import_progress'  => 0,
            'import_path'      => $path,
            'metadata'         => $index,
        ]);

        Log::info("[Dictionary Import] Created dictionary ID={$dictionary->id}, finding term banks...");

        // Находим все term_bank файлы
        $termFiles = glob("{$path}/term_bank_*.json");
        if (empty($termFiles)) {
            $dictionary->update(['import_status' => 'failed', 'import_error' => 'No term_bank files found']);
            return;
        }

        sort($termFiles);
        $totalFiles = count($termFiles);
        Log::info("[Dictionary Import] Found {$totalFiles} term bank files");

        $dictionary->update(['import_status' => 'processing']);

        // Создаём джобы для каждого файла
        $jobs = array_map(
            fn (string $file, int $idx) => new ImportTermBankJob(
                dictionaryId: $dictionary->id,
                filePath:     $file,
                fileIndex:    $idx,
                totalFiles:   $totalFiles,
            ),
            $termFiles,
            array_keys($termFiles),
        );

        // Запускаем batch
        Bus::batch($jobs)
            ->name("Import: {$title}")
            ->allowFailures()   // продолжаем даже если один файл упал
            ->then(function (Batch $batch) use ($dictionary) {
                // Все файлы импортированы успешно
                $count = \App\Models\DictionaryEntry::where('dictionary_id', $dictionary->id)->count();
                $dictionary->update([
                    'import_status'   => 'completed',
                    'import_progress' => 100,
                    'entries_count'   => $count,
                    'is_active'       => true,   // включаем словарь
                ]);
                Log::info("[Dictionary Import] Completed: {$dictionary->name}, {$count} entries");
            })
            ->catch(function (Batch $batch, Throwable $e) use ($dictionary) {
                Log::error("[Dictionary Import] Batch failed: " . $e->getMessage());
                $dictionary->update([
                    'import_status' => 'failed',
                    'import_error'  => $e->getMessage(),
                ]);
            })
            ->onQueue('imports')  // отдельная очередь для импортов
            ->dispatch();
    }

    private function makeSlug(string $title): string
    {
        $slug = strtolower($title);
        $slug = preg_replace('/\[.*?\]/', '', $slug);
        $slug = preg_replace('/\(russian\)/', 'ru', $slug);
        $slug = preg_replace('/\(english\)/', 'en', $slug);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        return trim($slug, '-');
    }

    private function detectLanguage(string $title): string
    {
        $title = strtolower($title);
        if (str_contains($title, 'russian') || str_contains($title, 'ru')) return 'ru';
        return 'en';
    }
}
