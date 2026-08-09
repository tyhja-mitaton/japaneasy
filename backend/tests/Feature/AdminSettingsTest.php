<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('user', 'web');
        Role::findOrCreate('manager', 'web');
        Role::findOrCreate('administrator', 'web');
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['country' => 'RU']);
        $admin->assignRole('administrator');

        return $admin;
    }

    public function test_admin_can_update_allowed_setting(): void
    {
        Setting::create(['key' => 'usd_rate', 'value' => '82', 'description' => '']);

        Sanctum::actingAs($this->admin());

        $this->postJson('/api/admin/settings', [
            'settings' => [['key' => 'usd_rate', 'value' => '95']],
        ])->assertOk();

        $this->assertSame('95', Setting::get('usd_rate'));
    }

    public function test_unknown_setting_key_is_ignored(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/admin/settings', [
            'settings' => [['key' => 'evil_key', 'value' => 'pwned']],
        ])->assertOk();

        $this->assertDatabaseMissing('settings', ['key' => 'evil_key']);
    }

    public function test_mixed_allowed_and_unknown_keys(): void
    {
        Setting::create(['key' => 'usd_rate', 'value' => '82', 'description' => '']);

        Sanctum::actingAs($this->admin());

        $this->postJson('/api/admin/settings', [
            'settings' => [
                ['key' => 'usd_rate', 'value' => '88'],
                ['key' => 'config/app.key', 'value' => 'stolen'],
            ],
        ])->assertOk();

        $this->assertSame('88', Setting::get('usd_rate'));
        $this->assertDatabaseMissing('settings', ['key' => 'config/app.key']);
    }

    public function test_unknown_key_cannot_be_created(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/admin/settings', [
            'settings' => [['key' => 'new_arbitrary_key', 'value' => 'x']],
        ])->assertOk();

        $this->assertDatabaseMissing('settings', ['key' => 'new_arbitrary_key']);
    }

    public function test_non_admin_cannot_access_settings(): void
    {
        $user = User::factory()->create(['country' => 'RU']);
        $user->assignRole('user');

        Sanctum::actingAs($user);

        $this->getJson('/api/admin/settings')->assertForbidden();
    }
}
