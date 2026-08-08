<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('grammar_article_related', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_id')->constrained('grammar_articles')->onDelete('cascade');
            $table->foreignId('related_article_id')->constrained('grammar_articles')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['article_id', 'related_article_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('grammar_article_related'); }
};
