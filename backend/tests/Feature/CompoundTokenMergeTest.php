<?php

namespace Tests\Feature;

use App\Models\Dictionary;
use App\Models\DictionaryEntry;
use App\Models\User;
use App\Models\UserText;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompoundTokenMergeTest extends TestCase
{
    use RefreshDatabase;

    private function seedDictionaryWith(string $term, string $reading): DictionaryEntry
    {
        $dictionary = Dictionary::firstOrCreate(
            ['slug' => 'jmdict'],
            [
                'name'             => 'JMdict (English)',
                'source_lang'      => 'jp',
                'target_lang'      => 'en',
                'is_active'        => true,
                'default_priority' => 10,
            ]
        );

        return DictionaryEntry::create([
            'dictionary_id' => $dictionary->id,
            'term'          => $term,
            'reading'       => $reading,
            'pos_tags'      => 'exp',
            'score'         => 100,
            'sequence'      => 1,
            'definitions'   => ['to notice'],
        ]);
    }

    private function fakeNlpTokens(array $tokens): void
    {
        Http::fake([
            '*/tokenize' => Http::response(['tokens' => $tokens], 200),
        ]);
    }

    public function test_compound_tokens_are_merged_with_dictionary_term(): void
    {
        $this->seedDictionaryWith('気が付く', 'きがつく');

        $user = User::factory()->create();
        $text = UserText::create([
            'user_id' => $user->id,
            'title'   => 'Test',
            'content' => '気がついた。',
        ]);

        $this->fakeNlpTokens([
            ['surface' => '気',  'base_form' => '気',  'reading' => 'キ',   'pos' => '名詞',     'start' => 0, 'end' => 1],
            ['surface' => 'が',  'base_form' => 'が',  'reading' => 'ガ',   'pos' => '助詞',     'start' => 1, 'end' => 2],
            ['surface' => 'つい', 'base_form' => '付く', 'reading' => 'ツイ', 'pos' => '動詞',    'start' => 2, 'end' => 4],
            ['surface' => 'た',  'base_form' => 'た',  'reading' => 'タ',   'pos' => '助動詞',   'start' => 4, 'end' => 5],
            ['surface' => '。',  'base_form' => '。',  'reading' => '',     'pos' => '補助記号', 'start' => 5, 'end' => 6],
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/texts/{$text->id}/tokenize");

        $response->assertOk()
            ->assertJsonCount(3, 'tokens');

        $this->assertSame([
            'surface'   => '気がつい',
            'base_form' => '気が付く',
            'reading'   => 'キガツイ',
            'pos'       => '連語',
            'start'     => 0,
            'end'       => 4,
        ], $response->json('tokens.0'));

        $this->assertSame('た', $response->json('tokens.1.surface'));
        $this->assertSame('。', $response->json('tokens.2.surface'));
    }

    public function test_merger_does_not_cross_punctuation_boundaries(): void
    {
        $this->seedDictionaryWith('気が付く', 'きがつく');

        $user = User::factory()->create();
        $text = UserText::create([
            'user_id' => $user->id,
            'title'   => 'Test',
            'content' => '気。気がつく',
        ]);

        $this->fakeNlpTokens([
            ['surface' => '気',  'base_form' => '気',  'reading' => 'キ',  'pos' => '名詞',     'start' => 0, 'end' => 1],
            ['surface' => '。',  'base_form' => '。',  'reading' => '',    'pos' => '補助記号', 'start' => 1, 'end' => 2],
            ['surface' => '気',  'base_form' => '気',  'reading' => 'キ',  'pos' => '名詞',     'start' => 2, 'end' => 3],
            ['surface' => 'が',  'base_form' => 'が',  'reading' => 'ガ',  'pos' => '助詞',     'start' => 3, 'end' => 4],
            ['surface' => 'つく', 'base_form' => '付く', 'reading' => 'ツク', 'pos' => '動詞',    'start' => 4, 'end' => 6],
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/texts/{$text->id}/tokenize");

        $response->assertOk()
            ->assertJsonCount(3, 'tokens');

        // Одиночный 気 перед пунктуацией не склеивается
        $this->assertSame('気', $response->json('tokens.0.surface'));
        $this->assertSame('。', $response->json('tokens.1.surface'));

        // А второй компаунд склеивается
        $this->assertSame('気がつく', $response->json('tokens.2.surface'));
        $this->assertSame('気が付く', $response->json('tokens.2.base_form'));
    }

    public function test_merger_keeps_regular_words_unchanged(): void
    {
        $user = User::factory()->create();
        $text = UserText::create([
            'user_id' => $user->id,
            'title'   => 'Test',
            'content' => '食べる。',
        ]);

        $this->fakeNlpTokens([
            ['surface' => '食べる', 'base_form' => '食べる', 'reading' => 'タベル', 'pos' => '動詞',   'start' => 0, 'end' => 3],
            ['surface' => '。',     'base_form' => '。',     'reading' => '',        'pos' => '補助記号', 'start' => 3, 'end' => 4],
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/texts/{$text->id}/tokenize");

        $response->assertOk()
            ->assertJsonCount(2, 'tokens')
            ->assertJsonPath('tokens.0.base_form', '食べる')
            ->assertJsonPath('tokens.0.pos', '動詞')
            ->assertJsonPath('tokens.1.surface', '。');
    }

    public function test_te_shimau_is_not_grammar_merged(): void
    {
        // 〜てしまう — грамматическая конструкция: мерджер склеивает только
        // словарные компаунды. «しまっ + た» склеивается словарём в «しまった»
        // (терм 仕舞うた), а «で» остаётся отдельным токеном.
        $this->seedDictionaryWith('仕舞うた', 'シマッタ');

        $user = User::factory()->create();
        $text = UserText::create([
            'user_id' => $user->id,
            'title'   => 'Test',
            'content' => '飲んでしまった。',
        ]);

        $this->fakeNlpTokens([
            ['surface' => '飲ん', 'base_form' => '飲む', 'reading' => 'ノン', 'pos' => '動詞',     'start' => 0, 'end' => 2],
            ['surface' => 'で',   'base_form' => 'て',   'reading' => 'デ',   'pos' => '助詞',     'start' => 2, 'end' => 3],
            ['surface' => 'しまっ', 'base_form' => '仕舞う', 'reading' => 'シマッ', 'pos' => '動詞', 'start' => 3, 'end' => 6],
            ['surface' => 'た',   'base_form' => 'た',   'reading' => 'タ',   'pos' => '助動詞',   'start' => 6, 'end' => 7],
            ['surface' => '。',   'base_form' => '。',   'reading' => '',     'pos' => '補助記号', 'start' => 7, 'end' => 8],
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/texts/{$text->id}/tokenize");

        $response->assertOk()
            ->assertJsonCount(4, 'tokens');

        $this->assertSame('飲ん', $response->json('tokens.0.surface'));

        $this->assertSame([
            'surface'   => 'で',
            'base_form' => 'て',
            'reading'   => 'デ',
            'pos'       => '助詞',
            'start'     => 2,
            'end'       => 3,
        ], $response->json('tokens.1'));

        $this->assertSame([
            'surface'   => 'しまった',
            'base_form' => '仕舞うた',
            'reading'   => 'シマッタ',
            'pos'       => '連語',
            'start'     => 3,
            'end'       => 7,
        ], $response->json('tokens.2'));

        $this->assertSame('。', $response->json('tokens.3.surface'));
    }

    public function test_past_auxiliary_does_not_start_compound(): void
    {
        // «た + の» не склеивается в омоним «たの» из словаря; «の + に» → «のに».
        $this->seedDictionaryWith('のに', 'のに');
        $this->seedDictionaryWith('たの', 'たの');

        $user = User::factory()->create();
        $text = UserText::create([
            'user_id' => $user->id,
            'title'   => 'Test',
            'content' => '食べたのに。',
        ]);

        $this->fakeNlpTokens([
            ['surface' => '食べ', 'base_form' => '食べる', 'reading' => 'タベ', 'pos' => '動詞',   'start' => 0, 'end' => 2],
            ['surface' => 'た',   'base_form' => 'た',     'reading' => 'タ',   'pos' => '助動詞', 'start' => 2, 'end' => 3],
            ['surface' => 'の',   'base_form' => 'の',     'reading' => 'ノ',   'pos' => '助詞',   'start' => 3, 'end' => 4],
            ['surface' => 'に',   'base_form' => 'に',     'reading' => 'ニ',   'pos' => '助詞',   'start' => 4, 'end' => 5],
            ['surface' => '。',   'base_form' => '。',     'reading' => '',     'pos' => '補助記号', 'start' => 5, 'end' => 6],
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/texts/{$text->id}/tokenize");

        $response->assertOk()
            ->assertJsonCount(4, 'tokens');

        $this->assertSame('食べ', $response->json('tokens.0.surface'));
        $this->assertSame('た',   $response->json('tokens.1.surface'));
        $this->assertSame('のに', $response->json('tokens.2.surface'));
        $this->assertSame('のに', $response->json('tokens.2.base_form'));
        $this->assertSame('。',   $response->json('tokens.3.surface'));
    }
}
