<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('dictionary_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dictionary_id')->constrained()->onDelete('cascade');
            $table->string('term');                     // слово (кандзи или кана)
            $table->string('reading');                  // чтение (хирагана/катакана)
            $table->string('pos_tags')->default('');    // части речи: "n", "v1 vt"
            $table->string('rules')->default('');       // правила спряжения: "v5", "adj-i"
            $table->integer('score')->default(0);       // частотность
            $table->jsonb('definitions');               // массив переводов
            $table->integer('sequence')->default(0);    // JMdict sequence (группировка)
            $table->string('term_tags')->default('');   // теги: "⭐ ichi news5k"
            $table->timestamps();
        });

        // Индексы для быстрого поиска
        Schema::table('dictionary_entries', function (Blueprint $table) {
            $table->index('term', 'idx_entries_term');
            $table->index('reading', 'idx_entries_reading');
            $table->index(['dictionary_id', 'term'], 'idx_entries_dict_term');
            $table->index(['dictionary_id', 'sequence'], 'idx_entries_sequence');
        });
    }
    public function down(): void { Schema::dropIfExists('dictionary_entries'); }
};
