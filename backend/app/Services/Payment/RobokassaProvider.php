<?php

namespace App\Services\Payment;

use App\Models\Payment;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\Request;

class RobokassaProvider implements PaymentProviderInterface
{
    private string $login;
    private string $password1;
    private string $password2;
    private string $algo;
    private bool   $testMode;

    public function __construct()
    {
        $this->login     = Setting::get('robokassa_login', '');
        $this->password1 = Setting::get('robokassa_password1', '');
        $this->password2 = Setting::get('robokassa_password2', '');
        $this->algo      = Setting::get('robokassa_hash_algo', 'sha256');
        $this->testMode  = (bool) Setting::get('payment_test_mode', '0');

        // Fail-closed: никогда не используем слабые алгоритмы подписи
        if (!in_array($this->algo, ['sha256', 'sha384', 'sha512'], true)) {
            throw new PaymentProviderConfigurationException(
                "Unsupported Robokassa hash algorithm: {$this->algo} (must be sha256/sha384/sha512)"
            );
        }
    }

    public function createInvoice(Payment $payment, User $user): array
    {
        // Fail-closed: без настроенных секретов счёт не создаём
        if ($this->login === '' || $this->password1 === '' || $this->password2 === '') {
            throw new PaymentProviderConfigurationException(
                'Robokassa is not configured (missing login/password1/password2)'
            );
        }

        $invId       = $payment->id;
        $outSum      = number_format($payment->amount, 2, '.', '');
        $description = urlencode($payment->description ?? "Оплата тарифа {$payment->plan}");

        $signature = $this->hash("{$this->login}:{$outSum}:{$invId}:{$this->password1}");

        $params = http_build_query([
            'MerchantLogin'  => $this->login,
            'OutSum'         => $outSum,
            'InvId'          => $invId,
            'Description'    => $payment->description ?? "Оплата тарифа {$payment->plan}",
            'SignatureValue'  => $signature,
            'IsTest'         => $this->testMode ? 1 : 0,
            'Email'          => $user->email,
            'Culture'        => 'ru',
            'Encoding'       => 'utf-8',
            'SuccessURL'     => env('FRONTEND_URL') . "/billing/success?payment={$invId}",
            'FailURL'        => env('FRONTEND_URL') . "/billing/fail?payment={$invId}",
        ]);

        $baseUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx';

        return [
            'redirect_url' => "{$baseUrl}?{$params}",
            'invoice_id'   => (string) $invId,
        ];
    }

    public function verifyWebhook(Request $request): array|false
    {
        $outSum = $request->input('OutSum');
        $invId  = $request->input('InvId');
        $sign   = $request->input('SignatureValue');

        // Fail-closed: без секрета подпись не может быть валидной
        if ($this->password2 === '') {
            return false;
        }

        if (!$outSum || !$invId || !$sign) {
            return false;
        }

        $expected = $this->hash("{$outSum}:{$invId}:{$this->password2}");

        if (!hash_equals(strtolower($expected), strtolower($sign))) {
            return false;
        }

        return [
            'invoice_id' => $invId,
            'status'     => 'completed',
            'amount'     => (float) $outSum,
            'provider'   => 'robokassa',
        ];
    }

    private function hash(string $data): string
    {
        return match ($this->algo) {
            'sha256' => hash('sha256', $data),
            'sha384' => hash('sha384', $data),
            'sha512' => hash('sha512', $data),
            default  => throw new PaymentProviderConfigurationException(
                "Unsupported Robokassa hash algorithm: {$this->algo}"
            ),
        };
    }
}
