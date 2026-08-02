<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    protected $fillable = [
        'user_id', 'plan', 'period', 'status', 'provider',
        'provider_subscription_id', 'started_at', 'ends_at', 'cancelled_at',
    ];

    protected $casts = [
        'started_at'   => 'datetime',
        'ends_at'      => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function payments(): HasMany { return $this->hasMany(Payment::class); }

    public function isActive(): bool
    {
        return $this->status === 'active' && $this->ends_at?->isFuture();
    }
}
