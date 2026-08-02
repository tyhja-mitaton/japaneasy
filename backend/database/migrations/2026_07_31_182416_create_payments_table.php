<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('subscription_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('RUB');
            $table->enum('status', ['pending', 'completed', 'failed', 'refunded'])->default('pending');
            $table->string('provider');                          // robokassa | prodamus
            $table->string('provider_payment_id')->nullable();  // ID в системе провайдера
            $table->string('provider_invoice_id')->nullable();
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();               // raw данные от провайдера
            $table->string('plan');                             // за что платёж
            $table->string('period')->nullable();
            $table->boolean('vat_included')->default(false);   // для перехода на ИП
            $table->decimal('vat_amount', 10, 2)->default(0);
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('payments'); }
};

