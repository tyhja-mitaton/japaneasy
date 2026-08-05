<?php

namespace App\Models;

use App\Concerns\HasStorageUrls;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subtitle extends Model
{
    use HasStorageUrls;

    protected $fillable = ['video_id', 'label', 'language', 'file_path', 'is_default'];

    protected $casts = ['is_default' => 'boolean'];

    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class);
    }

    public function getUrlAttribute(): string
    {
        return '/api/videos/'.$this->video_id.'/subtitles/'.$this->id;
    }
}
