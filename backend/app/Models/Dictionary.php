<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dictionary extends Model
{
    protected $fillable = [
        'name', 'slug', 'source_lang', 'target_lang',
        'is_active', 'default_priority', 'entries_count', 'metadata',
        'import_status', 'import_progress', 'import_error', 'import_path',
    ];

    protected $casts = [
        'metadata'   => 'array',
        'is_active'  => 'boolean',
    ];

    public function entries(): HasMany
    {
        return $this->hasMany(DictionaryEntry::class);
    }

    public function userPreferences(): HasMany
    {
        return $this->hasMany(UserDictionaryPreference::class);
    }
}
