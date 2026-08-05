<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('subtitles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('video_id')->constrained()->onDelete('cascade');
            $table->string('label');          // "日本語", "Русский", "English"
            $table->string('language', 10);   // "jp", "ru", "en"
            $table->string('file_path');      // путь к .vtt файлу
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('subtitles'); }
};
