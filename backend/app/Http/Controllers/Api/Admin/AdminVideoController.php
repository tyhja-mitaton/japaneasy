<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Subtitle;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminVideoController extends Controller
{
    public function index(): JsonResponse
    {
        $videos = Video::with('subtitles')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (Video $v) => [
                'id'           => $v->id,
                'title'        => $v->title,
                'is_published' => $v->is_published,
                'duration_formatted' => $v->duration_formatted,
                'subtitles_count'    => $v->subtitles->count(),
                'thumbnail_url'      => $v->thumbnail_url,
                'created_at'         => $v->created_at,
            ]);

        return response()->json($videos);
    }

    public function show(Video $video): JsonResponse
    {
        return response()->json([
            'id'           => $video->id,
            'title'        => $video->title,
            'description'  => $video->description,
            'is_published' => $video->is_published,
            'video_url'    => $video->video_url,
            'thumbnail_url'=> $video->thumbnail_url,
            'duration'     => $video->duration,
            'subtitles'    => $video->subtitles->map(fn ($s) => [
                'id'       => $s->id,
                'label'    => $s->label,
                'language' => $s->language,
                'url'      => $s->url,
                'is_default' => $s->is_default,
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'video'       => ['required', 'file', 'mimetypes:video/mp4,video/webm,video/ogg', 'max:2097152'], // 2GB
            'thumbnail'   => ['nullable', 'image', 'max:5120'],
            'is_published'=> ['sometimes', 'boolean'],
        ]);

        $videoPath = $request->file('video')->store(
            'videos/' . date('Y/m'),
            'local'
        );

        $thumbnailPath = null;
        if ($request->hasFile('thumbnail')) {
            $thumbnailPath = $request->file('thumbnail')->store('thumbnails', 'public');
        }

        $video = Video::create([
            'title'        => $data['title'],
            'description'  => $data['description'] ?? null,
            'file_path'    => $videoPath,
            'thumbnail_path' => $thumbnailPath,
            'is_published' => $data['is_published'] ?? false,
            'uploaded_by'  => $request->user()->id,
        ]);

        return response()->json(['id' => $video->id, 'title' => $video->title], 201);
    }

    public function update(Request $request, Video $video): JsonResponse
    {
        $data = $request->validate([
            'title'        => ['sometimes', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'is_published' => ['sometimes', 'boolean'],
            'thumbnail'    => ['nullable', 'image', 'max:5120'],
        ]);

        if ($request->hasFile('thumbnail')) {
            if ($video->thumbnail_path) {
                Storage::disk('public')->delete($video->thumbnail_path);
            }
            $data['thumbnail_path'] = $request->file('thumbnail')->store('thumbnails', 'public');
        }

        $video->update($data);

        return response()->json(['message' => 'Updated.']);
    }

    public function destroy(Video $video): JsonResponse
    {
        Storage::disk('local')->delete($video->file_path);
        if ($video->thumbnail_path) {
            Storage::disk('public')->delete($video->thumbnail_path);
        }
        $video->subtitles->each(fn ($s) => Storage::disk('local')->delete($s->file_path));
        $video->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    // ── Субтитры ──────────────────────────────────────────────────────────────

    public function uploadSubtitle(Request $request, Video $video): JsonResponse
    {
        $data = $request->validate([
            'label'      => ['required', 'string', 'max:50'],   // "日本語"
            'language'   => ['required', 'string', 'max:10'],   // "jp"
            'subtitle'   => ['required', 'file', 'mimetypes:text/vtt,text/plain,application/x-srt,application/x-subrip,text/x-srt,application/octet-stream', 'max:10240'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $file     = $request->file('subtitle');
        $content  = file_get_contents($file->getRealPath());

        // Конвертируем SRT → VTT если нужно
        if ($this->isSrt($content)) {
            $content = $this->srtToVtt($content);
        }

        $path = 'subtitles/' . $video->id . '/' . Str::slug($data['label']) . '-' . time() . '.vtt';
        Storage::disk('local')->put($path, $content);

        if ($data['is_default'] ?? false) {
            $video->subtitles()->update(['is_default' => false]);
        }

        $subtitle = Subtitle::create([
            'video_id'   => $video->id,
            'label'      => $data['label'],
            'language'   => $data['language'],
            'file_path'  => $path,
            'is_default' => $data['is_default'] ?? false,
        ]);

        return response()->json([
            'id'       => $subtitle->id,
            'label'    => $subtitle->label,
            'language' => $subtitle->language,
            'url'      => $subtitle->url,
        ], 201);
    }

    public function destroySubtitle(Video $video, Subtitle $subtitle): JsonResponse
    {
        Storage::disk('local')->delete($subtitle->file_path);
        $subtitle->delete();
        return response()->json(['message' => 'Subtitle deleted.']);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function isSrt(string $content): bool
    {
        return !str_starts_with(trim($content), 'WEBVTT');
    }

    private function srtToVtt(string $srt): string
    {
        $vtt = "WEBVTT\n\n";
        // Заменяем запятые в таймкодах на точки: 00:00:01,500 → 00:00:01.500
        $srt = preg_replace('/(\d{2}:\d{2}:\d{2}),(\d{3})/', '$1.$2', $srt);
        // Убираем номера реплик (строки состоящие только из цифр)
        $srt = preg_replace('/^\d+\s*$/m', '', $srt);
        $vtt .= trim($srt);
        return $vtt;
    }
}
