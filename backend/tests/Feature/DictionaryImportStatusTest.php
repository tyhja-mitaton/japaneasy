<?php

namespace Tests\Feature;

use App\Models\Dictionary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DictionaryImportStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_status_fields_are_persisted_on_create_and_update(): void
    {
        $dictionary = Dictionary::create([
            'name'             => 'JMdict RU',
            'slug'             => 'jmdict-ru',
            'source_lang'      => 'jp',
            'target_lang'      => 'ru',
            'is_active'        => false,
            'default_priority' => 0,
            'entries_count'    => 0,
            'import_status'    => 'pending',
            'import_progress'  => 0,
            'import_path'      => '/var/www/storage/dictionaries/jmdict-ru',
        ]);

        $fresh = $dictionary->fresh();
        $this->assertSame('pending', $fresh->import_status);
        $this->assertSame(0, $fresh->import_progress);
        $this->assertSame('/var/www/storage/dictionaries/jmdict-ru', $fresh->import_path);

        $dictionary->update([
            'import_status'   => 'processing',
            'import_progress' => 42,
        ]);

        $fresh = $dictionary->fresh();
        $this->assertSame('processing', $fresh->import_status);
        $this->assertSame(42, $fresh->import_progress);

        $dictionary->update([
            'import_status'   => 'completed',
            'import_progress' => 100,
            'entries_count'   => 1000,
            'is_active'       => true,
        ]);

        $fresh = $dictionary->fresh();
        $this->assertSame('completed', $fresh->import_status);
        $this->assertSame(100, $fresh->import_progress);
        $this->assertSame(1000, $fresh->entries_count);
        $this->assertTrue($fresh->is_active);
    }
}
