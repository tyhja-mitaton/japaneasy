<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    use HasFactory;

    protected $fillable = [
        'email',
        'message',
        'admin_reply',
        'replied_at',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'replied_at' => 'datetime',
            'meta'       => 'array',
        ];
    }

    public function isReplied(): bool
    {
        return $this->replied_at !== null;
    }
}
