<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('grammar_articles', function (Blueprint $table) {
            $table->string('title_en')->nullable()->after('title');
            $table->text('info_en')->nullable()->after('info');
            $table->longText('text_en')->nullable()->after('text');
        });
    }
    public function down(): void {
        Schema::table('grammar_articles', function (Blueprint $table) {
            $table->dropColumn(['title_en', 'info_en', 'text_en']);
        });
    }
};
