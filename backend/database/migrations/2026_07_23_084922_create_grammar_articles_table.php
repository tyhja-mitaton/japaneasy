<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('grammar_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('code')->unique();          // 'copula-da', 'particle-wa', …
            $table->text('info')->nullable();           // краткое описание
            $table->longText('text');                  // markdown
            $table->text('pattern');
            $table->foreignId('author_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('grammar_articles'); }
};

