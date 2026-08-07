<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\VocabularyItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VocabularyExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_export_vocabulary_as_csv(): void
    {
        $user = User::factory()->create();

        VocabularyItem::create([
            'user_id'          => $user->id,
            'surface'          => '猫',
            'base_form'        => '猫',
            'reading'          => 'ネコ',
            'pos'              => 'noun',
            'translation'      => 'кошка',
            'context_sentence' => '猫が好きです。',
        ]);

        Sanctum::actingAs($user);

        $response = $this->get('/api/vocabulary/export/csv');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=utf-8')
            ->assertHeader('Content-Disposition', 'attachment; filename="vocabulary.csv"')
            ->assertSee('base_form', false)
            ->assertSee('猫', false)
            ->assertSee('кошка', false);
    }

    public function test_csv_export_only_contains_own_words(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        VocabularyItem::create([
            'user_id'   => $user->id,
            'surface'   => '山',
            'base_form' => '山',
            'reading'   => 'ヤマ',
            'pos'       => 'noun',
        ]);
        VocabularyItem::create([
            'user_id'   => $other->id,
            'surface'   => '川',
            'base_form' => '川',
            'reading'   => 'カワ',
            'pos'       => 'noun',
        ]);

        Sanctum::actingAs($user);

        $response = $this->get('/api/vocabulary/export/csv');

        $response->assertOk()
            ->assertSee('山', false)
            ->assertDontSee('川', false);
    }

    public function test_csv_export_requires_auth(): void
    {
        $this->get('/api/vocabulary/export/csv')->assertUnauthorized();
    }

    public function test_anki_export_has_four_fields_per_line(): void
    {
        $user = User::factory()->create();

        VocabularyItem::create([
            'user_id'          => $user->id,
            'surface'          => '猫',
            'base_form'        => '猫',
            'reading'          => 'ネコ',
            'pos'              => 'noun',
            'translation'      => 'кошка',
            'context_sentence' => '猫が好きです。',
        ]);

        Sanctum::actingAs($user);

        $response = $this->get('/api/vocabulary/export/anki');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/plain; charset=utf-8')
            ->assertHeader('Content-Disposition', 'attachment; filename="vocabulary.txt"');

        $content = $response->getContent();

        $this->assertSame(
            "猫\tкошка\tねこ\t猫が好きです。",
            $content,
            'Контекст должен быть четвёртым полем той же строки, а не отдельной записью',
        );
        $this->assertStringNotContainsString("\n", $content, 'Каждая запись должна занимать одну строку');
    }

    public function test_anki_export_keeps_four_fields_when_reading_and_context_are_empty(): void
    {
        $user = User::factory()->create();

        VocabularyItem::create([
            'user_id'   => $user->id,
            'surface'   => '山',
            'base_form' => '山',
            'reading'   => null,
            'pos'       => 'noun',
            'translation' => 'гора',
            'context_sentence' => null,
        ]);

        Sanctum::actingAs($user);

        $response = $this->get('/api/vocabulary/export/anki');

        $this->assertSame(
            "山\tгора\t\t",
            $response->getContent(),
        );
    }

    public function test_anki_export_only_contains_own_words(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        VocabularyItem::create([
            'user_id'   => $user->id,
            'surface'   => '川',
            'base_form' => '川',
            'reading'   => 'カワ',
            'pos'       => 'noun',
        ]);
        VocabularyItem::create([
            'user_id'   => $other->id,
            'surface'   => '海',
            'base_form' => '海',
            'reading'   => 'ウミ',
            'pos'       => 'noun',
        ]);

        Sanctum::actingAs($user);

        $response = $this->get('/api/vocabulary/export/anki');

        $response->assertOk()
            ->assertSee('川', false)
            ->assertDontSee('海', false);
    }

    public function test_anki_export_requires_auth(): void
    {
        $this->get('/api/vocabulary/export/anki')->assertUnauthorized();
    }
}
