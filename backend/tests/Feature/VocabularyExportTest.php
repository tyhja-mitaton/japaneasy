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
}
