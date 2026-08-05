<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DictionaryEntry extends Model
{
    protected $fillable = [
        'dictionary_id', 'term', 'reading', 'pos_tags',
        'rules', 'score', 'definitions', 'sequence', 'term_tags',
    ];

    protected $casts = [
        'definitions' => 'array',
    ];

    public function dictionary(): BelongsTo
    {
        return $this->belongsTo(Dictionary::class);
    }

    /**
     * Возвращает теги в виде массива.
     * "⭐ ichi news5k" → ['⭐', 'ichi', 'news5k']
     */
    public function getTagsArray(): array
    {
        return array_filter(explode(' ', $this->term_tags));
    }

    /**
     * Является ли слово распространённым (есть ⭐ в тегах).
     */
    public function isCommon(): bool
    {
        return str_contains($this->term_tags, '⭐');
    }
}
