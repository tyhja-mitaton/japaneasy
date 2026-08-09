<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subtitle;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VideoController extends Controller
{
    public function index(): JsonResponse
    {
        $videos = Video::where('is_published', true)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Video $v) => [
                'id'            => $v->id,
                'title'         => $v->title,
                'description'   => $v->description,
                'thumbnail_url' => $v->thumbnail_url,
                'duration'      => $v->duration,
                'duration_formatted' => $v->duration_formatted,
                'created_at'    => $v->created_at,
            ]);

        return response()->json($videos);
    }

    public function show(Video $video): JsonResponse
    {
        if (!$video->is_published) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json([
            'id'            => $video->id,
            'title'         => $video->title,
            'description'   => $video->description,
            'video_url'     => $video->video_url,
            'thumbnail_url' => $video->thumbnail_url,
            'duration'      => $video->duration,
            'subtitles'     => $video->subtitles->map(fn ($s) => [
                'id'         => $s->id,
                'label'      => $s->label,
                'language'   => $s->language,
                'url'        => $s->url,
                'is_default' => $s->is_default,
            ]),
        ]);
    }

    public function subtitle(Video $video, Subtitle $subtitle): JsonResponse|\Illuminate\Http\Response
    {
        if (!$video->is_published || $subtitle->video_id !== $video->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $disk = Storage::disk('local');

        if (!$disk->exists($subtitle->file_path)) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response($disk->get($subtitle->file_path), 200, [
            'Content-Type' => 'text/vtt; charset=UTF-8',
        ]);
    }

    /**
     * Потоковая передача видео по временной подписанной ссылке.
     * Публичный маршрут (без auth) — защита за счёт подписи: <video> не может
     * слать Authorization-заголовок. Срок жизни подписи — 30 минут.
     */
    public function stream(Video $video, Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        if (!$request->hasValidRelativeSignature()) {
            abort(403, 'Invalid or expired stream link');
        }

        if (!$video->is_published) {
            abort(404);
        }

        $disk = Storage::disk('local');

        if (!$video->file_path || !$disk->exists($video->file_path)) {
            abort(404);
        }

        // BinaryFileResponse сам обрабатывает Range-запросы (перемотка)
        return new \Symfony\Component\HttpFoundation\BinaryFileResponse(
            $disk->path($video->file_path),
            200,
            [
                'Content-Type'        => $disk->mimeType($video->file_path) ?: 'application/octet-stream',
                'Content-Disposition' => 'inline',
                'Cache-Control'       => 'private, no-store',
            ],
            true,
            'inline',
        );
    }
}
