<?php

namespace Tests\Feature;

use App\Models\GrammarArticle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class GrammarArticleRelatedTest extends TestCase
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

    private function admin(): User
    {
        $user = User::factory()->create();
        $user->assignRole('administrator');
        return $user;
    }

    public function test_store_creates_symmetric_related_links(): void
    {
        $a = $this->article(['title' => 'Частица は', 'code' => 'wa-particle']);
        $b = $this->article(['title' => 'Глаголы', 'code' => 'verbs']);
        $c = $this->article(['title' => 'Копула', 'code' => 'copula-da']);

        Sanctum::actingAs($this->admin());

        $this->postJson('/api/admin/grammar-articles', [
            'title'    => 'Новая статья',
            'code'     => 'new-article',
            'pattern'  => 'X',
            'info'     => 'Описание',
            'text'     => 'Текст.',
            'related_article_ids' => [$a->id, $b->id],
        ])
            ->assertCreated()
            ->assertJsonCount(2, 'related_articles')
            ->assertJsonPath('related_articles.0.code', 'wa-particle');

        $new = GrammarArticle::where('code', 'new-article')->firstOrFail();

        // A -> new (связь есть и у связанных статей)
        $this->assertDatabaseHas('grammar_article_related', ['article_id' => $new->id, 'related_article_id' => $a->id]);
        $this->assertDatabaseHas('grammar_article_related', ['article_id' => $a->id, 'related_article_id' => $new->id]);
        $this->assertDatabaseHas('grammar_article_related', ['article_id' => $new->id, 'related_article_id' => $b->id]);
        $this->assertDatabaseHas('grammar_article_related', ['article_id' => $b->id, 'related_article_id' => $new->id]);
        $this->assertDatabaseMissing('grammar_article_related', ['article_id' => $new->id, 'related_article_id' => $c->id]);
    }

    public function test_update_replaces_related_links(): void
    {
        $a = $this->article(['title' => 'Частица は', 'code' => 'wa-particle']);
        $b = $this->article(['title' => 'Глаголы', 'code' => 'verbs']);
        $c = $this->article(['title' => 'Копула', 'code' => 'copula-da']);

        DB::table('grammar_article_related')->insert([
            ['article_id' => $a->id, 'related_article_id' => $b->id, 'created_at' => now(), 'updated_at' => now()],
            ['article_id' => $b->id, 'related_article_id' => $a->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Sanctum::actingAs($this->admin());

        $this->putJson("/api/admin/grammar-articles/{$a->id}", [
            'title'   => 'Частица は',
            'pattern' => 'は',
            'related_article_ids' => [$c->id],
        ])
            ->assertOk()
            ->assertJsonCount(1, 'related_articles')
            ->assertJsonPath('related_articles.0.code', 'copula-da');

        $this->assertDatabaseMissing('grammar_article_related', ['article_id' => $a->id, 'related_article_id' => $b->id]);
        $this->assertDatabaseHas('grammar_article_related', ['article_id' => $a->id, 'related_article_id' => $c->id]);
        $this->assertDatabaseHas('grammar_article_related', ['article_id' => $c->id, 'related_article_id' => $a->id]);
    }

    public function test_show_includes_related_articles(): void
    {
        $a = $this->article(['title' => 'Частица は', 'code' => 'wa-particle']);
        $b = $this->article(['title' => 'Глаголы', 'code' => 'verbs']);

        DB::table('grammar_article_related')->insert([
            ['article_id' => $a->id, 'related_article_id' => $b->id, 'created_at' => now(), 'updated_at' => now()],
            ['article_id' => $b->id, 'related_article_id' => $a->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Sanctum::actingAs($this->admin());

        $this->getJson("/api/admin/grammar-articles/{$a->id}")
            ->assertOk()
            ->assertJsonCount(1, 'related_articles')
            ->assertJsonPath('related_articles.0.code', 'verbs')
            ->assertJsonPath('related_articles.0.title', 'Глаголы');
    }

    public function test_public_show_returns_localized_related(): void
    {
        $a = $this->article(['title' => 'Частица は', 'title_en' => 'Particle wa', 'code' => 'wa-particle']);
        $b = $this->article(['title' => 'Глаголы', 'title_en' => 'Verbs', 'code' => 'verbs']);

        DB::table('grammar_article_related')->insert([
            ['article_id' => $a->id, 'related_article_id' => $b->id, 'created_at' => now(), 'updated_at' => now()],
            ['article_id' => $b->id, 'related_article_id' => $a->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        // ru (Symfony test requests по умолчанию шлют Accept-Language: en)
        $this->getJson('/api/grammar-articles/wa-particle', ['Accept-Language' => 'ru'])
            ->assertOk()
            ->assertJsonCount(1, 'related')
            ->assertJsonPath('related.0.code', 'verbs')
            ->assertJsonPath('related.0.title', 'Глаголы');

        // en — локальная версия заголовка
        $this->getJson('/api/grammar-articles/wa-particle?lang=en')
            ->assertOk()
            ->assertJsonPath('related.0.title', 'Verbs');
    }

    public function test_destroy_removes_links_in_both_directions(): void
    {
        $a = $this->article(['code' => 'wa-particle']);
        $b = $this->article(['code' => 'verbs']);

        DB::table('grammar_article_related')->insert([
            ['article_id' => $a->id, 'related_article_id' => $b->id, 'created_at' => now(), 'updated_at' => now()],
            ['article_id' => $b->id, 'related_article_id' => $a->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Sanctum::actingAs($this->admin());

        $this->deleteJson("/api/admin/grammar-articles/{$a->id}")->assertOk();

        $this->assertDatabaseMissing('grammar_article_related', ['article_id' => $a->id]);
        $this->assertDatabaseMissing('grammar_article_related', ['related_article_id' => $a->id]);
        $this->assertDatabaseMissing('grammar_article_related', ['article_id' => $b->id]);
    }

    public function test_update_rejects_self_link(): void
    {
        $a = $this->article(['code' => 'wa-particle']);

        Sanctum::actingAs($this->admin());

        $this->putJson("/api/admin/grammar-articles/{$a->id}", [
            'title'   => 'Частица は',
            'pattern' => 'は',
            'related_article_ids' => [$a->id],
        ])
            ->assertUnprocessable();

        $this->assertDatabaseCount('grammar_article_related', 0);
    }

    public function test_update_rejects_nonexistent_related_article(): void
    {
        $a = $this->article(['code' => 'wa-particle']);

        Sanctum::actingAs($this->admin());

        $this->putJson("/api/admin/grammar-articles/{$a->id}", [
            'title'   => 'Частица は',
            'pattern' => 'は',
            'related_article_ids' => [999999],
        ])
            ->assertUnprocessable();
    }

    public function test_store_rejects_html_in_title_and_info(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/admin/grammar-articles', [
            'title'   => '</script><script>alert(1)</script>',
            'code'    => 'xss-title',
            'pattern' => 'X',
            'info'    => 'Красивое описание',
            'text'    => 'Текст.',
        ])->assertStatus(422);

        $this->assertDatabaseMissing('grammar_articles', ['code' => 'xss-title']);
    }
}
