<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Subscription;
use App\Services\Payment\PaymentManager;
use App\Services\Payment\PaymentProviderConfigurationException;
use App\Services\PlanLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct(private PaymentManager $paymentManager) {}

    // ── Доступные тарифы с актуальными ценами и лимитами ──────────────────────
    public function plans(Request $request): JsonResponse
    {
        $lang = $request->query('lang') === 'en' ? 'en' : 'ru';

        return response()->json([
            'plans' => [
                $this->planResource('free',     'Free',     0, $lang),
                $this->planResource('standard', 'Standard', (int) Setting::get('plan_standard_price', 300), $lang),
                $this->planResource('premium',  'Premium',  (int) Setting::get('plan_premium_price', 490), $lang),
            ],
        ]);
    }

    private function planResource(string $id, string $name, int $price, string $lang = 'ru'): array
    {
        $limits = PlanLimits::limitsForPlan($id);

        $isEn = $lang === 'en';

        $features = [];
        if ($limits['texts'] !== null) {
            $features[] = $isEn
                ? "Up to {$limits['texts']} texts per month"
                : "До {$limits['texts']} текстов в месяц";
        } else {
            $features[] = $isEn ? 'Unlimited texts per month' : 'Безлимит текстов в месяц';
        }
        if ($limits['vocabulary'] !== null) {
            $features[] = $isEn
                ? "Vocabulary up to {$limits['vocabulary']} words"
                : "Словарь до {$limits['vocabulary']} слов";
        } else {
            $features[] = $isEn ? 'Unlimited vocabulary' : 'Безлимитный словарь';
        }

        // Для английского интерфейса конвертируем цены в доллары
        if ($isEn && $price > 0) {
            $usdRate = (float) Setting::get('usd_rate', 90);
            $price   = round($price / $usdRate, 2);
        }

        return [
            'id'       => $id,
            'name'     => $name,
            'price'    => $price,
            'currency' => $isEn ? 'USD' : 'RUB',
            'features' => $features,
            'limits'   => [
                'texts'      => $limits['texts'],
                'vocabulary' => $limits['vocabulary'],
            ],
        ];
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
        } catch (PaymentProviderConfigurationException $e) {
            DB::rollBack();
            Log::error('Payment provider not configured', ['provider' => $provider, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Платёжная система не настроена. Обратитесь в поддержку.'], 422);
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
        try {
            $result = $this->paymentManager->driver('robokassa')->verifyWebhook($request);
        } catch (PaymentProviderConfigurationException $e) {
            Log::error('Robokassa misconfigured, webhook rejected', ['error' => $e->getMessage()]);
            return response('bad sign', 400);
        }

        if ($result === false) {
            Log::warning('Robokassa webhook: invalid signature', ['inv_id' => $request->input('InvId')]);
            return response('bad sign', 400);
        }

        $this->processPayment($result['invoice_id'], $result['status'], $result['amount'], $result['provider'] ?? 'robokassa');

        // Robokassa требует ответ "OK{InvId}"
        return response('OK' . $request->input('InvId'));
    }

    // ── Вебхук Prodamus ───────────────────────────────────────────────────────
    public function webhookProdamus(Request $request): JsonResponse
    {
        try {
            $result = $this->paymentManager->driver('prodamus')->verifyWebhook($request);
        } catch (PaymentProviderConfigurationException $e) {
            Log::error('Prodamus misconfigured, webhook rejected', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'invalid signature'], 400);
        }

        if ($result === false) {
            Log::warning('Prodamus webhook: invalid signature', ['order_id' => $request->input('order_id')]);
            return response()->json(['error' => 'invalid signature'], 400);
        }

        $this->processPayment($result['invoice_id'], $result['status'], $result['amount'], $result['provider'] ?? 'prodamus');

        return response()->json(['success' => true]);
    }

    // ── Обработка успешного/неуспешного платежа ───────────────────────────────
    private function processPayment(string $invoiceId, string $status, float $amount, ?string $provider = null): void
    {
        DB::transaction(function () use ($invoiceId, $status, $amount, $provider) {
            $payment = Payment::where('id', $invoiceId)
                ->orWhere('provider_invoice_id', $invoiceId)
                ->lockForUpdate()
                ->first();

            if (!$payment) {
                Log::error("Payment not found: {$invoiceId}");
                return;
            }

            // Вебхук пришёл от провайдера, отличного от того, через кого создан платёж
            if ($provider !== null && $payment->provider !== $provider) {
                Log::warning('Payment provider mismatch, premium NOT granted', [
                    'payment_id' => $payment->id,
                    'expected'   => $payment->provider,
                    'received'   => $provider,
                ]);

                return;
            }

            // Идемпотентность: повторная доставка вебхука не продлевает подписку повторно
            if ($payment->status === 'completed') {
                return;
            }

            // Премиум выдаётся только если фактически оплатили сумму, посчитанную
            // на сервере при инициации платежа (допуск — 1 копейка).
            $expected = (float) $payment->amount;

            if ($status === 'completed' && abs($amount - $expected) > 0.01) {
                Log::warning('Payment amount mismatch, premium NOT granted', [
                    'payment_id' => $payment->id,
                    'expected'   => $expected,
                    'received'   => $amount,
                ]);
                $payment->update([
                    'status'   => 'failed',
                    'metadata' => array_merge(
                        (array) $payment->metadata,
                        ['amount_mismatch' => true, 'expected_amount' => $expected, 'received_amount' => $amount],
                    ),
                ]);

                return;
            }

            $payment->update([
                'status'      => $status,
                'paid_at'     => $status === 'completed' ? now() : null,
                'paid_amount' => $status === 'completed' ? $amount : null,
            ]);

            if ($status === 'completed' && $payment->subscription) {
                $sub = $payment->subscription;
                $sub->update(['status' => 'active']);

                // Обновляем план пользователя, продлевая от конца текущей подписки
                $months = match ($sub->period) {
                    '3m' => 3, '6m' => 6, '12m' => 12, default => 1,
                };
                $currentEnd = $payment->user->subscription_ends_at;
                $base       = $currentEnd && $currentEnd->isFuture() ? $currentEnd : now();

                $payment->user->update([
                    'plan'                  => $sub->plan,
                    'subscription_period'   => $sub->period,
                    'subscription_ends_at'  => $base->copy()->addMonths($months),
                ]);
            }
        });
    }
}
