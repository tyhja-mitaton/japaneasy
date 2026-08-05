<?php

namespace Tests\Feature;

use App\Models\GrammarArticle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class GrammarSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('user', 'web');
        Role::findOrCreate('manager', 'web');
        Role::findOrCreate('administrator', 'web');
    }

    private function article(array $overrides = []): GrammarArticle
    {
        return GrammarArticle::create(array_merge([
            'title'    => 'Частица は',
            'code'     => 'code-' . uniqid(),
            'pattern'  => 'は',
            'info'     => 'Частица темы',
            'text'     => 'Подробный разбор.',
            'author_id' => User::factory()->create()->id,
        ], $overrides));
    }

    public function test_public_can_search_articles_by_title_and_code(): void
    {
        $this->article(['title' => 'Частица は', 'code' => 'wa-particle']);
        $this->article(['title' => 'Глаголы', 'code' => 'verbs']);

        // Поиск по названию (нижний регистр, без букв, требующих регистронезависимости)
        $this->getJson('/api/grammar-articles?search=лагол')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'verbs');

        // Поиск по коду
        $this->getJson('/api/grammar-articles?search=wa-')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'wa-particle');

        // Пустой поиск возвращает всё
        $this->getJson('/api/grammar-articles')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_admin_can_search_articles(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('administrator');

        $this->article(['title_en' => 'Particle wa']);
        $this->article(['title_en' => 'Verbs']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/grammar-articles?search=particle')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title_en', 'Particle wa');
    }
}
