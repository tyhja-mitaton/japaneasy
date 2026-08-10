<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class LegalController extends Controller
{
    /**
     * Публичные контактные данные (страница /legal/info).
     * Значения задаются в админ-настройках (legal_fio, legal_inn, legal_email).
     */
    public function info(): JsonResponse
    {
        return response()->json([
            'fio'   => Setting::get('legal_fio', ''),
            'inn'   => Setting::get('legal_inn', ''),
            'email' => Setting::get('legal_email', ''),
        ]);
    }
}
