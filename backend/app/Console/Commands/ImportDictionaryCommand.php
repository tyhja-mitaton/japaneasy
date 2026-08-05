<?php

namespace App\Console\Commands;

use App\Jobs\ImportDictionaryJob;
use Illuminate\Console\Command;

class ImportDictionaryCommand extends Command
{
    protected $signature = 'dictionary:import
        {path : Путь к папке со словарём}
        {--force : Пересоздать если уже существует}
        {--sync : Запустить синхронно (без очереди, для отладки)}';

    protected $description = 'Импортировать словарь в формате Yomitan';

    public function handle(): int
    {
        $path  = $this->argument('path');
        $force = $this->option('force');

        if (!is_dir($path)) {
            $this->error("Папка не найдена: {$path}");
            return 1;
        }

        if ($this->option('sync')) {
            // Синхронный режим — джоб выполняется прямо здесь, без очереди
            $this->info("Запуск синхронного импорта из: {$path}");
            ImportDictionaryJob::dispatchSync($path, $force);
            $this->info("Готово. Проверьте таблицу dictionaries.");
        } else {
            // Через очередь
            ImportDictionaryJob::dispatch($path, $force)->onQueue('imports');
            $this->info("Импорт поставлен в очередь. Запустите воркер: php artisan queue:work --queue=imports");
            $this->info("Следите за прогрессом: php artisan tinker --execute=\"echo \\App\\Models\\Dictionary::latest()->first()->import_progress . '%'\"");
        }

        return 0;
    }
}
