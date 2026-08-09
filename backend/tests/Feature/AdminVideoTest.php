<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminVideoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        Storage::fake('local');

        Role::findOrCreate('user', 'web');
        Role::findOrCreate('manager', 'web');
        Role::findOrCreate('administrator', 'web');
    }

    private function manager(): User
    {
        $user = User::factory()->create();
        $user->assignRole('manager');

        return $user;
    }

    private function createVideo(): Video
    {
        return Video::factory()->create();
    }

    public function test_srt_subtitle_upload_is_accepted(): void
    {
        Sanctum::actingAs($this->manager());

        $video = $this->createVideo();

        $srt = "1\n00:00:01,000 --> 00:00:02,500\nおはようございます\n\n2\n00:00:03,000 --> 00:00:04,500\nこんにちは\n";
        $file = UploadedFile::fake()->createWithContent('subtitle.srt', $srt);

        $this->postJson("/api/admin/videos/{$video->id}/subtitles", [
            'label'    => '日本語',
            'language' => 'jp',
            'subtitle' => $file,
        ])->assertStatus(201);

        $this->assertDatabaseCount('subtitles', 1);
    }

    public function test_vtt_subtitle_upload_is_accepted(): void
    {
        Sanctum::actingAs($this->manager());

        $video = $this->createVideo();

        $vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.500\nおはようございます\n";
        $file = UploadedFile::fake()->createWithContent('subtitle.vtt', $vtt);

        $this->postJson("/api/admin/videos/{$video->id}/subtitles", [
            'label'    => '日本語',
            'language' => 'jp',
            'subtitle' => $file,
        ])->assertStatus(201);

        $this->assertDatabaseCount('subtitles', 1);
    }

    public function test_manager_can_toggle_publish_via_post(): void
    {
        Sanctum::actingAs($this->manager());

        $video = $this->createVideo();

        $this->postJson("/api/admin/videos/{$video->id}", [
            'is_published' => true,
        ])->assertOk();

        $this->assertTrue($video->fresh()->is_published);
    }
}
