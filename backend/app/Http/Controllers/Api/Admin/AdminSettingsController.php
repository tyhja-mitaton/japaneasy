<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSettingsController extends Controller
{
    // Allowlist ключей — всё что не перечислено здесь, обновить нельзя
    private const ALLOWED_KEYS = [
        // Платёжная система
        'payment_provider',
        'payment_test_mode',
        // Тарифы
        'plan_standard_price',
        'plan_premium_price',
        'usd_rate',
        // Лимиты тарифов
        'limit_texts_free',
        'limit_texts_standard',
        'limit_texts_premium',
        'limit_vocab_free',
        'limit_vocab_standard',
        'limit_vocab_premium',
        // Налоги
        'vat_enabled',
        'vat_rate',
        'business_type',
        // Robokassa
        'robokassa_login',
        'robokassa_password1',
        'robokassa_password2',
        'robokassa_hash_algo',
        // Prodamus
        'prodamus_shop_url',
        'prodamus_api_key',
        'prodamus_secret_key',
        // Юридические данные
        'legal_fio',
        'legal_inn',
        'legal_email',
    ];

    // Ключи которые нельзя вернуть в открытом виде
    private const SENSITIVE = [
        'robokassa_password1',
        'robokassa_password2',
        'prodamus_api_key',
        'prodamus_secret_key',
    ];

    public function index(): JsonResponse
    {
        $settings = Setting::all(['key', 'value', 'description'])
            ->map(function ($s) {
                // Маскируем секретные ключи
                if (in_array($s->key, self::SENSITIVE) && $s->value) {
                    $s->value = str_repeat('*', 8) . substr($s->value, -4);
                    $s->masked = true;
                }
                return $s;
            });

        return response()->json($settings);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'settings'             => ['required', 'array'],
            'settings.*.key'       => ['required', 'string'],
            'settings.*.value'     => ['nullable', 'string'],
        ]);

        foreach ($data['settings'] as $item) {
            $key   = $item['key'];
            $value = $item['value'] ?? '';

            // Allowlist: незнакомые ключи игнорируем
            if (!in_array($key, self::ALLOWED_KEYS)) {
                continue;
            }

            // Не обновляем маскированные значения (если пользователь не менял)
            if (in_array($key, self::SENSITIVE) && str_contains($value, '****')) {
                continue;
            }

            // Валидация специфичных полей
            if ($key === 'payment_provider' && !in_array($value, ['robokassa', 'prodamus'])) {
                continue;
            }

            // Лимиты тарифов — только неотрицательные числа (0 = безлимит)
            if (preg_match('/^limit_(texts|vocab)_(free|standard|premium)$/', $key)
                && (!ctype_digit((string) $value))) {
                continue;
            }

            Setting::set($key, $value);
        }

        return response()->json(['message' => 'Settings saved.']);
    }
}
