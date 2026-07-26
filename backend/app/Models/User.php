<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Notifications\ResetPasswordNotification;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'plan',
        'subscription_period',
        'subscription_ends_at',
        'country',
        'timezone',
        'last_login_at',
        'last_login_ip',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'    => 'datetime',
            'subscription_ends_at' => 'datetime',
            'last_login_at'        => 'datetime',
            'password'             => 'hashed',
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public function isPremium(): bool
    {
        return $this->plan === 'premium'
            && $this->subscription_ends_at?->isFuture();
    }

    public function isFree(): bool
    {
        return ! $this->isPremium();
    }

    public function isAdministrator(): bool
    {
        return $this->hasRole('administrator');
    }

    public function isManager(): bool
    {
        return $this->hasRole('manager');
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }
}
