<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserProfile extends Model
{
    protected $fillable = ['user_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vocabulary(): HasMany
    {
        return $this->hasMany(VocabularyItem::class, 'user_id', 'user_id');
    }

    public function texts(): HasMany
    {
        return $this->hasMany(UserText::class, 'user_id', 'user_id');
    }
}
