<?php

namespace Database\Factories;

use App\Models\Feedback;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Feedback>
 */
class FeedbackFactory extends Factory
{
    protected $model = Feedback::class;

    public function definition(): array
    {
        return [
            'email'   => fake()->safeEmail(),
            'message' => fake()->sentence(),
            'meta'    => ['user_agent' => 'phpunit'],
        ];
    }
}
