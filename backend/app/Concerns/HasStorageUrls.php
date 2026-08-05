<?php

namespace App\Concerns;

use Illuminate\Support\Facades\Storage;

trait HasStorageUrls
{
    protected function relativeStorageUrl(string $path): string
    {
        $url = Storage::disk('public')->url($path);
        $parsed = parse_url($url);

        if ($url !== '' && isset($parsed['path'])) {
            return $parsed['path'].(isset($parsed['query']) ? '?'.$parsed['query'] : '');
        }

        return $url;
    }
}
