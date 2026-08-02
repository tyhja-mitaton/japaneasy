<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Подписка
            $table->enum('plan', ['free', 'standard', 'premium'])->default('free')->after('email');
            $table->enum('subscription_period', ['1m', '3m', '6m', '12m'])->nullable()->after('plan');
            $table->timestamp('subscription_ends_at')->nullable()->after('subscription_period');

            // Статистика
            $table->string('country', 2)->nullable()->after('subscription_ends_at'); // ISO 3166-1 alpha-2
            $table->string('timezone')->nullable()->after('country');
            $table->timestamp('last_login_at')->nullable()->after('timezone');
            $table->string('last_login_ip', 45)->nullable()->after('last_login_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'plan',
                'subscription_period',
                'subscription_ends_at',
                'country',
                'timezone',
                'last_login_at',
                'last_login_ip',
            ]);
        });
    }
};
