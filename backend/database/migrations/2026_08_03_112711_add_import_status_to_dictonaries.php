<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('dictionaries', function (Blueprint $table) {
            $table->enum('import_status', ['idle', 'pending', 'processing', 'completed', 'failed'])
                ->default('idle')
                ->after('entries_count');
            $table->integer('import_progress')->default(0)->after('import_status'); // 0-100
            $table->text('import_error')->nullable()->after('import_progress');
            $table->string('import_path')->nullable()->after('import_error');
        });

        // Таблица для batch-мониторинга (нужна для Bus::batch())
        // Создаётся командой: php artisan queue:batches-table && php artisan migrate
    }
    public function down(): void {
        Schema::table('dictionaries', function (Blueprint $table) {
            $table->dropColumn(['import_status', 'import_progress', 'import_error', 'import_path']);
        });
    }
};
