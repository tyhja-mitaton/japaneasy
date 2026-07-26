<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('vocabulary_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('surface');                 // форма в тексте
            $table->string('base_form');               // словарная форма
            $table->string('reading')->nullable();     // катакана
            $table->string('pos')->nullable();         // часть речи
            $table->string('translation')->nullable();
            $table->text('context_sentence')->nullable();
            $table->foreignId('source_text_id')
                ->nullable()
                ->constrained('user_texts')
                ->onDelete('set null');
            $table->timestamps();
            $table->unique(['user_id', 'base_form']); // одно слово на пользователя
        });
    }
    public function down(): void { Schema::dropIfExists('vocabulary_items'); }
};

