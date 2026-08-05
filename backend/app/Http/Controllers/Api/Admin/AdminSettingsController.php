<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSettingsController extends Controller
{
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
