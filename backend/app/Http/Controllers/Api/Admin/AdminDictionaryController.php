<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ImportDictionaryJob;
use App\Models\Dictionary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDictionaryController extends Controller
{
    public function index(): JsonResponse
    {
        $dictionaries = Dictionary::orderBy('default_priority')->get([
            'id', 'name', 'slug', 'source_lang', 'target_lang',
            'is_active', 'default_priority', 'entries_count',
            'import_status', 'import_progress', 'import_error', 'import_path',
        ]);

        return response()->json($dictionaries);
    }

    public function show(Dictionary $dictionary): JsonResponse
    {
        return response()->json([
            'id'              => $dictionary->id,
            'name'            => $dictionary->name,
            'slug'            => $dictionary->slug,
            'import_status'   => $dictionary->import_status,
            'import_progress' => $dictionary->import_progress,
            'import_error'    => $dictionary->import_error,
            'entries_count'   => $dictionary->entries_count,
            'is_active'       => $dictionary->is_active,
        ]);
    }

    /**
     * Запустить импорт словаря из папки на сервере.
     * POST /api/admin/dictionaries/import
     * Body: { "path": "/var/www/storage/dictionaries/jmdict-ru", "force": false }
     */
    public function import(Request $request): JsonResponse
    {
        $data = $request->validate([
            'path'  => ['required', 'string'],
            'force' => ['sometimes', 'boolean'],
        ]);

        $path = $data['path'];

        // Path allowlist: импортировать можно только из каталога словарей
        $base = realpath(storage_path('dictionaries'));
        $resolved = realpath($path);
        if ($base === false || $resolved === false || !str_starts_with($resolved, $base . DIRECTORY_SEPARATOR)) {
            return response()->json(['message' => "Path outside dictionary storage is not allowed"], 422);
        }

        if (!is_dir($path)) {
            return response()->json(['message' => "Directory not found: {$path}"], 422);
        }
        if (!file_exists("{$path}/index.json")) {
            return response()->json(['message' => "index.json not found in {$path}"], 422);
        }

        // Проверяем не идёт ли уже импорт для этого пути
        $existing = Dictionary::where('import_path', $path)
            ->whereIn('import_status', ['pending', 'processing'])
            ->first();

        if ($existing) {
            return response()->json([
                'message'  => 'Import already in progress.',
                'status'   => $existing->import_status,
                'progress' => $existing->import_progress,
            ], 409);
        }

        ImportDictionaryJob::dispatch($path, $data['force'] ?? false)
            ->onQueue('imports');

        return response()->json([
            'message' => 'Import queued. Monitor progress via GET /api/admin/dictionaries/{id}.',
            'path'    => $path,
        ], 202);
    }

    public function update(Request $request, Dictionary $dictionary): JsonResponse
    {
        $data = $request->validate([
            'is_active'        => ['sometimes', 'boolean'],
            'default_priority' => ['sometimes', 'integer', 'min:0'],
            'name'             => ['sometimes', 'string', 'max:255'],
        ]);

        $dictionary->update($data);

        return response()->json($dictionary);
    }

    public function destroy(Dictionary $dictionary): JsonResponse
    {
        // Запрещаем удалять словарь во время импорта
        if (in_array($dictionary->import_status, ['pending', 'processing'])) {
            return response()->json(['message' => 'Cannot delete dictionary while import is in progress.'], 409);
        }

        $dictionary->delete();

        return response()->json(['message' => 'Dictionary deleted.']);
    }
}
