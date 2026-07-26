<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VocabularyItem extends Model
{
    protected $fillable = [
        'user_id', 'surface', 'base_form', 'reading',
        'pos', 'translation', 'context_sentence', 'source_text_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sourceText(): BelongsTo
    {
        return $this->belongsTo(UserText::class, 'source_text_id');
    }
}
