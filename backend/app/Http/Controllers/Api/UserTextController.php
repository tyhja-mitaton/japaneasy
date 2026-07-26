<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GrammarArticle;
use App\Models\UserText;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class UserTextController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $texts = UserText::where('user_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->get(['id', 'title', 'created_at', 'updated_at']);

        return response()->json($texts);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'content' => ['required', 'string', 'max:50000'],
            'title'   => ['nullable', 'string', 'max:255'],
        ]);

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
