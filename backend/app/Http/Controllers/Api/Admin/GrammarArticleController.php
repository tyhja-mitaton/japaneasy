<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GrammarArticle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GrammarArticleController extends Controller
{
    public function index(): JsonResponse
    {
        $articles = GrammarArticle::with('author:id,name')
            ->orderBy('created_at', 'desc')
            ->get(['id', 'title', 'code', 'info', 'pattern', 'author_id', 'created_at', 'updated_at']);

        return response()->json($articles);
    }

    public function show(GrammarArticle $grammarArticle): JsonResponse
    {
        return response()->json($grammarArticle->load('author:id,name'));
    }

    public function showByCode(string $code): JsonResponse
    {
        $article = GrammarArticle::where('code', $code)
            ->with('author:id,name')
            ->firstOrFail();

        return response()->json($article);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'code'  => ['required', 'string', 'max:100', 'unique:grammar_articles,code', 'regex:/^[a-z0-9\-]+$/'],
            'pattern' => ['required', 'string', 'max:100'],
            'info'  => ['nullable', 'string', 'max:500'],
            'text'  => ['required', 'string'],
        ]);

        $article = GrammarArticle::create([
            ...$data,
            'author_id' => $request->user()->id,
        ]);

        return response()->json($article->load('author:id,name'), 201);
    }

    public function update(Request $request, GrammarArticle $grammarArticle): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'code'  => ['sometimes', 'string', 'max:100', 'regex:/^[a-z0-9\-]+$/',
                        "unique:grammar_articles,code,{$grammarArticle->id}"],
            'pattern' => ['required', 'string', 'max:100'],
            'info'  => ['nullable', 'string', 'max:500'],
            'text'  => ['sometimes', 'string'],
        ]);

        $grammarArticle->update($data);

        return response()->json($grammarArticle->fresh('author:id,name'));
    }

    public function destroy(GrammarArticle $grammarArticle): JsonResponse
    {
        $grammarArticle->delete();

        return response()->json(['message' => 'Article deleted.']);
    }
}
