<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'user_id', 'subscription_id', 'amount', 'currency', 'status',
        'provider', 'provider_payment_id', 'provider_invoice_id',
        'description', 'metadata', 'plan', 'period',
        'vat_included', 'vat_amount', 'paid_at',
    ];

    protected $casts = [
        'metadata'     => 'array',
        'paid_at'      => 'datetime',
        'vat_included' => 'boolean',
        'amount'       => 'decimal:2',
        'vat_amount'   => 'decimal:2',
    ];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function subscription(): BelongsTo { return $this->belongsTo(Subscription::class); }
}
