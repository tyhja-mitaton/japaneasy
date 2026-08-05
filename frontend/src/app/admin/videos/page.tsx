'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toApiUrl } from '@/lib/media-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const BLUE = '#2563EB';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

type VideoMeta = {
  id: number; title: string; is_published: boolean;
  duration_formatted: string; subtitles_count: number;
  thumbnail_url: string | null; created_at: string;
};

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export default function AdminVideosPage() {
  const router = useRouter();
  const fileRef      = useRef<HTMLInputElement>(null);
  const thumbRef     = useRef<HTMLInputElement>(null);
  const subtitleRef  = useRef<HTMLInputElement>(null);

  const [videos,       setVideos]       = useState<VideoMeta[]>([]);
  const [showForm,     setShowForm]     = useState(false);
  const [uploadState,  setUploadState]  = useState<UploadState>('idle');
  const [progress,     setProgress]     = useState(0);
  const [form,         setForm]         = useState({ title: '', description: '', is_published: false });

  // Загрузка субтитров
  const [subtitleForm, setSubtitleForm] = useState({ label: '', language: 'jp', is_default: false });
  const [subtitleVideoId, setSubtitleVideoId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch('/api/admin/videos').then(setVideos).catch(() => router.push('/auth/login'));
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    const thumb = thumbRef.current?.files?.[0];
    if (!file) return;

    setUploadState('uploading');
    setProgress(0);

    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('is_published', form.is_published ? '1' : '0');
    fd.append('video', file);
    if (thumb) fd.append('thumbnail', thumb);

    const token = localStorage.getItem('token');

    try {
      // XMLHttpRequest для отслеживания прогресса загрузки
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(xhr.responseText));
        };
        xhr.onerror = reject;
        xhr.open('POST', `${API_URL}/api/admin/videos`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.send(fd);
      });

      setUploadState('done');
      setShowForm(false);
      const updated = await apiFetch('/api/admin/videos');
      setVideos(updated);
    } catch {
      setUploadState('error');
    }
  };

  const handleSubtitleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = subtitleRef.current?.files?.[0];
    if (!file || !subtitleVideoId) return;

    const fd = new FormData();
    fd.append('label', subtitleForm.label);
    fd.append('language', subtitleForm.language);
    fd.append('is_default', subtitleForm.is_default ? '1' : '0');
    fd.append('subtitle', file);

    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/admin/videos/${subtitleVideoId}/subtitles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      body: fd,
    });

    setSubtitleVideoId(null);
    const updated = await apiFetch('/api/admin/videos');
    setVideos(updated);
  };

  const togglePublished = async (v: VideoMeta) => {
    await apiFetch(`/api/admin/videos/${v.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !v.is_published }),
    });
    setVideos(prev => prev.map(x => x.id === v.id ? { ...x, is_published: !x.is_published } : x));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить видео?')) return;
    await apiFetch(`/api/admin/videos/${id}`, { method: 'DELETE' });
    setVideos(prev => prev.filter(v => v.id !== id));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #EDE8E1',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 14,
    fontFamily: "'Noto Sans JP', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    color: '#1A1A1A',
    background: 'white',
  };

  const inputFocus = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = BLUE;
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
  };

  const inputBlur = (e: React.FocusEvent<HTMLElement>) => {
    e.currentTarget.style.borderColor = '#EDE8E1';
    e.currentTarget.style.boxShadow = 'none';
  };

  const blueButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: BLUE,
    color: 'white',
    border: 'none',
    borderRadius: 50,
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(59,130,246,0.1)',
            borderRadius: 50,
            padding: '6px 14px',
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 500,
            color: BLUE,
          }}>
            <span>⚙️</span> Админ-панель
          </div>
          <h1 style={{
            fontFamily: "'Noto Serif JP'",
            fontSize: 'clamp(24px, 3vw, 32px)',
            fontWeight: 700,
            color: '#1A1A1A',
          }}>
            Видео
          </h1>
        </div>
        <button
          onClick={() => setShowForm(p => !p)}
          style={{
            ...blueButtonStyle,
            background: showForm ? '#8B7355' : BLUE,
          }}
          onMouseEnter={e => { if (!showForm) e.currentTarget.style.background = '#1D4ED8'; }}
          onMouseLeave={e => { e.currentTarget.style.background = showForm ? '#8B7355' : BLUE; }}
        >
          <span>{showForm ? '−' : '+'}</span> Загрузить видео
        </button>
      </div>

      {/* Форма загрузки видео */}
      {showForm && (
        <div style={{ background: 'white', border: '1px solid #EDE8E1', borderRadius: 20, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 16 }}>Новое видео</h2>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="text" placeholder="Название" required
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
            />
            <textarea
              placeholder="Описание (необязательно)" rows={2}
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ ...inputStyle, resize: 'vertical' }} onFocus={inputFocus} onBlur={inputBlur}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#8B7355', marginBottom: 6 }}>Видео файл (MP4/WebM)</label>
                <FileField inputRef={fileRef} accept="video/mp4,video/webm,video/ogg" required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#8B7355', marginBottom: 6 }}>Превью (необязательно)</label>
                <FileField inputRef={thumbRef} accept="image/*" />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#555', cursor: 'pointer' }}>
              <input
                type="checkbox" checked={form.is_published}
                onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))}
                style={{ borderRadius: 4 }}
              />
              Опубликовать сразу
            </label>

            {uploadState === 'uploading' && (
              <div>
                <div style={{ height: 8, background: '#F3EFE9', borderRadius: 50, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: BLUE, borderRadius: 50, transition: 'width 0.2s', width: `${progress}%` }} />
                </div>
                <div style={{ fontSize: 12, color: '#B9A88F', marginTop: 6, textAlign: 'right' }}>{progress}%</div>
              </div>
            )}
            {uploadState === 'error' && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(232,96,74,0.08)',
                border: '1px solid rgba(232,96,74,0.25)',
                color: '#D14A35',
                fontSize: 14,
              }}>
                Ошибка загрузки. Попробуйте ещё раз.
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="submit" disabled={uploadState === 'uploading'}
                style={{
                  ...blueButtonStyle,
                  padding: '10px 22px',
                  opacity: uploadState === 'uploading' ? 0.5 : 1,
                  cursor: uploadState === 'uploading' ? 'not-allowed' : 'pointer',
                }}>
                {uploadState === 'uploading' ? `Загружаем… ${progress}%` : 'Загрузить'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, color: '#8B7355', padding: '10px 16px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#1A1A1A'}
                onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Форма загрузки субтитров */}
      {subtitleVideoId && (
        <div style={{ background: 'white', border: '1px solid #EDE8E1', borderRadius: 20, padding: 20, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 12 }}>
            Добавить субтитры к видео #{subtitleVideoId}
          </h2>
          <form onSubmit={handleSubtitleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <input
                type="text" placeholder="Название (日本語)" required
                value={subtitleForm.label}
                onChange={e => setSubtitleForm(p => ({ ...p, label: e.target.value }))}
                style={inputStyle} onFocus={inputFocus} onBlur={inputBlur}
              />
              <select
                value={subtitleForm.language}
                onChange={e => setSubtitleForm(p => ({ ...p, language: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="jp">日本語 (jp)</option>
                <option value="ru">Русский (ru)</option>
                <option value="en">English (en)</option>
              </select>
              <FileField inputRef={subtitleRef} accept=".vtt,.srt,text/vtt,text/plain" required />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: BLUE, cursor: 'pointer' }}>
              <input type="checkbox" checked={subtitleForm.is_default}
                onChange={e => setSubtitleForm(p => ({ ...p, is_default: e.target.checked }))}
                style={{ borderRadius: 4 }} />
              По умолчанию
            </label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button type="submit" style={{ ...blueButtonStyle, padding: '10px 22px' }}>
                Загрузить субтитры
              </button>
              <button type="button" onClick={() => setSubtitleVideoId(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, color: '#8B7355', padding: '10px 16px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#1A1A1A'}
                onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Список видео */}
      {videos.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 20,
          border: '2px dashed #EDE8E1',
          padding: '64px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>▶</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
            Видео нет.
          </div>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #EDE8E1', overflow: 'hidden' }}>
          {videos.map((v, i) => (
            <div
              key={v.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 24px',
                borderBottom: i < videos.length - 1 ? '1px solid #EDE8E1' : 'none',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FBF9F5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Превью */}
              <div style={{ width: 80, height: 48, borderRadius: 8, background: '#F3EFE9', overflow: 'hidden', flexShrink: 0 }}>
                {v.thumbnail_url
                  ? <img src={toApiUrl(v.thumbnail_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4C5B0' }}>▶</div>
                }
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#8B7355' }}>{v.duration_formatted}</span>
                  <span style={{ fontSize: 12, color: '#8B7355' }}>{v.subtitles_count} субт.</span>
                  <span style={{
                    fontSize: 12,
                    padding: '2px 10px',
                    borderRadius: 20,
                    background: v.is_published ? 'rgba(45,90,61,0.1)' : '#F3EFE9',
                    color: v.is_published ? '#2D5A3D' : '#8B7355',
                  }}>
                    {v.is_published ? 'Опубликовано' : 'Черновик'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button onClick={() => setSubtitleVideoId(v.id)}
                  style={actionLinkStyle(BLUE)}>
                  + субтитры
                </button>
                <button onClick={() => togglePublished(v)} style={actionLinkStyle('#8B7355')}>
                  {v.is_published ? 'Скрыть' : 'Опубликовать'}
                </button>
                <button onClick={() => router.push(`/video/${v.id}`)} style={actionLinkStyle(BLUE)}>
                  Открыть
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  style={{
                    ...actionLinkStyle('#8B7355'),
                    fontSize: 13,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    padding: '8px 10px',
                    borderRadius: 8,
                    transition: 'color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = '#D14A35';
                    e.currentTarget.style.background = 'rgba(232,96,74,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = '#8B7355';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileField({ inputRef, accept, required }: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  required?: boolean;
}) {
  const [fileName, setFileName] = useState('');

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        required={required}
        style={{ fontSize: 13, color: '#8B7355' }}
        onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
      />
      {fileName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, minWidth: 0 }}>
          <span style={{
            fontSize: 12,
            color: '#8B7355',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            📎 {fileName}
          </span>
          <button
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = '';
              setFileName('');
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
              color: '#E8604A',
              padding: 4,
              flexShrink: 0,
            }}
          >
            ✕ Очистить
          </button>
        </div>
      )}
    </div>
  );
}

function actionLinkStyle(color: string): React.CSSProperties {
  return {
    fontSize: 13,
    color,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '8px 10px',
    borderRadius: 8,
    textDecoration: 'none',
    transition: 'color 0.2s',
  };
}
