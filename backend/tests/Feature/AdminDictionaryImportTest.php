<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminDictionaryImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('user', 'web');
        Role::findOrCreate('manager', 'web');
        Role::findOrCreate('administrator', 'web');

        Queue::fake();
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['country' => 'RU']);
        $admin->assignRole('administrator');

        return $admin;
    }

    public function test_import_from_outside_storage_is_rejected(): void
    {
        Sanctum::actingAs($this->admin());

        $response = $this->postJson('/api/admin/dictionaries/import', [
            'path' => '/etc',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Path outside dictionary storage is not allowed');

        Queue::assertNothingPushed();
    }

    public function test_import_from_relative_path_escaping_storage_is_rejected(): void
    {
        Sanctum::actingAs($this->admin());

        $response = $this->postJson('/api/admin/dictionaries/import', [
            'path' => storage_path('dictionaries/../../config'),
        ]);

        $response->assertStatus(422);
        Queue::assertNothingPushed();
    }

    public function test_import_from_valid_dictionary_dir_is_queued(): void
    {
        $dir = storage_path('dictionaries/test-dict-' . uniqid());
        mkdir($dir, 0777, true);
        file_put_contents("{$dir}/index.json", json_encode(['title' => 'Test Dictionary (Russian)']));
        file_put_contents("{$dir}/term_bank_1.json", '[]');

        Sanctum::actingAs($this->admin());

        $response = $this->postJson('/api/admin/dictionaries/import', [
            'path' => $dir,
        ]);

        $response->assertStatus(202);

        $pushed = Queue::pushed(\App\Jobs\ImportDictionaryJob::class);
        $this->assertCount(1, $pushed);

        $job = $pushed[0];

        $reflection = new \ReflectionClass($job);
        $path = $reflection->getProperty('path');
        $this->assertSame($dir, $path->getValue($job));

        @unlink("{$dir}/index.json");
        @unlink("{$dir}/term_bank_1.json");
        @rmdir($dir);
    }
}
