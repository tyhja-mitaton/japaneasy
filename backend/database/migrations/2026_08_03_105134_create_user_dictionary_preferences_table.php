<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('user_dictionary_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('dictionary_id')->constrained()->onDelete('cascade');
            $table->integer('priority')->default(0);    // 0 = наивысший
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'dictionary_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('user_dictionary_preferences'); }
};
