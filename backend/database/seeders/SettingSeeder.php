<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            // ── Платёжная система ──────────────────────────────────────────
            ['key' => 'payment_provider',       'value' => 'robokassa',  'description' => 'Активная платёжная система (robokassa|prodamus)'],
            ['key' => 'payment_test_mode',      'value' => '1',          'description' => 'Тестовый режим (1|0)'],

            // ── Тарифы ────────────────────────────────────────────────────
            ['key' => 'plan_standard_price',    'value' => '300',        'description' => 'Цена Standard (руб/мес)'],
            ['key' => 'plan_premium_price',     'value' => '490',        'description' => 'Цена Premium (руб/мес)'],

            // ── Налоги (для перехода на ИП) ───────────────────────────────
            ['key' => 'vat_enabled',            'value' => '0',          'description' => 'НДС включён (0 для самозанятого, 1 для ИП на ОСН)'],
            ['key' => 'vat_rate',               'value' => '20',         'description' => 'Ставка НДС в процентах'],
            ['key' => 'business_type',          'value' => 'self_employed', 'description' => 'Тип бизнеса (self_employed|ip|ooo)'],

            // ── Robokassa ─────────────────────────────────────────────────
            ['key' => 'robokassa_login',        'value' => '',           'description' => 'Robokassa MerchantLogin'],
            ['key' => 'robokassa_password1',    'value' => '',           'description' => 'Robokassa Password1 (для создания счёта)'],
            ['key' => 'robokassa_password2',    'value' => '',           'description' => 'Robokassa Password2 (для проверки вебхука)'],
            ['key' => 'robokassa_hash_algo',    'value' => 'md5',        'description' => 'Алгоритм подписи (md5|sha256|sha384|sha512)'],

            // ── Prodamus ──────────────────────────────────────────────────
            ['key' => 'prodamus_shop_url',      'value' => '',           'description' => 'Prodamus shop URL (example.payform.ru)'],
            ['key' => 'prodamus_api_key',       'value' => '',           'description' => 'Prodamus API ключ'],
            ['key' => 'prodamus_secret_key',    'value' => '',           'description' => 'Prodamus секретный ключ для подписи'],
        ];

        foreach ($defaults as $setting) {
            Setting::firstOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
