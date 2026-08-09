<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Video;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class VideoAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('user', 'web');
        Role::findOrCreate('manager', 'web');
        Role::findOrCreate('administrator', 'web');
    }

    private function premiumUser(): User
    {
        return User::factory()->create([
            'plan'                 => 'premium',
            'subscription_ends_at' => Carbon::now()->addMonth(),
        ]);
    }

    private function freeUser(): User
    {
        return User::factory()->create(['plan' => 'free']);
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['plan' => 'free']);
        $admin->assignRole('administrator');

        return $admin;
    }

    private function createVideo(): Video
    {
        return Video::factory()->create();
    }

    public function test_guest_cannot_list_videos(): void
    {
        $this->getJson('/api/videos')
            ->assertStatus(401);
    }

    public function test_free_user_cannot_list_videos(): void
    {
        Sanctum::actingAs($this->freeUser());

        $this->getJson('/api/videos')
            ->assertStatus(403);
    }

    public function test_free_user_cannot_view_video(): void
    {
        Sanctum::actingAs($this->freeUser());

        $video = $this->createVideo();

        $this->getJson("/api/videos/{$video->id}")
            ->assertStatus(403);
    }

    public function test_premium_user_can_list_videos(): void
    {
        Sanctum::actingAs($this->premiumUser());

        $this->createVideo();

        $this->getJson('/api/videos')
            ->assertOk();
    }

    public function test_premium_user_can_view_published_video(): void
    {
        Sanctum::actingAs($this->premiumUser());

        $video = $this->createVideo();

        $this->getJson("/api/videos/{$video->id}")
            ->assertOk()
            ->assertJsonPath('id', $video->id)
            ->assertJsonPath('title', $video->title);
    }

    public function test_premium_user_cannot_view_unpublished_video(): void
    {
        Sanctum::actingAs($this->premiumUser());

        $video = Video::factory()->unpublished()->create();

        $this->getJson("/api/videos/{$video->id}")
            ->assertStatus(404);
    }

    public function test_expired_premium_subscription_is_blocked(): void
    {
        $user = User::factory()->create([
            'plan'                 => 'premium',
            'subscription_ends_at' => Carbon::now()->subDay(),
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/videos')
            ->assertStatus(403);
    }

    public function test_non_premium_admin_can_preview_videos(): void
    {
        Sanctum::actingAs($this->admin());

        $video = $this->createVideo();

        $this->getJson('/api/videos')->assertOk();
        $this->getJson("/api/videos/{$video->id}")->assertOk();
    }

    public function test_video_url_is_a_signed_stream_link(): void
    {
        Sanctum::actingAs($this->premiumUser());

        $video = $this->createVideo();

        $this->getJson("/api/videos/{$video->id}")
            ->assertOk()
            ->assertJsonPath('video_url', URL::temporarySignedRoute('videos.stream', now()->addMinutes(30), ['video' => $video->id], false));
    }

    public function test_free_user_cannot_fetch_subtitle(): void
    {
        Sanctum::actingAs($this->freeUser());

        $video    = $this->createVideo();
        $subtitle = $video->subtitles()->create([
            'label'    => '日本語',
            'language' => 'jp',
            'file_path' => 'subtitles/fake.vtt',
        ]);

        $this->getJson("/api/videos/{$video->id}/subtitles/{$subtitle->id}")
            ->assertStatus(403);
    }

    public function test_premium_user_can_fetch_subtitle(): void
    {
        Sanctum::actingAs($this->premiumUser());

        $video = $this->createVideo();
        $subtitle = $video->subtitles()->create([
            'label'    => '日本語',
            'language' => 'jp',
            'file_path' => 'subtitles/sample.vtt',
        ]);

        Storage::disk('local')->put('subtitles/sample.vtt', "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nおはようございます\n");

        $this->get("/api/videos/{$video->id}/subtitles/{$subtitle->id}")
            ->assertOk()
            ->assertHeader('Content-Type', 'text/vtt; charset=UTF-8')
            ->assertSee('おはようございます');
    }

    public function test_premium_user_cannot_fetch_subtitle_of_unpublished_video(): void
    {
        Sanctum::actingAs($this->premiumUser());

        $video = Video::factory()->unpublished()->create();
        $subtitle = $video->subtitles()->create([
            'label'    => '日本語',
            'language' => 'jp',
            'file_path' => 'subtitles/sample.vtt',
        ]);

        $this->getJson("/api/videos/{$video->id}/subtitles/{$subtitle->id}")
            ->assertStatus(404);
    }

    public function test_stream_requires_valid_signature(): void
    {
        $video = $this->createVideo();
        Storage::disk('local')->put($video->file_path, 'fake-video-bytes');

        // Без подписи — 403
        $this->get("/api/videos/{$video->id}/stream")
            ->assertStatus(403);

        // С подписанной ссылкой — 200 и тело файла
        $signed = URL::temporarySignedRoute('videos.stream', now()->addMinutes(30), ['video' => $video->id], false);
        $this->get($signed)
            ->assertOk()
            ->assertStreamedContent('fake-video-bytes');
    }

    public function test_stream_with_expired_signature_is_blocked(): void
    {
        $video = $this->createVideo();
        Storage::disk('local')->put($video->file_path, 'fake-video-bytes');

        $signed = URL::temporarySignedRoute('videos.stream', now()->subMinute(), ['video' => $video->id], false);
        $this->get($signed)
            ->assertStatus(403);
    }

    public function test_stream_of_unpublished_video_is_blocked(): void
    {
        $video = Video::factory()->unpublished()->create();
        Storage::disk('local')->put($video->file_path, 'fake-video-bytes');

        $signed = URL::temporarySignedRoute('videos.stream', now()->addMinutes(30), ['video' => $video->id], false);
        $this->get($signed)
            ->assertStatus(404);
    }
}
