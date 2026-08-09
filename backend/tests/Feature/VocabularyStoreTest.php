<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserText;
use App\Models\VocabularyItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VocabularyStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_link_vocabulary_item_to_own_text(): void
    {
        $user = User::factory()->create();
        $text = UserText::create([
            'user_id' => $user->id,
            'title'   => 'Мой текст',
            'content' => '私は学生です。',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/vocabulary', [
            'surface'        => '学生',
            'base_form'      => '学生',
            'translation'    => 'студент',
            'source_text_id' => $text->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('source_text_id', $text->id);

        $this->assertDatabaseHas('vocabulary_items', [
            'user_id'        => $user->id,
            'base_form'      => '学生',
            'source_text_id' => $text->id,
        ]);
    }

    public function test_user_cannot_link_vocabulary_item_to_other_users_text(): void
    {
        $owner = User::factory()->create();
        $text = UserText::create([
            'user_id' => $owner->id,
            'title'   => 'Чужой текст',
            'content' => '秘密のテキスト。',
        ]);

        $attacker = User::factory()->create();
        Sanctum::actingAs($attacker);

        $response = $this->postJson('/api/vocabulary', [
            'surface'        => '秘密',
            'base_form'      => '秘密',
            'translation'    => 'секрет',
            'source_text_id' => $text->id,
        ]);

        $response->assertStatus(403);

        $this->assertDatabaseMissing('vocabulary_items', [
            'base_form' => '秘密',
        ]);
    }

    public function test_user_can_link_vocabulary_item_to_nonexistent_text(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/vocabulary', [
            'surface'        => '猫',
            'base_form'      => '猫',
            'translation'    => 'кошка',
            'source_text_id' => 999999,
        ]);

        $response->assertStatus(422);
    }
}
