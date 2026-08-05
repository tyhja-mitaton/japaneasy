<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminDictionaryController;
use App\Http\Controllers\Api\Admin\AdminFeedbackController;
use App\Http\Controllers\Api\Admin\AdminSettingsController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\AdminVideoController;
use App\Http\Controllers\Api\Admin\GrammarArticleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\DictionaryController;
use App\Http\Controllers\Api\LanguageController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\UserDictionaryPreferenceController;
use App\Http\Controllers\Api\UserTextController;
use App\Http\Controllers\Api\VideoController;
use App\Http\Controllers\Api\VocabularyController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ── Auth (публичные) ──────────────────────────────────────────────────────────
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login',    [AuthController::class, 'login']);
Route::post('/auth/forgot-password',  [AuthController::class, 'forgotPassword']);
Route::post('/auth/reset-password',   [AuthController::class, 'resetPassword']);
Route::get('/auth/login', function () {
    return redirect(env('FRONTEND_URL') . '/auth/login');
})->name('login');

// Email верификация
/*Route::get('/auth/verify-email/{id}/{hash}', function (EmailVerificationRequest $request) {
    $request->fulfill();
    // Редирект на фронтенд после подтверждения
    return redirect(env('FRONTEND_URL', 'http://localhost:3000') . '/auth/verified');
})->middleware(['auth:sanctum', 'signed'])->name('verification.verify');*/
// routes/api.php
Route::get('/auth/verify-email/{id}/{hash}', function (Request $request, $id, $hash) {
    $user = \App\Models\User::findOrFail($id);

    // Проверяем подпись URL
    if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
        return redirect(env('FRONTEND_URL') . '/auth/verified?status=error');
    }

    if (! $request->hasValidSignature()) {
        return redirect(env('FRONTEND_URL') . '/auth/verified?status=expired');
    }

    if (! $user->hasVerifiedEmail()) {
        $user->markEmailAsVerified();
        event(new \Illuminate\Auth\Events\Verified($user));
    }

    return redirect(env('FRONTEND_URL') . '/auth/verified?status=success');
})->middleware('signed')->name('verification.verify');

/*Route::post('/auth/resend-verification', function (Request $request) {
    $request->user()->sendEmailVerificationNotification();
    return response()->json(['message' => 'Verification link sent.']);
})->middleware('auth:sanctum');*/

// Определение языка по IP — публичный
Route::get('/detect-language', [LanguageController::class, 'detect']);

// Тарифы — публичные (чтобы неавторизованные видели цены)
Route::get('/plans', [PaymentController::class, 'plans']);

// Обратная связь — публичная (для гостей и авторизованных)
Route::post('/feedback', [FeedbackController::class, 'store'])
    ->middleware('throttle:5,60');

// ── Грамматические статьи (публичные — для чтения) ────────────────────────────
Route::get('/grammar-articles',       [GrammarArticleController::class, 'index']);
Route::get('/grammar-articles/{code}', [GrammarArticleController::class, 'showByCode']);

// ── Вебхуки (без auth, но с проверкой подписи внутри) ────────────────────────
Route::post('/webhooks/robokassa', [PaymentController::class, 'webhookRobokassa'])
    ->name('webhook.robokassa')
    ->withoutMiddleware(['throttle']);

Route::post('/webhooks/prodamus',  [PaymentController::class, 'webhookProdamus'])
    ->name('webhook.prodamus')
    ->withoutMiddleware(['throttle']);

// Видео — только для Premium (админы/менеджеры могут просматривать)
Route::middleware(['auth:sanctum', 'premium'])->group(function () {
    Route::get('/videos',      [VideoController::class, 'index']);
    Route::get('/videos/{video}', [VideoController::class, 'show']);
    Route::get('/videos/{video}/subtitles/{subtitle}', [VideoController::class, 'subtitle']);
});


// ── Защищённые маршруты ───────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);
    Route::post('/auth/resend-verification',  fn (Request $r) => tap(
        response()->json(['message' => 'Verification link sent.']),
        fn () => $r->user()->sendEmailVerificationNotification()
    ));

    // Словарь
    Route::get('/vocabulary',              [VocabularyController::class, 'index']);
    Route::post('/vocabulary',             [VocabularyController::class, 'store']);
    Route::delete('/vocabulary/{vocabularyItem}', [VocabularyController::class, 'destroy']);
    Route::get('/vocabulary/export/anki',  [VocabularyController::class, 'exportAnki']);
    Route::get('/vocabulary/export/csv',   [VocabularyController::class, 'exportCsv']);

    // Тексты
    Route::get('/texts',                   [UserTextController::class, 'index']);
    Route::post('/texts',                  [UserTextController::class, 'store']);
    Route::get('/texts/{userText}',        [UserTextController::class, 'show']);
    Route::put('/texts/{userText}',        [UserTextController::class, 'update']);
    Route::delete('/texts/{userText}',     [UserTextController::class, 'destroy']);
    Route::post('/texts/{userText}/tokenize', [UserTextController::class, 'tokenize']);
    Route::post('/texts/{userText}/grammar',  [UserTextController::class, 'grammar']);

    // Словарный поиск
    Route::post('/dictionary/lookup', [DictionaryController::class, 'lookup']);

    // Платежи
    Route::post('/payments/initiate',             [PaymentController::class, 'initiate']);
    Route::get('/payments/{payment}/status',      [PaymentController::class, 'status']);

    Route::get('/profile/dictionaries',  [UserDictionaryPreferenceController::class, 'index']);
    Route::post('/profile/dictionaries', [UserDictionaryPreferenceController::class, 'update']);

    // Только для manager и administrator
    Route::middleware('role:manager|administrator')->group(function () {
        Route::get('admin/grammar-articles', [GrammarArticleController::class, 'index']);
        Route::post('admin/grammar-articles', [GrammarArticleController::class, 'store']);
        Route::get('admin/grammar-articles/{grammarArticle}', [GrammarArticleController::class, 'show']);
        Route::put('admin/grammar-articles/{grammarArticle}', [GrammarArticleController::class, 'update']);
        Route::delete('admin/grammar-articles/{grammarArticle}', [GrammarArticleController::class, 'destroy']);

        // Настройки
        Route::get('admin/settings',  [AdminSettingsController::class, 'index']);
        Route::post('admin/settings', [AdminSettingsController::class, 'update']);

        // Дашборд со статистикой
        Route::get('admin/dashboard', [AdminDashboardController::class, 'index']);

        Route::get('admin/dictionaries',              [AdminDictionaryController::class, 'index']);
        Route::get('admin/dictionaries/{dictionary}', [AdminDictionaryController::class, 'show']);
        Route::post('admin/dictionaries/import',      [AdminDictionaryController::class, 'import']);
        Route::put('admin/dictionaries/{dictionary}', [AdminDictionaryController::class, 'update']);
        Route::delete('admin/dictionaries/{dictionary}', [AdminDictionaryController::class, 'destroy']);

        // Пользователи
        Route::get('admin/users',       [AdminUserController::class, 'index']);
        Route::put('admin/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('admin/users/{user}', [AdminUserController::class, 'destroy']);

        // Обратная связь
        Route::get('admin/feedback',                       [AdminFeedbackController::class, 'index']);
        Route::get('admin/feedback/{feedback}',            [AdminFeedbackController::class, 'show']);
        Route::post('admin/feedback/{feedback}/reply',     [AdminFeedbackController::class, 'reply']);
        Route::delete('admin/feedback/{feedback}',         [AdminFeedbackController::class, 'destroy']);

        Route::get('admin/videos',                              [AdminVideoController::class, 'index']);
        Route::post('admin/videos',                             [AdminVideoController::class, 'store']);
        Route::get('admin/videos/{video}',                      [AdminVideoController::class, 'show']);
        Route::post('admin/videos/{video}',                     [AdminVideoController::class, 'update']); // POST с FormData
        Route::delete('admin/videos/{video}',                   [AdminVideoController::class, 'destroy']);
        Route::post('admin/videos/{video}/subtitles',           [AdminVideoController::class, 'uploadSubtitle']);
        Route::delete('admin/videos/{video}/subtitles/{subtitle}', [AdminVideoController::class, 'destroySubtitle']);
    });


    // Только для administrator
    Route::middleware('role:administrator')->group(function () {
        // будущие маршруты администрирования
    });
});

