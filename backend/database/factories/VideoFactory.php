<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Video;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Video>
 */
class VideoFactory extends Factory
{
    protected $model = Video::class;

    public function definition(): array
    {
        return [
            'title'        => fake()->sentence(3),
            'description'  => fake()->paragraph(),
            'file_path'    => 'videos/' . date('Y/m') . '/sample.mp4',
            'thumbnail_path' => null,
            'duration'     => fake()->numberBetween(60, 600),
            'is_published' => true,
            'uploaded_by'  => User::factory(),
        ];
    }

    public function unpublished(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_published' => false,
        ]);
    }
}
