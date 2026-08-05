<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Dictionary;
use App\Models\UserDictionaryPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserDictionaryPreferenceController extends Controller
{
    /**
     * Список словарей с пользовательскими настройками.
     */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $prefs = UserDictionaryPreference::where('user_id', $user->id)
            ->pluck('is_enabled', 'dictionary_id')
            ->toArray();

        $priorities = UserDictionaryPreference::where('user_id', $user->id)
            ->pluck('priority', 'dictionary_id')
            ->toArray();

        $dictionaries = Dictionary::where('is_active', true)
            ->get()
            ->map(function ($dict) use ($prefs, $priorities, $user) {
                $hasPrefs = isset($prefs[$dict->id]);

                return [
                    'id'           => $dict->id,
                    'name'         => $dict->name,
                    'slug'         => $dict->slug,
                    'target_lang'  => $dict->target_lang,
                    'entries_count'=> $dict->entries_count,
                    'is_enabled'   => $hasPrefs ? $prefs[$dict->id] : true,
                    'priority'     => $priorities[$dict->id] ?? $dict->default_priority,
                ];
            })
            ->sortBy('priority')
            ->values();

        return response()->json($dictionaries);
    }

    /**
     * Сохранить порядок и настройки словарей.
     * POST /api/profile/dictionaries
     * { "dictionaries": [{ "id": 1, "priority": 0, "is_enabled": true }, ...] }
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'dictionaries'             => ['required', 'array'],
            'dictionaries.*.id'        => ['required', 'integer', 'exists:dictionaries,id'],
            'dictionaries.*.priority'  => ['required', 'integer', 'min:0'],
            'dictionaries.*.is_enabled'=> ['required', 'boolean'],
        ]);

        $user = $request->user();

        foreach ($data['dictionaries'] as $item) {
            UserDictionaryPreference::updateOrCreate(
                ['user_id' => $user->id, 'dictionary_id' => $item['id']],
                ['priority' => $item['priority'], 'is_enabled' => $item['is_enabled']]
            );
        }

        return response()->json(['message' => 'Preferences saved.']);
    }
}
