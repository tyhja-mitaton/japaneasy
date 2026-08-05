<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\User;
use App\Models\UserText;
use App\Models\VocabularyItem;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Лимиты тарифов.
 *
 * Лимиты настраиваются в админке через Setting:
 *   limit_texts_{plan}    — текстов в месяц (0/пусто = безлимит)
 *   limit_vocab_{plan}    — слов в словаре (0/пусто = безлимит)
 *
 * Для платных тарифов месяц текстов отсчитывается от даты подписки
 * (окно = subscription_ends_at − период), для бесплатного — календарный месяц.
 */
class PlanLimits
{
    private const PERIOD_MONTHS = ['1m' => 1, '3m' => 3, '6m' => 6, '12m' => 12];

    public static function limitsForPlan(string $plan): array
    {
        return [
            'texts'      => self::parse((int) Setting::get("limit_texts_{$plan}", 0)),
            'vocabulary' => self::parse((int) Setting::get("limit_vocab_{$plan}", 0)),
        ];
    }

    /**
     * Эффективный тариф для лимитов.
     * Standard/Premium учитываются только при активной подписке.
     */
    public static function effectivePlan(User $user): string
    {
        if ($user->hasActiveSubscription()) {
            return $user->plan;
        }

        return 'free';
    }

    public static function textsLimit(User $user): ?int
    {
        return self::limitsForPlan(self::effectivePlan($user))['texts'];
    }

    public static function vocabularyLimit(User $user): ?int
    {
        return self::limitsForPlan(self::effectivePlan($user))['vocabulary'];
    }

    /**
     * Начало окна подсчёта текстов для пользователя.
     */
    public static function textsWindowStart(User $user): Carbon
    {
        if ($user->hasActiveSubscription() && $user->subscription_ends_at) {
            $months = self::PERIOD_MONTHS[$user->subscription_period] ?? 1;

            return $user->subscription_ends_at->copy()->subMonths($months);
        }

        return now()->startOfMonth();
    }

    public static function textsUsed(User $user): int
    {
        return UserText::where('user_id', $user->id)
            ->where('created_at', '>=', self::textsWindowStart($user))
            ->count();
    }

    public static function vocabularyCount(User $user): int
    {
        return VocabularyItem::where('user_id', $user->id)->count();
    }

    /**
     * Бросает 422, если лимит текстов исчерпан.
     */
    public static function checkTexts(User $user): void
    {
        $limit = self::textsLimit($user);
        if ($limit === null) return;

        if (self::textsUsed($user) >= $limit) {
            $plan = self::effectivePlan($user);
            throw ValidationException::withMessages([
                'content' => "Превышен лимит текстов для тарифа " . ucfirst($plan) . " ({$limit} в месяц). Улучшите тариф или дождитесь нового периода.",
            ]);
        }
    }

    /**
     * Бросает 422, если словарь заполнен (только для нового слова).
     */
    public static function checkVocabulary(User $user, string $baseForm): void
    {
        $limit = self::vocabularyLimit($user);
        if ($limit === null) return;

        $isNew = ! VocabularyItem::where('user_id', $user->id)
            ->where('base_form', $baseForm)
            ->exists();

        if ($isNew && self::vocabularyCount($user) >= $limit) {
            $plan = self::effectivePlan($user);
            throw ValidationException::withMessages([
                'base_form' => "Словарь заполнен: тариф " . ucfirst($plan) . " позволяет до {$limit} слов. Удалите лишние слова или улучшите тариф.",
            ]);
        }
    }

    private static function parse(int $value): ?int
    {
        return $value > 0 ? $value : null;
    }
}
