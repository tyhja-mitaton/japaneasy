<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('dictionaries', function (Blueprint $table) {
            $table->id();
            $table->string('name');                     // "JMdict (Russian)"
            $table->string('slug')->unique();            // "jmdict-ru"
            $table->string('source_lang', 5)->default('jp');
            $table->string('target_lang', 5);           // "ru", "en"
            $table->boolean('is_active')->default(true);
            $table->integer('default_priority')->default(0);
            $table->integer('entries_count')->default(0);
            $table->json('metadata')->nullable();        // из index.json
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('dictionaries'); }
};
