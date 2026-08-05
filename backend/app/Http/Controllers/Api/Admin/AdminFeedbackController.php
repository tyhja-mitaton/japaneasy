<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Mail\FeedbackReply;
use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class AdminFeedbackController extends Controller
{
    /**
     * Список обращений с пагинацией.
     * GET /api/admin/feedback?page=1&search=...&filter=new|all
     */
    public function index(Request $request): JsonResponse
    {
        $search  = mb_strtolower(trim((string) $request->input('search', '')));
        $filter  = $request->input('filter', 'all');
        $perPage = 10;

        $feedback = Feedback::query()
            ->when($filter === 'new', fn ($query) => $query->whereNull('replied_at'))
            ->when($search !== '', function ($query) use ($search) {
                $like = "%{$search}%";

                return $query->where(function ($query) use ($like) {
                    $query->whereRaw('LOWER(email) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(message) LIKE ?', [$like]);
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage, [
                'id', 'email', 'message', 'admin_reply', 'replied_at', 'meta', 'created_at',
            ], 'page', $request->input('page', 1));

        $data = $feedback->getCollection()->map(fn (Feedback $item) => $this->resource($item));

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $feedback->currentPage(),
                'last_page'    => $feedback->lastPage(),
                'per_page'     => $feedback->perPage(),
                'total'        => $feedback->total(),
            ],
        ]);
    }

    /**
     * Одно обращение.
     * GET /api/admin/feedback/{feedback}
     */
    public function show(Feedback $feedback): JsonResponse
    {
        return response()->json($this->resource($feedback));
    }

    /**
     * Ответ на обращение — отправляется на почту пользователя.
     * POST /api/admin/feedback/{feedback}/reply
     */
    public function reply(Request $request, Feedback $feedback): JsonResponse
    {
        $data = $request->validate([
            'reply' => ['required', 'string', 'max:5000'],
        ]);

        $feedback->update([
            'admin_reply' => $data['reply'],
            'replied_at'  => now(),
        ]);

        Mail::to($feedback->email)->send(new FeedbackReply($feedback));

        return response()->json($this->resource($feedback->fresh()));
    }

    public function destroy(Feedback $feedback): JsonResponse
    {
        $feedback->delete();

        return response()->json(['message' => 'Feedback deleted.']);
    }

    private function resource(Feedback $item): array
    {
        return [
            'id'          => $item->id,
            'email'       => $item->email,
            'message'     => $item->message,
            'admin_reply' => $item->admin_reply,
            'replied_at'  => $item->replied_at?->toISOString(),
            'created_at'  => $item->created_at?->toISOString(),
            'meta'        => $item->meta ?? [],
        ];
    }
}
