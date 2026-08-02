<?php

namespace App\Services\Payment;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;

interface PaymentProviderInterface
{
    /**
     * Создать счёт на оплату.
     * Возвращает ['redirect_url' => ..., 'invoice_id' => ...]
     */
    public function createInvoice(Payment $payment, User $user): array;

    /**
     * Проверить и распарсить вебхук.
     * Возвращает ['invoice_id' => ..., 'status' => 'completed|failed', 'amount' => ...]
     * или false если подпись невалидна.
     */
    public function verifyWebhook(Request $request): array|false;
}
