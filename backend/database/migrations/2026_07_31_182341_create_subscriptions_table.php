<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('plan', ['free', 'standard', 'premium'])->default('free');
            $table->enum('period', ['1m', '3m', '6m', '12m'])->nullable();
            $table->enum('status', ['pending', 'active', 'cancelled', 'expired', 'past_due'])
                ->default('pending');
            $table->string('provider')->nullable();              // robokassa | prodamus
            $table->string('provider_subscription_id')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('subscriptions'); }
};

