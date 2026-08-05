<?php

namespace Database\Factories;

use App\Models\UserText;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserText>
 */
class UserTextFactory extends Factory
{
    protected $model = UserText::class;

    public function definition(): array
    {
        return [
            'user_id' => 1,
            'title'   => fake()->words(4, true),
            'content' => fake()->sentence(),
        ];
    }
}
