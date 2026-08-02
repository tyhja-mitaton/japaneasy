<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GrammarArticle extends Model
{
    protected $fillable = ['title', 'code', 'info', 'text', 'author_id', 'pattern',
        'title_en', 'info_en', 'text_en'];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
