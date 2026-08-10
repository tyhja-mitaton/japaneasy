<?php

namespace Tests\Feature;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LegalInfoTest extends TestCase
{
    use RefreshDatabase;

    public function test_legal_info_is_public(): void
    {
        Setting::set('legal_fio', 'Иванов Иван Иванович');
        Setting::set('legal_inn', '123456789012');
        Setting::set('legal_email', 'legal@example.com');

        $this->getJson('/api/legal/info')
            ->assertOk()
            ->assertJson([
                'fio'   => 'Иванов Иван Иванович',
                'inn'   => '123456789012',
                'email' => 'legal@example.com',
            ]);
    }

    public function test_legal_info_returns_empty_values_when_unset(): void
    {
        $this->getJson('/api/legal/info')
            ->assertOk()
            ->assertJson(['fio' => '', 'inn' => '', 'email' => '']);
    }
}
