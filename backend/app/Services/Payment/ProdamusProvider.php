<?php

namespace App\Services\Payment;

use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ProdamusProvider implements PaymentProviderInterface
{
    private string $shopUrl;
    private string $apiKey;
    private string $secretKey;

    public function __construct()
    {
        $this->shopUrl   = Setting::get('prodamus_shop_url', '');
        $this->apiKey    = Setting::get('prodamus_api_key', '');
        $this->secretKey = Setting::get('prodamus_secret_key', '');
    }

    public function createInvoice(Payment $payment, User $user): array
    {
        // Prodamus: создаём платёжную ссылку через API
        $payload = [
            'order_id'     => $payment->id,
            'customer_email' => $user->email,
            'products'     => [[
                'name'     => "Тариф " . ucfirst($payment->plan),
                'price'    => $payment->amount,
                'quantity' => 1,
            ]],
            'do'           => 'link',
            'urlSuccess'   => env('FRONTEND_URL') . '/billing/success?payment=' . $payment->id,
            'urlFail'      => env('FRONTEND_URL') . '/billing/fail?payment=' . $payment->id,
            'urlNotification' => route('webhook.prodamus'),
        ];

        // Подпись для Prodamus
        $sign = hash_hmac('sha256', json_encode($payload), $this->secretKey);
        $payload['sign'] = $sign;

        $response = Http::timeout(15)
            ->withHeaders(['Authorization' => 'Bearer ' . $this->apiKey])
            ->post("https://{$this->shopUrl}/api/", $payload);

        if ($response->failed()) {
            throw new \RuntimeException('Prodamus API error: ' . $response->body());
        }

        $data = $response->json();

        return [
            'redirect_url' => $data['payment_url'] ?? $data['url'] ?? '',
            'invoice_id'   => (string) ($data['payment_id'] ?? $payment->id),
        ];
    }

    public function verifyWebhook(Request $request): array|false
    {
        $data = $request->all();
        $receivedSign = $data['sign'] ?? '';
        unset($data['sign']);

        // Сортируем параметры и считаем подпись
        ksort($data);
        $expected = hash_hmac('sha256', http_build_query($data), $this->secretKey);

        if (!hash_equals($expected, $receivedSign)) {
            return false;
        }

        $status = match ($data['payment_status'] ?? '') {
            'success' => 'completed',
            'fail'    => 'failed',
            default   => 'pending',
        };

        return [
            'invoice_id' => (string) ($data['order_id'] ?? ''),
            'status'     => $status,
            'amount'     => (float) ($data['sum'] ?? 0),
        ];
    }
}
