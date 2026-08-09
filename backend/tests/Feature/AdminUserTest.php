<?php

namespace Tests\Feature;

use App\Models\Dictionary;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminUserTest extends TestCase
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
        $admin = User::factory()->create();
        $admin->assignRole('administrator');

        return $admin;
    }

    public function test_admin_can_list_users_with_pagination(): void
    {
        User::factory()->count(12)->create();

        Sanctum::actingAs($this->admin());

        $response = $this->getJson('/api/admin/users');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id', 'name', 'email', 'plan', 'roles',
                    'subscription_period', 'subscription_ends_at', 'created_at',
                ]],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $data = $response->json();
        $this->assertSame(10, $data['meta']['per_page']);
        $this->assertSame(13, $data['meta']['total']); // 12 + админ
        $this->assertCount(10, $data['data']);
    }

    public function test_admin_can_search_users(): void
    {
        User::factory()->create(['name' => 'Ямамото Таро', 'email' => 'taro@example.com']);
        User::factory()->create(['name' => 'Иван Иванов', 'email' => 'ivan@example.com']);

        Sanctum::actingAs($this->admin());

        $response = $this->getJson('/api/admin/users?search=taro');

        $response->assertOk();
        $data = $response->json();
        $this->assertSame(1, $data['meta']['total']);
        $this->assertSame('taro@example.com', $data['data'][0]['email']);
    }

    public function test_admin_can_update_user_plan(): void
    {
        $user = User::factory()->create(['plan' => 'free']);
        $user->assignRole('user');

        Sanctum::actingAs($this->admin());

        $response = $this->putJson("/api/admin/users/{$user->id}", [
            'plan'                  => 'premium',
            'subscription_period'   => '3m',
            'subscription_ends_at'  => now()->addMonths(3)->toDateString(),
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('users', [
            'id'                   => $user->id,
            'plan'                 => 'premium',
            'subscription_period'  => '3m',
        ]);

        $fresh = $user->fresh();
        $this->assertNotNull($fresh->subscription_ends_at);
    }

    public function test_setting_plan_to_free_clears_subscription(): void
    {
        $user = User::factory()->create([
            'plan'                  => 'premium',
            'subscription_period'   => '6m',
            'subscription_ends_at'  => now()->addMonths(6),
        ]);

        Sanctum::actingAs($this->admin());

        $this->putJson("/api/admin/users/{$user->id}", ['plan' => 'free'])
            ->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('free', $fresh->plan);
        $this->assertNull($fresh->subscription_period);
        $this->assertNull($fresh->subscription_ends_at);
    }

    public function test_admin_can_update_user_profile_and_roles(): void
    {
        $user = User::factory()->create(['name' => 'Старое имя']);
        $user->assignRole('user');

        Sanctum::actingAs($this->admin());

        $this->putJson("/api/admin/users/{$user->id}", [
            'name'  => 'Новое имя',
            'email' => 'new@example.com',
            'roles' => ['manager'],
        ])->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('Новое имя', $fresh->name);
        $this->assertSame('new@example.com', $fresh->email);
        $this->assertTrue($fresh->hasRole('manager'));
        $this->assertFalse($fresh->hasRole('user'));
    }

    public function test_admin_cannot_delete_self(): void
    {
        $admin = $this->admin();

        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/users/{$admin->id}")
            ->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_admin_can_delete_user(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');

        Sanctum::actingAs($this->admin());

        $this->deleteJson("/api/admin/users/{$user->id}")
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_manager_can_manage_users(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('manager');
        $target = User::factory()->create();

        Sanctum::actingAs($manager);

        $this->getJson('/api/admin/users')->assertOk();
        $this->putJson("/api/admin/users/{$target->id}", ['plan' => 'standard'])->assertOk();
    }

    public function test_users_endpoints_require_admin_role(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        $target = User::factory()->create();

        Sanctum::actingAs($user);

        $this->getJson('/api/admin/users')->assertForbidden();
        $this->putJson("/api/admin/users/{$target->id}", ['plan' => 'premium'])->assertForbidden();
        $this->deleteJson("/api/admin/users/{$target->id}")->assertForbidden();
    }

    public function test_users_endpoints_require_auth(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
    }

    public function test_dictionary_show_route_returns_import_status(): void
    {
        $dictionary = Dictionary::create([
            'name'             => 'JMdict RU',
            'slug'             => 'jmdict-ru',
            'source_lang'      => 'jp',
            'target_lang'      => 'ru',
            'is_active'        => true,
            'default_priority' => 1,
            'entries_count'    => 0,
        ]);
        $dictionary->forceFill(['import_status' => 'processing', 'import_progress' => 42])->save();

        Sanctum::actingAs($this->admin());

        $this->getJson("/api/admin/dictionaries/{$dictionary->id}")
            ->assertOk()
            ->assertJson([
                'id'              => $dictionary->id,
                'import_status'   => 'processing',
                'import_progress' => 42,
            ]);
    }

    public function test_manager_cannot_change_roles(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('manager');
        $target = User::factory()->create();
        $target->assignRole('user');

        Sanctum::actingAs($manager);

        $this->putJson("/api/admin/users/{$target->id}", ['roles' => ['administrator']])
            ->assertForbidden();

        $this->assertFalse($target->fresh()->hasRole('administrator'));
    }

    public function test_manager_cannot_promote_self(): void
    {
        $manager = User::factory()->create();
        $manager->assignRole('manager');

        Sanctum::actingAs($manager);

        $this->putJson("/api/admin/users/{$manager->id}", ['roles' => ['administrator']])
            ->assertForbidden();

        $this->assertFalse($manager->fresh()->hasRole('administrator'));
    }

    public function test_user_cannot_change_own_plan(): void
    {
        $user = User::factory()->create(['plan' => 'free']);
        $user->assignRole('user');

        Sanctum::actingAs($user);

        $this->putJson("/api/admin/users/{$user->id}", ['plan' => 'premium'])
            ->assertForbidden();

        $this->assertSame('free', $user->fresh()->plan);
    }

    public function test_admin_cannot_change_own_roles(): void
    {
        $admin = $this->admin();

        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/users/{$admin->id}", ['roles' => ['user']])
            ->assertForbidden();

        $this->assertTrue($admin->fresh()->hasRole('administrator'));
    }
}
