<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\VocabularyItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
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

    public function test_admin_can_view_dashboard_statistics(): void
    {
        // Пользователи по странам
        User::factory()->create(['country' => 'RU']);
        User::factory()->create(['country' => 'RU']);
        User::factory()->create(['country' => 'KZ']);
        User::factory()->create(['country' => null]);

        // Платящие пользователи
        User::factory()->create([
            'country'              => 'RU',
            'plan'                 => 'premium',
            'subscription_ends_at' => now()->addDays(30),
        ]);
        User::factory()->create([
            'country'              => 'KZ',
            'plan'                 => 'standard',
            'subscription_ends_at' => now()->addDays(14),
        ]);
        User::factory()->create([
            'country'              => 'BY',
            'plan'                 => 'premium',
            'subscription_ends_at' => now()->subDays(1),
        ]);

        // Слова
        foreach (['猫', '猫', '水'] as $surface) {
            VocabularyItem::create([
                'user_id'   => User::factory()->create()->id,
                'surface'   => $surface,
                'base_form' => $surface,
            ]);
        }

        Sanctum::actingAs($this->admin());

        $response = $this->getJson('/api/admin/dashboard');

        $response->assertOk()
            ->assertJsonStructure([
                'totals'               => ['users', 'paying_users', 'vocabulary_words'],
                'users_by_country'     => [['country', 'total']],
                'countries_by_purchase' => [['country', 'total_users', 'paying_users', 'conversion_rate']],
                'top_words'            => [['surface', 'reading', 'translation', 'total']],
            ]);

        $data = $response->json();

        // 8 пользователей + 3 владельца слов
        $this->assertSame(11, $data['totals']['users']);
        $this->assertSame(2, $data['totals']['paying_users']);
        $this->assertSame(3, $data['totals']['vocabulary_words']);

        $ru = collect($data['users_by_country'])->firstWhere('country', 'RU');
        $this->assertSame(4, $ru['total']);

        $kz = collect($data['countries_by_purchase'])->firstWhere('country', 'KZ');
        $this->assertSame(2, $kz['total_users']);
        $this->assertSame(1, $kz['paying_users']);
        $this->assertSame(0.5, $kz['conversion_rate']);

        $by = collect($data['countries_by_purchase'])->firstWhere('country', 'BY');
        $this->assertNull($by, 'истёкшие подписки не считаются платящими');

        $this->assertSame('猫', $data['top_words'][0]['surface']);
        $this->assertSame(2, $data['top_words'][0]['total']);
    }

    public function test_dashboard_requires_admin_role(): void
    {
        $user = User::factory()->create();
        $user->assignRole('user');

        Sanctum::actingAs($user);

        $this->getJson('/api/admin/dashboard')->assertForbidden();
    }

    public function test_dashboard_requires_auth(): void
    {
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();
    }
}
