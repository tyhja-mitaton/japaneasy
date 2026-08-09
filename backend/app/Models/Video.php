<?php

namespace App\Models;

use App\Concerns\HasStorageUrls;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\URL;

class Video extends Model
{
    use HasFactory;
    use HasStorageUrls;

    protected $fillable = [
        'title', 'description', 'file_path', 'thumbnail_path',
        'duration', 'is_published', 'uploaded_by',
    ];

    protected $casts = ['is_published' => 'boolean'];

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function subtitles(): HasMany
    {
        return $this->hasMany(Subtitle::class);
    }

    public function getVideoUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }

        // Видеофайл хранится на приватном диске — доступ только по
        // временной подписанной ссылке (30 минут), т.к. <video> не умеет
        // слать Authorization-заголовок. Относительная ссылка: хост подставляет
        // фронтенд (toApiUrl), т.к. APP_URL не совпадает с реальным адресом.
        return URL::temporarySignedRoute('videos.stream', now()->addMinutes(30), [
            'video' => $this->id,
        ], false);
    }

    public function getThumbnailUrlAttribute(): ?string
    {
        return $this->thumbnail_path
            ? $this->relativeStorageUrl($this->thumbnail_path)
            : null;
    }

    public function getDurationFormattedAttribute(): string
    {
        if (!$this->duration) return '--:--';
        $m = intdiv($this->duration, 60);
        $s = $this->duration % 60;
        return sprintf('%d:%02d', $m, $s);
    }
}
