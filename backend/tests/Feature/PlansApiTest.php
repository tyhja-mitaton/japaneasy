<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Models\UserText;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlansApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_plans_expose_limits_from_settings(): void
    {
        Setting::set('limit_texts_free', 5);
        Setting::set('limit_vocab_standard', 1000);

        $response = $this->getJson('/api/plans');

        $response->assertOk();

        $plans = collect($response->json('plans'));

        $free = $plans->firstWhere('id', 'free');
        $this->assertSame(5, $free['limits']['texts']);
        $this->assertContains('До 5 текстов в месяц', $free['features']);

        $standard = $plans->firstWhere('id', 'standard');
        $this->assertSame(1000, $standard['limits']['vocabulary']);

        $premium = $plans->firstWhere('id', 'premium');
        $this->assertNull($premium['limits']['texts']);
        $this->assertContains('Безлимит текстов в месяц', $premium['features']);
    }

    public function test_plans_prices_come_from_settings(): void
    {
        Setting::set('plan_standard_price', 399);

        $response = $this->getJson('/api/plans');

        $this->assertSame(
            399,
            collect($response->json('plans'))->firstWhere('id', 'standard')['price']
        );
    }

    public function test_plans_localize_features_for_english(): void
    {
        Setting::set('limit_texts_free', 5);
        Setting::set('limit_vocab_standard', 1000);

        $response = $this->getJson('/api/plans?lang=en');

        $response->assertOk();

        $plans = collect($response->json('plans'));

        $free = $plans->firstWhere('id', 'free');
        $this->assertContains('Up to 5 texts per month', $free['features']);

        $standard = $plans->firstWhere('id', 'standard');
        $this->assertContains('Vocabulary up to 1000 words', $standard['features']);

        $premium = $plans->firstWhere('id', 'premium');
        $this->assertContains('Unlimited texts per month', $premium['features']);
        $this->assertContains('Unlimited vocabulary', $premium['features']);
    }

    public function test_plans_keep_russian_features_by_default(): void
    {
        Setting::set('limit_texts_standard', 50);

        $response = $this->getJson('/api/plans');

        $standard = collect($response->json('plans'))->firstWhere('id', 'standard');
        $this->assertContains('До 50 текстов в месяц', $standard['features']);
        $this->assertSame('RUB', $standard['currency']);
    }

    public function test_plans_convert_prices_to_usd_for_english(): void
    {
        Setting::set('plan_standard_price', 900);
        Setting::set('plan_premium_price', 1800);
        Setting::set('usd_rate', 90);

        $response = $this->getJson('/api/plans?lang=en');

        $response->assertOk();

        $plans = collect($response->json('plans'));

        $standard = $plans->firstWhere('id', 'standard');
        $this->assertEqualsWithDelta(10.0, $standard['price'], 0.001);
        $this->assertSame('USD', $standard['currency']);

        $premium = $plans->firstWhere('id', 'premium');
        $this->assertEqualsWithDelta(20.0, $premium['price'], 0.001);
        $this->assertSame('USD', $premium['currency']);

        $free = $plans->firstWhere('id', 'free');
        $this->assertSame(0, $free['price']);
        $this->assertSame('USD', $free['currency']);
    }

    public function test_auth_me_includes_usage(): void
    {
        Setting::set('limit_texts_free', 5);
        Setting::set('limit_vocab_free', 100);

        $user = User::factory()->create(['plan' => 'free']);
        UserText::create(['user_id' => $user->id, 'title' => '1', 'content' => 'a']);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/me');

        $response->assertOk();

        $usage = $response->json('usage');
        $this->assertSame(1, $usage['texts']['used']);
        $this->assertSame(5, $usage['texts']['limit']);
        $this->assertNotNull($usage['texts']['period_start']);
        $this->assertSame(0, $usage['vocabulary']['used']);
        $this->assertSame(100, $usage['vocabulary']['limit']);
    }

    public function test_auth_me_usage_limit_null_means_unlimited(): void
    {
        Setting::set('limit_texts_premium', 0);

        $user = User::factory()->create([
            'plan'                 => 'premium',
            'subscription_period'  => '3m',
            'subscription_ends_at' => Carbon::now()->addMonths(3),
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/auth/me');

        $this->assertNull($response->json('usage.texts.limit'));
    }
}
