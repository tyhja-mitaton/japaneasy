<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class LanguageController extends Controller
{
    // Список российских кодов стран (включая Беларусь, Казахстан — по желанию)
    private const RU_COUNTRIES = ['RU', 'BY', 'KZ'];

    /**
     * Определить язык по IP — для гостей и при регистрации.
     * GET /api/detect-language
     */
    public function detect(Request $request): JsonResponse
    {
        $ip = $request->ip();

        // Для localhost/private сетей — русский по умолчанию
        if ($this->isPrivateIp($ip)) {
            return response()->json(['language' => 'ru', 'country' => 'LOCAL']);
        }

        $language = Cache::remember("lang_ip:{$ip}", 3600, function () use ($ip) {
            return $this->detectByIp($ip);
        });

        return response()->json(['language' => $language]);
    }

    /**
     * Сохранить выбранный язык в профиле.
     * POST /api/profile/language
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'language' => ['required', 'in:ru,en'],
        ]);

        $request->user()->update(['language' => $data['language']]);

        return response()->json(['language' => $data['language']]);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private function detectByIp(string $ip): string
    {
        try {
            // ip-api.com — бесплатно, без ключа, 45 req/мин
            $response = Http::timeout(3)
                ->get("http://ip-api.com/json/{$ip}?fields=countryCode");

            if ($response->ok()) {
                $country = $response->json('countryCode', '');
                return in_array($country, self::RU_COUNTRIES) ? 'ru' : 'en';
            }
        } catch (\Throwable) {
            // Если сервис недоступен — русский по умолчанию
        }

        return 'ru';
    }

    private function isPrivateIp(string $ip): bool
    {
        return in_array($ip, ['127.0.0.1', '::1'])
            || str_starts_with($ip, '192.168.')
            || str_starts_with($ip, '10.')
            || str_starts_with($ip, '172.');
    }
}
