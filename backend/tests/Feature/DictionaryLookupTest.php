<?php

namespace Tests\Feature;

use App\Models\Dictionary;
use App\Models\DictionaryEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DictionaryLookupTest extends TestCase
{
    use RefreshDatabase;

    public function test_lookup_handles_structured_content_definitions(): void
    {
        $dictionary = Dictionary::create([
            'name'             => 'JMdict (English)',
            'slug'             => 'jmdict',
            'source_lang'      => 'jp',
            'target_lang'      => 'en',
            'is_active'        => true,
            'default_priority' => 10,
        ]);

        DictionaryEntry::create([
            'dictionary_id' => $dictionary->id,
            'term'          => '食べる',
            'reading'       => 'たべる',
            'pos_tags'      => 'v1 vt',
            'score'         => 100,
            'sequence'      => 1,
            'definitions'   => [
                ['type' => 'structured-content', 'content' => [
                    'tag'     => 'ul',
                    'data'    => ['content' => 'glossary'],
                    'lang'    => 'en',
                    'content' => [
                        ['tag' => 'li', 'content' => 'to eat'],
                        ['tag' => 'li', 'content' => 'to live on (e.g. a salary)'],
                    ],
                ]],
            ],
        ]);

        Http::fake([
            '*' => Http::response([
                'base_form' => '食べる',
                'reading'   => 'タベル',
                'pos'       => '動詞',
            ], 200),
        ]);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/dictionary/lookup', ['word' => '食べる']);

        $response->assertOk();
        $this->assertSame('to eat, to live on (e.g. a salary)', $response->json('translation'));
        $this->assertSame(
            ['to eat', 'to live on (e.g. a salary)'],
            $response->json('results.0.entries.0.definitions')
        );
    }

    public function test_lookup_flattens_mixed_definitions_and_skips_notes(): void
    {
        $dictionary = Dictionary::create([
            'name'             => 'JMdict (English)',
            'slug'             => 'jmdict',
            'source_lang'      => 'jp',
            'target_lang'      => 'en',
            'is_active'        => true,
            'default_priority' => 10,
        ]);

        DictionaryEntry::create([
            'dictionary_id' => $dictionary->id,
            'term'          => '走る',
            'reading'       => 'はしる',
            'pos_tags'      => 'v5r',
            'score'         => 100,
            'sequence'      => 1,
            'definitions'   => [
                ['type' => 'structured-content', 'content' => [
                    'tag'     => 'ul',
                    'data'    => ['content' => 'glossary'],
                    'lang'    => 'en',
                    'content' => ['tag' => 'li', 'content' => 'to run'],
                ]],
                ['type' => 'structured-content', 'content' => [
                    'tag'     => 'ul',
                    'data'    => ['content' => 'notes'],
                    'lang'    => 'jp',
                    'content' => ['tag' => 'li', 'content' => 'occ. 奔る'],
                ]],
                'fallback: бежать',
            ],
        ]);

        Http::fake([
            '*' => Http::response([
                'base_form' => '走る',
                'reading'   => 'ハシル',
                'pos'       => '動詞',
            ], 200),
        ]);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/dictionary/lookup', ['word' => '走る']);

        $response->assertOk();
        $definitions = $response->json('results.0.entries.0.definitions');
        $this->assertSame(['to run', 'fallback: бежать'], $definitions);
        $this->assertStringNotContainsString('occ. 奔る', $response->json('translation'));
    }
}
