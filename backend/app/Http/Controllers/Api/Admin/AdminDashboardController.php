<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VocabularyItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $nowLiteral = now()->toDateTimeString();
        $payingCase = "SUM(CASE WHEN plan IN ('standard', 'premium') AND subscription_ends_at > '{$nowLiteral}' THEN 1 ELSE 0 END)";

        $totals = [
            'users'            => (int) User::count(),
            'paying_users'     => (int) User::whereRaw(
                "plan IN ('standard', 'premium') AND subscription_ends_at > ?",
                [$nowLiteral],
            )->count(),
            'vocabulary_words' => (int) VocabularyItem::count(),
        ];

        $usersByCountry = User::query()
            ->select('country')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('country')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'country' => $row->country,
                'total'   => (int) $row->total,
            ]);

        $countriesByPurchase = User::query()
            ->select('country')
            ->selectRaw('COUNT(*) as total_users')
            ->selectRaw("{$payingCase} as paying_users")
            ->whereNotNull('country')
            ->groupBy('country')
            ->havingRaw("{$payingCase} > 0")
            ->orderByDesc(DB::raw("{$payingCase} * 1.0 / COUNT(*)"))
            ->get()
            ->map(function ($row) {
                $total  = (int) $row->total_users;
                $paying = (int) $row->paying_users;

                return [
                    'country'         => $row->country,
                    'total_users'     => $total,
                    'paying_users'    => $paying,
                    'conversion_rate' => $total > 0 ? round($paying / $total, 3) : 0,
                ];
            });

        $topWords = VocabularyItem::query()
            ->select('surface', 'reading', 'translation', 'base_form')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('surface', 'reading', 'translation', 'base_form')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'surface'     => $row->surface,
                'reading'     => $row->reading,
                'translation' => $row->translation,
                'total'       => (int) $row->total,
            ]);

        return response()->json([
            'totals'                => $totals,
            'users_by_country'      => $usersByCountry,
            'countries_by_purchase' => $countriesByPurchase,
            'top_words'             => $topWords,
        ]);
    }
}
