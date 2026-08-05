<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserText;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserTextTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_their_text(): void
    {
        $user = User::factory()->create();
        $text = UserText::create([
            'user_id' => $user->id,
            'title'   => 'Старый заголовок',
            'content' => '古いテキスト。',
        ]);

        Sanctum::actingAs($user);

        $response = $this->putJson("/api/texts/{$text->id}", [
            'title'   => 'Новый заголовок',
            'content' => '新しいテキスト。',
        ]);

        $response->assertOk()
            ->assertJsonPath('id', $text->id)
            ->assertJsonPath('title', 'Новый заголовок')
            ->assertJsonPath('content', '新しいテキスト。');

        $this->assertDatabaseHas('user_texts', [
            'id'      => $text->id,
            'title'   => 'Новый заголовок',
            'content' => '新しいテキスト。',
        ]);
    }

    public function test_user_can_update_only_title(): void
    {
        $user = User::factory()->create();
        $text = UserText::create([
            'user_id' => $user->id,
            'title'   => 'Старый заголовок',
            'content' => '元のテキスト。',
        ]);

        Sanctum::actingAs($user);

        $this->putJson("/api/texts/{$text->id}", ['title' => 'Только заголовок'])
            ->assertOk()
            ->assertJsonPath('title', 'Только заголовок')
            ->assertJsonPath('content', '元のテキスト。');
    }

    public function test_user_cannot_update_foreign_text(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $text = UserText::create([
            'user_id' => $owner->id,
            'title'   => 'Чужой текст',
            'content' => '他人のテキスト。',
        ]);

        Sanctum::actingAs($other);

        $this->putJson("/api/texts/{$text->id}", ['content' => 'Хакерский текст。'])
            ->assertForbidden();

        $this->assertDatabaseHas('user_texts', [
            'id'      => $text->id,
            'content' => '他人のテキスト。',
        ]);
    }

    public function test_text_update_requires_auth(): void
    {
        $user = User::factory()->create();
        $text = UserText::create([
            'user_id' => $user->id,
            'title'   => 'Текст',
            'content' => 'テキスト。',
        ]);

        $this->putJson("/api/texts/{$text->id}", ['title' => 'Новое'])
            ->assertUnauthorized();
    }

    public function test_index_returns_paginated_own_texts(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        UserText::factory()->count(25)->create(['user_id' => $user->id]);
        UserText::factory()->create(['user_id' => $other->id, 'title' => 'Чужой текст']);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/texts');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'title', 'created_at', 'updated_at']],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $this->assertSame(25, $response->json('meta.total'));
        $this->assertSame(10, $response->json('meta.per_page'));
        $this->assertSame(3, $response->json('meta.last_page'));
        $this->assertCount(10, $response->json('data'));
    }

    public function test_index_can_search_by_title_and_content(): void
    {
        $user = User::factory()->create();
        UserText::factory()->create(['user_id' => $user->id, 'title' => 'Дзиро в Токио', 'content' => 'a']);
        UserText::factory()->create(['user_id' => $user->id, 'title' => 'Просто текст', 'content' => 'встреча с Ханако']);
        UserText::factory()->create(['user_id' => $user->id, 'title' => 'Ещё один', 'content' => 'про Ханако']);

        Sanctum::actingAs($user);

        $byTitle = $this->getJson('/api/texts?search=Токио');
        $byTitle->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('Дзиро в Токио', $byTitle->json('data.0.title'));

        $byContent = $this->getJson('/api/texts?search=Ханако');
        $byContent->assertOk()->assertJsonCount(2, 'data');

        $none = $this->getJson('/api/texts?search=несуществующее');
        $none->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_index_does_not_leak_other_users_texts_in_search(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        UserText::factory()->create(['user_id' => $user->id, 'title' => 'Мой секрет', 'content' => 'c']);
        UserText::factory()->create(['user_id' => $other->id, 'title' => 'Мой секрет 2', 'content' => 'c']);

        Sanctum::actingAs($user);

        $this->getJson('/api/texts?search=секрет')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Мой секрет');
    }
}
