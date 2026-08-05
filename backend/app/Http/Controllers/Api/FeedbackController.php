<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use App\Services\PlanLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = auth('sanctum')->user();

        $data = $request->validate([
            'email'   => $user ? ['prohibited'] : ['required', 'email', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $email = $user?->email ?? $data['email'];

        $meta = [
            'user_agent' => $request->userAgent(),
        ];

        if ($user) {
            $meta = array_merge($meta, [
                'user_id'     => $user->id,
                'plan'        => PlanLimits::effectivePlan($user),
                'profile_url' => rtrim(env('FRONTEND_URL', ''), '/') . "/profile/{$user->id}",
            ]);
        }

        $feedback = Feedback::create([
            'email'   => $email,
            'message' => $data['message'],
            'meta'    => $meta,
        ]);

        return response()->json([
            'message'  => 'Спасибо! Ваше обращение отправлено.',
            'feedback' => $feedback,
        ], 201);
    }
}
