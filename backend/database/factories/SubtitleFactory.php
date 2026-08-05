<?php

namespace Database\Factories;

use App\Models\Subtitle;
use App\Models\Video;
use Illuminate\Database\Eloquent\Factories\Factory;

class SubtitleFactory extends Factory
{
    protected $model = Subtitle::class;

    public function definition(): array
    {
        return [
            'video_id'   => Video::factory(),
            'label'      => '日本語',
            'language'   => 'jp',
            'file_path'  => 'subtitles/'.fake()->unique()->slug().'.vtt',
            'is_default' => false,
        ];
    }
}
