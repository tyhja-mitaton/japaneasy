<?php

use App\Http\Controllers\Api\Admin\GrammarArticleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DictionaryController;
use App\Http\Controllers\Api\UserTextController;
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

// ── Грамматические статьи (публичные — для чтения) ────────────────────────────
Route::get('/grammar-articles',       [GrammarArticleController::class, 'index']);
Route::get('/grammar-articles/{code}', [GrammarArticleController::class, 'showByCode']);

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
    Route::get('/vocabulary/export/anki', [VocabularyController::class, 'exportAnki']);

    // Тексты
    Route::get('/texts',                   [UserTextController::class, 'index']);
    Route::post('/texts',                  [UserTextController::class, 'store']);
    Route::get('/texts/{userText}',        [UserTextController::class, 'show']);
    Route::delete('/texts/{userText}',     [UserTextController::class, 'destroy']);
    Route::post('/texts/{userText}/tokenize', [UserTextController::class, 'tokenize']);
    Route::post('/texts/{userText}/grammar',  [UserTextController::class, 'grammar']);

    // Словарный поиск
    Route::post('/dictionary/lookup', [DictionaryController::class, 'lookup']);

    // Только для manager и administrator
    Route::middleware('role:manager|administrator')->group(function () {
        Route::get('admin/grammar-articles', [GrammarArticleController::class, 'index']);
        Route::post('admin/grammar-articles', [GrammarArticleController::class, 'store']);
        Route::get('admin/grammar-articles/{grammarArticle}', [GrammarArticleController::class, 'show']);
        Route::put('admin/grammar-articles/{grammarArticle}', [GrammarArticleController::class, 'update']);
        Route::delete('admin/grammar-articles/{grammarArticle}', [GrammarArticleController::class, 'destroy']);
    });


    // Только для administrator
    Route::middleware('role:administrator')->group(function () {
        // будущие маршруты администрирования
    });
});
