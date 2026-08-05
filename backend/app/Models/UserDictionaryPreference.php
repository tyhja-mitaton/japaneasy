<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDictionaryPreference extends Model
{
    protected $fillable = ['user_id', 'dictionary_id', 'priority', 'is_enabled'];

    protected $casts = ['is_enabled' => 'boolean'];

    public function dictionary(): BelongsTo
    {
        return $this->belongsTo(Dictionary::class);
    }
}
