<?php

return [
    /*
    |--------------------------------------------------------------------------
    | CORS Configuration
    |--------------------------------------------------------------------------
    | Разрешаем запросы с фронтенда (Next.js) к Laravel API.
    | Sanctum использует cookie-based аутентификацию, поэтому
    | credentials и конкретные origins обязательны.
    */

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        'auth/*',
    ],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_map('trim', explode(',',
        env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:8080')
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'X-XSRF-TOKEN',
    ],

    'exposed_headers' => [],

    'max_age' => 86400,   // 24 часа кэш preflight

    /*
    | Обязательно true для Sanctum SPA аутентификации через cookie.
    | Для API-токенов (Bearer) можно false, но true не ломает.
    */
    'supports_credentials' => true,
];
