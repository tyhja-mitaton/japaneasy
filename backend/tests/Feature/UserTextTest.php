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
}
