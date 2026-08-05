<?php

namespace Tests\Feature;

use App\Models\Feedback;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FeedbackTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('user', 'web');
        Role::findOrCreate('manager', 'web');
        Role::findOrCreate('administrator', 'web');
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->assignRole('administrator');

        return $admin;
    }

    public function test_guest_can_submit_feedback(): void
    {
        $response = $this->postJson('/api/feedback', [
            'email'   => 'guest@example.com',
            'message' => 'Отличный сервис!',
        ]);

        $response->assertCreated()
            ->assertJsonPath('feedback.email', 'guest@example.com');

        $this->assertDatabaseHas('feedback', [
            'email'   => 'guest@example.com',
            'message' => 'Отличный сервис!',
        ]);
    }

    public function test_guest_feedback_requires_email(): void
    {
        $this->postJson('/api/feedback', ['message' => 'Без почты'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_authed_user_uses_profile_email_and_meta_is_filled(): void
    {
        Setting::set('plan_standard_price', 300);
        $user = User::factory()->create([
            'email' => 'me@example.com',
            'plan'  => 'free',
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/feedback', ['message' => 'Всё работает!']);

        $response->assertCreated()
            ->assertJsonPath('feedback.email', 'me@example.com');

        $feedback = Feedback::first();
        $this->assertSame($user->id, $feedback->meta['user_id']);
        $this->assertSame('free', $feedback->meta['plan']);
        $this->assertStringContainsString("/profile/{$user->id}", $feedback->meta['profile_url']);
        $this->assertArrayHasKey('user_agent', $feedback->meta);
    }

    public function test_authed_user_cannot_override_email(): void
    {
        $user = User::factory()->create(['email' => 'real@example.com']);
        Sanctum::actingAs($user);

        $this->postJson('/api/feedback', [
            'email'   => 'fake@example.com',
            'message' => 'Попытка подмены',
        ])->assertStatus(422);
    }

    public function test_authed_user_with_bearer_token_does_not_need_email(): void
    {
        $user = User::factory()->create(['email' => 'token@example.com']);
        $token = $user->createToken('test')->plainTextToken;

        $this->postJson(
            '/api/feedback',
            ['message' => 'С токеном'],
            ['Authorization' => 'Bearer ' . $token]
        )->assertCreated()
            ->assertJsonPath('feedback.email', 'token@example.com')
            ->assertJsonPath('feedback.meta.user_id', $user->id);
    }

    public function test_feedback_message_is_required(): void
    {
        $this->postJson('/api/feedback', ['email' => 'a@b.c'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('message');
    }

    public function test_admin_can_list_feedback(): void
    {
        Feedback::factory()->count(12)->create();

        Sanctum::actingAs($this->admin());

        $response = $this->getJson('/api/admin/feedback');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [[
                    'id', 'email', 'message', 'admin_reply', 'replied_at', 'meta', 'created_at',
                ]],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $this->assertSame(10, $response->json('meta.per_page'));
        $this->assertSame(12, $response->json('meta.total'));
        $this->assertCount(10, $response->json('data'));
    }

    public function test_admin_can_filter_new_feedback(): void
    {
        Feedback::factory()->count(3)->create();
        Feedback::factory()->create(['replied_at' => now()]);

        Sanctum::actingAs($this->admin());

        $response = $this->getJson('/api/admin/feedback?filter=new');

        $response->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_admin_can_reply_and_email_is_sent(): void
    {
        $feedback = Feedback::factory()->create();

        Sanctum::actingAs($this->admin());

        $this->postJson("/api/admin/feedback/{$feedback->id}/reply", [
            'reply' => 'Спасибо за отзыв!',
        ])->assertOk()
            ->assertJsonPath('admin_reply', 'Спасибо за отзыв!')
            ->assertJsonPath('replied_at', $feedback->fresh()->replied_at->toISOString());

        $this->assertNotNull($feedback->fresh()->replied_at);
    }

    public function test_reply_requires_message(): void
    {
        $feedback = Feedback::factory()->create();

        Sanctum::actingAs($this->admin());

        $this->postJson("/api/admin/feedback/{$feedback->id}/reply", ['reply' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reply');
    }

    public function test_admin_can_show_and_delete_feedback(): void
    {
        $feedback = Feedback::factory()->create();

        Sanctum::actingAs($this->admin());

        $this->getJson("/api/admin/feedback/{$feedback->id}")
            ->assertOk()
            ->assertJsonPath('id', $feedback->id);

        $this->deleteJson("/api/admin/feedback/{$feedback->id}")
            ->assertOk();

        $this->assertDatabaseMissing('feedback', ['id' => $feedback->id]);
    }

    public function test_feedback_admin_routes_require_role(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/admin/feedback')->assertForbidden();
    }

    public function test_feedback_admin_routes_require_auth(): void
    {
        $this->getJson('/api/admin/feedback')->assertUnauthorized();
    }
}
