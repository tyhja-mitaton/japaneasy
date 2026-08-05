<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GrammarArticle;
use App\Models\UserText;
use App\Services\PlanLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class UserTextController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->input('search', ''));

        $texts = UserText::where('user_id', $request->user()->id)
            ->when($search !== '', function ($query) use ($search) {
                // ILIKE на Postgres — регистронезависимо; LIKE на SQLite (тесты)
                $op   = $query->getConnection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';
                $like = "%{$search}%";

                return $query->where(fn ($query) => $query
                    ->where('title', $op, $like)
                    ->orWhere('content', $op, $like));
            })
            ->orderBy('created_at', 'desc')
            ->paginate((int) $request->input('per_page', 10), [
                'id', 'title', 'created_at', 'updated_at',
            ])
            ->withQueryString();

        return response()->json([
            'data' => $texts->items(),
            'meta' => [
                'current_page' => $texts->currentPage(),
                'last_page'    => $texts->lastPage(),
                'per_page'     => $texts->perPage(),
                'total'        => $texts->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'content' => ['required', 'string', 'max:50000'],
            'title'   => ['nullable', 'string', 'max:255'],
        ]);

        PlanLimits::checkTexts($request->user());

        // Если заголовок не передан — берём первые 50 символов текста
        $title = $data['title'] ?? mb_substr(trim($data['content']), 0, 50);

        $text = UserText::create([
            'user_id' => $request->user()->id,
            'title'   => $title,
            'content' => $data['content'],
        ]);

        return response()->json($text, 201);
    }

    public function show(Request $request, UserText $userText): JsonResponse
    {
        if ($userText->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json($userText);
    }

    public function update(Request $request, UserText $userText): JsonResponse
    {
        if ($userText->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'content' => ['nullable', 'string', 'max:50000'],
            'title'   => ['nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('title', $data)) {
            $userText->title = $data['title'];
        }
        if (array_key_exists('content', $data)) {
            $userText->content = $data['content'];
        }
        $userText->save();

        return response()->json($userText);
    }

    public function destroy(Request $request, UserText $userText): JsonResponse
    {
        if ($userText->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $userText->delete();

        return response()->json(['message' => 'Text deleted.']);
    }

    // Токенизация текста через NLP-сервис
    public function tokenize(Request $request, UserText $userText): JsonResponse
    {
        if ($userText->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $nlpResponse = Http::timeout(30)
            ->post(config('services.nlp.url') . '/tokenize', [
                'text' => $userText->content,
            ]);

        if ($nlpResponse->failed()) {
            return response()->json(['error' => 'NLP service unavailable'], 503);
        }

        return response()->json($nlpResponse->json());
    }

    // Грамматический анализ через NLP-сервис
    public function grammar(Request $request, UserText $userText): JsonResponse
    {
        if ($userText->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Загружаем все паттерны из БД и передаём в NLP-сервис
        $patterns = GrammarArticle::whereNotNull('pattern')
            ->where('pattern', '!=', '')
            ->get(['code', 'pattern'])
            ->toArray();


        $nlpResponse = Http::timeout(30)
            ->post(config('services.nlp.url') . '/grammar', [
                'text' => $userText->content,
                'patterns' => $patterns,
            ]);
        //return response()->json($nlpResponse);


        if ($nlpResponse->failed()) {
            return response()->json(['error' => 'NLP service unavailable'], 503);
        }

        return response()->json($nlpResponse->json());
    }
}
