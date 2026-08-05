<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Models\UserText;
use App\Models\VocabularyItem;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlanLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_user_cannot_exceed_monthly_text_limit(): void
    {
        Setting::set('limit_texts_free', 2);

        $user = User::factory()->create(['plan' => 'free']);

        // Создаём 2 текста в текущем месяце
        UserText::create(['user_id' => $user->id, 'title' => '1', 'content' => 'a']);
        UserText::create(['user_id' => $user->id, 'title' => '2', 'content' => 'b']);

        Sanctum::actingAs($user);

        $this->postJson('/api/texts', ['content' => 'третий текст'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('content');
    }

    public function test_free_user_can_create_text_within_limit(): void
    {
        Setting::set('limit_texts_free', 5);

        $user = User::factory()->create(['plan' => 'free']);
        Sanctum::actingAs($user);

        $this->postJson('/api/texts', ['content' => 'первый текст'])
            ->assertCreated();

        $this->assertDatabaseCount('user_texts', 1);
    }

    public function test_limit_zero_means_unlimited(): void
    {
        Setting::set('limit_texts_free', 0);

        $user = User::factory()->create(['plan' => 'free']);
        UserText::create(['user_id' => $user->id, 'title' => '1', 'content' => 'a']);

        Sanctum::actingAs($user);

        $this->postJson('/api/texts', ['content' => 'второй текст'])
            ->assertCreated();
    }

    public function test_free_text_window_is_calendar_month(): void
    {
        Setting::set('limit_texts_free', 1);

        $user = User::factory()->create(['plan' => 'free']);

        // Старый текст — в прошлом месяце
        $old = UserText::create([
            'user_id' => $user->id,
            'title'   => 'старый',
            'content' => 'old',
        ]);
        $old->created_at = Carbon::now()->subMonths(2);
        $old->save();

        Sanctum::actingAs($user);

        // Текущий месяц ещё свободен
        $this->postJson('/api/texts', ['content' => 'новый текст'])
            ->assertCreated();
    }

    public function test_paid_text_window_counts_from_subscription_start(): void
    {
        Setting::set('limit_texts_standard', 2);

        // 3-месячная подписка, начатая ~2 месяца назад:
        // окно [now − 2 мес; now + 1 мес], а не с начала календарного месяца
        $user = User::factory()->create([
            'plan'                 => 'standard',
            'subscription_period'  => '3m',
            'subscription_ends_at' => Carbon::now()->addMonth(),
        ]);

        // Оба текста внутри окна подписки, но вне календарного месяца
        foreach ([Carbon::now()->subMonths(2), Carbon::now()->subDays(55)] as $createdAt) {
            $text = UserText::create(['user_id' => $user->id, 'title' => 't', 'content' => 'c']);
            $text->created_at = $createdAt;
            $text->save();
        }

        Sanctum::actingAs($user);

        // Третий текст в том же окне — превышение (для календарного месяца было бы ок)
        $this->postJson('/api/texts', ['content' => 'лишний'])
            ->assertStatus(422);
    }

    public function test_expired_subscription_falls_back_to_free(): void
    {
        Setting::set('limit_texts_free', 1);

        $user = User::factory()->create([
            'plan'                 => 'standard',
            'subscription_ends_at' => Carbon::now()->subDay(),
        ]);

        Sanctum::actingAs($user);

        $this->postJson('/api/texts', ['content' => 'первый'])
            ->assertCreated();

        $this->postJson('/api/texts', ['content' => 'второй'])
            ->assertStatus(422);
    }

    public function test_vocabulary_limit_blocks_new_words(): void
    {
        Setting::set('limit_vocab_free', 2);

        $user = User::factory()->create(['plan' => 'free']);

        Sanctum::actingAs($user);

        $this->postJson('/api/vocabulary', ['surface' => '犬', 'base_form' => '犬'])
            ->assertCreated();
        $this->postJson('/api/vocabulary', ['surface' => '猫', 'base_form' => '猫'])
            ->assertCreated();

        $this->postJson('/api/vocabulary', ['surface' => '鳥', 'base_form' => '鳥'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('base_form');
    }

    public function test_vocabulary_limit_allows_updating_existing_word(): void
    {
        Setting::set('limit_vocab_free', 1);

        $user = User::factory()->create(['plan' => 'free']);
        VocabularyItem::create([
            'user_id' => $user->id,
            'surface' => '犬',
            'base_form' => '犬',
        ]);

        Sanctum::actingAs($user);

        // Обновление существующего слова не считается новым
        $this->postJson('/api/vocabulary', [
            'surface'     => '犬',
            'base_form'   => '犬',
            'translation' => 'собака',
        ])->assertCreated();

        $this->assertDatabaseCount('vocabulary_items', 1);
    }
}
