<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    /**
     * Список пользователей с пагинацией.
     * GET /api/admin/users?page=1&search=...
     */
    public function index(Request $request): JsonResponse
    {
        $search  = mb_strtolower(trim((string) $request->input('search', '')));
        $perPage = 10;

        $users = User::query()
            ->when($search !== '', function ($query) use ($search) {
                $like = "%{$search}%";

                return $query->where(function ($query) use ($like) {
                    $query->whereRaw('LOWER(name) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage, [
                'id', 'name', 'email', 'email_verified_at', 'country',
                'plan', 'subscription_period', 'subscription_ends_at',
                'created_at',
            ], 'page', $request->input('page', 1));

        $users->load('roles:id,name');

        $data = $users->getCollection()->map(fn (User $user) => [
            'id'                   => $user->id,
            'name'                 => $user->name,
            'email'                => $user->email,
            'email_verified_at'    => $user->email_verified_at?->toISOString(),
            'country'              => $user->country,
            'plan'                 => $user->plan,
            'subscription_period'  => $user->subscription_period,
            'subscription_ends_at' => $user->subscription_ends_at?->toISOString(),
            'created_at'           => $user->created_at?->toISOString(),
            'roles'                => $user->roles->pluck('name')->all(),
        ]);

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'per_page'     => $users->perPage(),
                'total'        => $users->total(),
            ],
        ]);
    }

    /**
     * Редактировать пользователя: имя, почта, тариф, роль.
     * PUT /api/admin/users/{user}
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'                   => ['sometimes', 'string', 'max:255'],
            'email'                  => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'plan'                   => ['sometimes', Rule::in(['free', 'standard', 'premium'])],
            'subscription_period'    => ['nullable', Rule::in(['1m', '3m', '6m', '12m'])],
            'subscription_ends_at'   => ['nullable', 'date'],
            'roles'                  => ['sometimes', 'array'],
            'roles.*'                => [Rule::in(['user', 'manager', 'administrator'])],
        ]);

        $update = array_intersect_key($data, array_flip([
            'name', 'email', 'plan', 'subscription_period', 'subscription_ends_at',
        ]));

        // Смена ролей — только для администратора (защита от эскалации manager -> administrator)
        if (isset($data['roles']) && !$request->user()->hasRole('administrator')) {
            return response()->json(['message' => 'Только администратор может менять роли.'], 403);
        }

        // Нельзя менять собственные роль и тариф (защита от самоповышения)
        $privileged = isset($data['roles']) || isset($data['plan'])
            || isset($data['subscription_period']) || isset($data['subscription_ends_at']);
        if ($request->user()->id === $user->id && $privileged) {
            return response()->json(['message' => 'Нельзя менять свои роль и тариф.'], 403);
        }

        if (isset($update['subscription_ends_at'])) {
            $update['subscription_ends_at'] = $update['subscription_ends_at'] !== null
                ? now()->parse($update['subscription_ends_at'])
                : null;
        }

        if (isset($update['plan']) && $update['plan'] === 'free') {
            $update['subscription_period'] = null;
            $update['subscription_ends_at'] = null;
        }

        $user->update($update);

        if (isset($data['roles'])) {
            $user->syncRoles($data['roles']);
        }

        $user->load('roles:id,name');

        return response()->json([
            'id'                   => $user->id,
            'name'                 => $user->name,
            'email'                => $user->email,
            'email_verified_at'    => $user->email_verified_at?->toISOString(),
            'country'              => $user->country,
            'plan'                 => $user->plan,
            'subscription_period'  => $user->subscription_period,
            'subscription_ends_at' => $user->subscription_ends_at?->toISOString(),
            'created_at'           => $user->created_at?->toISOString(),
            'roles'                => $user->roles->pluck('name')->all(),
        ]);
    }

    /**
     * Удалить пользователя.
     * DELETE /api/admin/users/{user}
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Нельзя удалить самого себя.'], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }
}
