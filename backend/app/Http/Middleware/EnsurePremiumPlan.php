<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePremiumPlan
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Администраторы и менеджеры могут просматривать видео для проверки
        $isStaff = $user && (
            $user->hasRole('administrator') || $user->hasRole('manager')
        );

        if ($user && ($user->isPremium() || $isStaff)) {
            return $next($request);
        }

        return response()->json([
            'message' => 'Premium подписка требуется для доступа к видео.',
        ], 403);
    }
}
