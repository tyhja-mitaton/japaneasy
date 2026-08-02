<?php

namespace App\Services\Payment;

use App\Models\Setting;

class PaymentManager
{
    public function driver(?string $provider = null): PaymentProviderInterface
    {
        $provider ??= Setting::get('payment_provider', 'robokassa');

        return match ($provider) {
            'prodamus' => new ProdamusProvider(),
            default    => new RobokassaProvider(),
        };
    }
}
