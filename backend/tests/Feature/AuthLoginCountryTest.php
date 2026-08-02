<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthLoginCountryTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_backfills_country_when_missing(): void
    {
        $user = User::factory()->create([
            'email' => 'john@example.com',
            'country' => null,
        ]);

        $this->postJson('/api/auth/login', [
            'email'    => 'john@example.com',
            'password' => 'password',
            'country'  => 'RU',
        ])->assertOk();

        $this->assertSame('RU', $user->fresh()->country);
    }

    public function test_login_keeps_existing_country(): void
    {
        $user = User::factory()->create([
            'email'   => 'jane@example.com',
            'country' => 'KZ',
        ]);

        $this->postJson('/api/auth/login', [
            'email'    => 'jane@example.com',
            'password' => 'password',
            'country'  => 'RU',
        ])->assertOk();

        $this->assertSame('KZ', $user->fresh()->country);
    }
}
