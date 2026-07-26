<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
            'country'  => ['nullable', 'string', 'size:2'],
            'timezone' => ['nullable', 'string', 'max:64'],
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
            'plan'     => 'free',
            'country'  => $data['country'] ?? null,
            'timezone' => $data['timezone'] ?? null,
        ]);

        $user->assignRole(Role::findByName('user', 'web'));

        // Отправляем письмо с подтверждением
        event(new Registered($user));

        return response()->json([
            'message' => 'Registration successful. Please check your email to verify your account.',
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($data)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        /** @var User $user */
        $user = Auth::user();

        if (! $user->hasVerifiedEmail()) {
            Auth::logout();
            return response()->json([
                'message' => 'Please verify your email address before logging in.',
                'email_verified' => false,
            ], 403);
        }

        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        $user->tokens()->delete();
        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'user'  => $this->userResource($user),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userResource($request->user()));
    }

    // ── Сброс пароля ──────────────────────────────────────────────────────────

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? response()->json(['message' => 'Password reset link sent to your email.'])
            : response()->json(['message' => 'Email not found.'], 404);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => ['required'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])->save();
                $user->tokens()->delete();
            }
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => 'Password reset successfully.'])
            : response()->json(['message' => 'Invalid or expired reset token.'], 422);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private function userResource(User $user): array
    {
        return [
            'id'                   => $user->id,
            'name'                 => $user->name,
            'email'                => $user->email,
            'plan'                 => $user->plan,
            'subscription_period'  => $user->subscription_period,
            'subscription_ends_at' => $user->subscription_ends_at?->toISOString(),
            'is_premium'           => $user->isPremium(),
            'roles'                => $user->getRoleNames(),
            'country'              => $user->country,
            'timezone'             => $user->timezone,
            'last_login_at'        => $user->last_login_at?->toISOString(),
            'email_verified'       => $user->hasVerifiedEmail(),
        ];
    }
}
