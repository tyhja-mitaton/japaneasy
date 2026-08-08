<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\GrammarArticle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class GrammarArticleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = 10;
        $page    = $request->input('page', 1);
        $search  = mb_strtolower(trim((string) $request->input('search', '')));

        $articles = GrammarArticle::query()
            ->with('author:id,name')
            ->when($search !== '', function ($query) use ($search) {
                $like = "%{$search}%";

                return $query->where(function ($query) use ($like) {
                    $query->whereRaw('LOWER(title) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(title_en) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(code) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(info) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(info_en) LIKE ?', [$like]);
                });
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['id', 'title', 'title_en', 'code', 'info', 'info_en', 'pattern', 'author_id', 'created_at', 'updated_at'], 'page', $page);

        return response()->json([
            'data' => $articles->items(),
            'meta' => [
                'current_page' => $articles->currentPage(),
                'last_page' => $articles->lastPage(),
                'per_page' => $articles->perPage(),
                'total' => $articles->total(),
            ],
        ]);
    }

    public function show(GrammarArticle $grammarArticle): JsonResponse
    {
        $grammarArticle->load('author:id,name');

        return response()->json([...$grammarArticle->toArray(), 'related_articles' => $this->relatedArticlesPayload($grammarArticle)]);
    }

    /**
     * Публичный эндпоинт — возвращает статью на нужном языке.
     * Язык берётся из: 1) query param ?lang=en  2) заголовка Accept-Language  3) ru по умолчанию
     */
    public function showByCode(Request $request, string $code): JsonResponse
    {
        $article = GrammarArticle::where('code', $code)
            ->with('author:id,name')
            ->firstOrFail();

        $lang = $this->resolveLanguage($request);

        return response()->json($this->localizedArticle($article, $lang));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'title_en' => ['nullable', 'string', 'max:255'],
            'code'  => ['required', 'string', 'max:100', 'unique:grammar_articles,code', 'regex:/^[a-z0-9\-]+$/'],
            'pattern' => ['required', 'string', 'max:100'],
            'info'  => ['nullable', 'string', 'max:500'],
            'info_en'  => ['nullable', 'string', 'max:500'],
            'text'  => ['required', 'string'],
            'text_en'  => ['nullable', 'string'],
            'related_article_ids' => ['sometimes', 'array'],
            'related_article_ids.*' => ['integer', 'exists:grammar_articles,id'],
        ]);

        $relatedIds = Arr::pull($data, 'related_article_ids', []);

        $article = GrammarArticle::create([
            ...$data,
            'author_id' => $request->user()->id,
        ]);

        $this->syncRelated($article, $relatedIds);

        $article->load('author:id,name');

        return response()->json([...$article->toArray(), 'related_articles' => $this->relatedArticlesPayload($article)], 201);
    }

    public function update(Request $request, GrammarArticle $grammarArticle): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'title_en' => ['nullable', 'string', 'max:255'],
            'code'  => ['sometimes', 'string', 'max:100', 'regex:/^[a-z0-9\-]+$/',
                        "unique:grammar_articles,code,{$grammarArticle->id}"],
            'pattern' => ['required', 'string', 'max:100'],
            'info'  => ['nullable', 'string', 'max:500'],
            'info_en'  => ['nullable', 'string', 'max:500'],
            'text'  => ['sometimes', 'string'],
            'text_en'  => ['nullable', 'string'],
            'related_article_ids' => ['sometimes', 'array'],
            'related_article_ids.*' => ['integer', 'exists:grammar_articles,id', 'not_in:' . $grammarArticle->id],
        ]);

        $relatedIds = Arr::pull($data, 'related_article_ids', []);

        $grammarArticle->update($data);
        $this->syncRelated($grammarArticle, $relatedIds);

        $grammarArticle->load('author:id,name');

        return response()->json([...$grammarArticle->toArray(), 'related_articles' => $this->relatedArticlesPayload($grammarArticle)]);
    }

    public function destroy(GrammarArticle $grammarArticle): JsonResponse
    {
        $grammarArticle->delete();

        return response()->json(['message' => 'Article deleted.']);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function resolveLanguage(Request $request): string
    {
        // 1. Явный query param
        if ($request->query('lang') === 'en') return 'en';
        if ($request->query('lang') === 'ru') return 'ru';

        // 2. Язык авторизованного пользователя
        if ($request->user()?->language) {
            return $request->user()->language;
        }

        // 3. Accept-Language заголовок
        $acceptLang = $request->header('Accept-Language', 'ru');
        return str_starts_with($acceptLang, 'en') ? 'en' : 'ru';
    }

    private function localizedArticle(GrammarArticle $article, string $lang): array
    {
        $useEn = $lang === 'en';

        return [
            'id'              => $article->id,
            'code'            => $article->code,
            'pattern'         => $article->pattern,
            'title'           => ($useEn && $article->title_en) ? $article->title_en : $article->title,
            'info'            => ($useEn && $article->info_en)  ? $article->info_en  : $article->info,
            'text'            => ($useEn && $article->text_en)  ? $article->text_en  : $article->text,
            'has_translation' => (bool) $article->text_en,
            'language_used'   => ($useEn && $article->text_en) ? 'en' : 'ru',
            'author'          => $article->author,
            'created_at'      => $article->created_at,
            'updated_at'      => $article->updated_at,
            'related'         => $this->relatedArticlesPayload($article, localized: true, lang: $lang),
        ];
    }

    /**
     * Возвращает связанные статьи. Связи симметричны: пары хранятся в обе стороны.
     */
    private function relatedArticlesPayload(GrammarArticle $article, bool $localized = false, string $lang = 'ru'): array
    {
        $useEn = $lang === 'en';

        return $article->relatedArticles()
            ->get(['grammar_articles.id', 'grammar_articles.code', 'grammar_articles.title', 'grammar_articles.title_en'])
            ->map(function (GrammarArticle $related) use ($localized, $useEn) {
                if ($localized) {
                    return [
                        'id'    => $related->id,
                        'code'  => $related->code,
                        'title' => ($useEn && $related->title_en) ? $related->title_en : $related->title,
                    ];
                }

                return [
                    'id'       => $related->id,
                    'code'     => $related->code,
                    'title'    => $related->title,
                    'title_en' => $related->title_en,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Синхронизирует связанные статьи: удаляет старые связи (в обе стороны) и
     * создаёт новые пары в обе стороны для симметрии.
     */
    private function syncRelated(GrammarArticle $article, array $ids): void
    {
        $ids = array_values(array_unique(array_filter(
            array_map('intval', $ids),
            fn (int $id): bool => $id !== $article->id,
        )));

        DB::table('grammar_article_related')
            ->where('article_id', $article->id)
            ->orWhere('related_article_id', $article->id)
            ->delete();

        if ($ids === []) {
            return;
        }

        $now  = now();
        $rows = [];
        foreach ($ids as $relatedId) {
            $rows[] = ['article_id' => $article->id, 'related_article_id' => $relatedId, 'created_at' => $now, 'updated_at' => $now];
            $rows[] = ['article_id' => $relatedId, 'related_article_id' => $article->id, 'created_at' => $now, 'updated_at' => $now];
        }

        DB::table('grammar_article_related')->insert($rows);
    }

}
