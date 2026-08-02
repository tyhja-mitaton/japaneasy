<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Subscription;
use App\Services\Payment\PaymentManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct(private PaymentManager $paymentManager) {}

    // ── Доступные тарифы с актуальными ценами ─────────────────────────────────
    public function plans(): JsonResponse
    {
        return response()->json([
            'plans' => [
                [
                    'id'       => 'free',
                    'name'     => 'Free',
                    'price'    => 0,
                    'currency' => 'RUB',
                    'features' => ['До 5 текстов в месяц', 'Базовый словарь (100 слов)', 'Ограниченный доступ'],
                ],
                [
                    'id'       => 'standard',
                    'name'     => 'Standard',
                    'price'    => (int) Setting::get('plan_standard_price', 300),
                    'currency' => 'RUB',
                    'features' => ['До 50 текстов в месяц', 'Расширенный словарь', 'Все упражнения', 'Аудио/видео с субтитрами'],
                ],
                [
                    'id'       => 'premium',
                    'name'     => 'Premium',
                    'price'    => (int) Setting::get('plan_premium_price', 490),
                    'currency' => 'RUB',
                    'features' => ['Неограниченная загрузка', 'Полный доступ', 'Персональная статистика', 'Приоритетная поддержка'],
                ],
            ],
        ]);
    }

    // ── Инициировать платёж ───────────────────────────────────────────────────
    public function initiate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plan'   => ['required', 'in:standard,premium'],
            'period' => ['required', 'in:1m,3m,6m,12m'],
        ]);

        $user   = $request->user();
        $plan   = $data['plan'];
        $period = $data['period'];

        // Рассчитываем сумму
        $basePrice   = (int) Setting::get("plan_{$plan}_price", 0);
        $months      = match ($period) { '3m' => 3, '6m' => 6, '12m' => 12, default => 1 };
        $discount    = match ($period) { '3m' => 0.05, '6m' => 0.10, '12m' => 0.15, default => 0 };
        $amount      = round($basePrice * $months * (1 - $discount), 2);

        $provider = Setting::get('payment_provider', 'robokassa');

        // НДС (для будущего ИП)
        $vatEnabled = (bool) Setting::get('vat_enabled', '0');
        $vatRate    = (int) Setting::get('vat_rate', 20);
        $vatAmount  = $vatEnabled ? round($amount * $vatRate / (100 + $vatRate), 2) : 0;

        DB::beginTransaction();
        try {
            $subscription = Subscription::create([
                'user_id'    => $user->id,
                'plan'       => $plan,
                'period'     => $period,
                'status'     => 'pending',
                'provider'   => $provider,
                'started_at' => now(),
                'ends_at'    => now()->addMonths($months),
            ]);

            $payment = Payment::create([
                'user_id'         => $user->id,
                'subscription_id' => $subscription->id,
                'amount'          => $amount,
                'plan'            => $plan,
                'period'          => $period,
                'provider'        => $provider,
                'status'          => 'pending',
                'description'     => "Тариф " . ucfirst($plan) . " на {$months} мес.",
                'vat_included'    => $vatEnabled,
                'vat_amount'      => $vatAmount,
            ]);

            $driver      = $this->paymentManager->driver($provider);
            $invoiceData = $driver->createInvoice($payment, $user);

            $payment->update(['provider_invoice_id' => $invoiceData['invoice_id']]);

            DB::commit();

            return response()->json([
                'payment_id'   => $payment->id,
                'redirect_url' => $invoiceData['redirect_url'],
                'amount'       => $amount,
                'currency'     => 'RUB',
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Payment initiation failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Payment initiation failed'], 500);
        }
    }

    // ── Статус платежа ────────────────────────────────────────────────────────
    public function status(Request $request, Payment $payment): JsonResponse
    {
        if ($payment->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json([
            'id'     => $payment->id,
            'status' => $payment->status,
            'amount' => $payment->amount,
            'plan'   => $payment->plan,
        ]);
    }

    // ── Вебхук Robokassa ──────────────────────────────────────────────────────
    public function webhookRobokassa(Request $request): Response
    {
        $result = $this->paymentManager->driver('robokassa')->verifyWebhook($request);

        if ($result === false) {
            Log::warning('Robokassa webhook: invalid signature', $request->all());
            return response('bad sign', 400);
        }

        $this->processPayment($result['invoice_id'], $result['status'], $result['amount']);

        // Robokassa требует ответ "OK{InvId}"
        return response('OK' . $request->input('InvId'));
    }

    // ── Вебхук Prodamus ───────────────────────────────────────────────────────
    public function webhookProdamus(Request $request): JsonResponse
    {
        $result = $this->paymentManager->driver('prodamus')->verifyWebhook($request);

        if ($result === false) {
            Log::warning('Prodamus webhook: invalid signature', $request->all());
            return response()->json(['error' => 'invalid signature'], 400);
        }

        $this->processPayment($result['invoice_id'], $result['status'], $result['amount']);

        return response()->json(['success' => true]);
    }

    // ── Обработка успешного/неуспешного платежа ───────────────────────────────
    private function processPayment(string $invoiceId, string $status, float $amount): void
    {
        $payment = Payment::where('id', $invoiceId)
            ->orWhere('provider_invoice_id', $invoiceId)
            ->first();

        if (!$payment) {
            Log::error("Payment not found: {$invoiceId}");
            return;
        }

        DB::transaction(function () use ($payment, $status, $amount) {
            $payment->update([
                'status'  => $status,
                'paid_at' => $status === 'completed' ? now() : null,
                'amount'  => $amount,
            ]);

            if ($status === 'completed' && $payment->subscription) {
                $sub = $payment->subscription;
                $sub->update(['status' => 'active']);

                // Обновляем план пользователя
                $months = match ($sub->period) {
                    '3m' => 3, '6m' => 6, '12m' => 12, default => 1,
                };
                $payment->user->update([
                    'plan'                => $sub->plan,
                    'subscription_period' => $sub->period,
                    'subscription_ends_at' => now()->addMonths($months),
                ]);
            }
        });
    }
}
