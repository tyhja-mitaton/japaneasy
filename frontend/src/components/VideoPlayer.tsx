'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { parseVtt, VttCue } from '@/lib/vtt-parser';

interface SubtitleTrack {
  id:         number;
  label:      string;
  language:   string;
  url:        string;
  is_default: boolean;
}

interface Props {
  videoUrl:  string;
  subtitles: SubtitleTrack[];
  title:     string;
}

export default function VideoPlayer({ videoUrl, subtitles, title }: Props) {
  const videoRef          = useRef<HTMLVideoElement>(null);
  const containerRef      = useRef<HTMLDivElement>(null);

  // Состояние плеера
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [currentTime,     setCurrentTime]      = useState(0);
  const [duration,        setDuration]         = useState(0);
  const [autoPause,       setAutoPause]        = useState(false);
  const [showSubtitles,   setShowSubtitles]    = useState(true);
  const [activeTrackId,   setActiveTrackId]    = useState<number | null>(null);

  // Субтитры
  const [cues,            setCues]             = useState<VttCue[]>([]);
  const [currentCueIndex, setCurrentCueIndex]  = useState(-1);
  const [currentCueText,  setCurrentCueText]   = useState('');

  // Флаг: только что сработала автопауза — не останавливать повторно
  const autoPausedRef   = useRef(false);
  const autoPausedCueRef = useRef(-1);
  const prevIdxRef      = useRef(-1);

  const [volume, setVolume] = useState(1);
  const [muted, setMuted]   = useState(false);

  // ── Загрузка субтитров ────────────────────────────────────────────────────
  const loadTrack = useCallback(async (track: SubtitleTrack) => {
    setActiveTrackId(track.id);
    setCues([]);
    setCurrentCueIndex(-1);
    setCurrentCueText('');
    autoPausedRef.current = false;
    autoPausedCueRef.current = -1;
    prevIdxRef.current = -1;
    try {
      const res  = await fetch(track.url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') ?? ''}` },
      });
      const text = await res.text();
      setCues(parseVtt(text));
    } catch {
      console.error('Failed to load subtitle track');
    }
  }, []);

  // Загружаем дефолтный трек при старте
  useEffect(() => {
    const def = subtitles.find(s => s.is_default) ?? subtitles[0];
    queueMicrotask(() => { if (def) loadTrack(def); });
  }, [subtitles, loadTrack]);

  // ── Текущий кью по времени ────────────────────────────────────────────────
  const findCueIndex = useCallback((time: number): number => {
    return cues.findIndex(c => time >= c.start && time < c.end);
  }, [cues]);

  // Перемотка с синхронизацией индекса для автопаузы
  const seekTo = useCallback((t: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = t;
    autoPausedRef.current = false;
    prevIdxRef.current = findCueIndex(t);
  }, [findCueIndex]);

  // ── timeupdate ────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay   = () => setIsPlaying(true);
    const onPause  = () => setIsPlaying(false);
    const onLoaded = () => setDuration(video.duration);

    const onTimeUpdate = () => {
      const t = video.currentTime;
      setCurrentTime(t);

      const idx = findCueIndex(t);
      setCurrentCueIndex(idx);
      setCurrentCueText(idx >= 0 ? cues[idx].text : '');

      // Автопауза: срабатывает, когда закончился текущий кью — работает и для
      // смежных кью (следующий начинается сразу после окончания), и при разрывах
      const prev = prevIdxRef.current;
      if (autoPause && !autoPausedRef.current && prev >= 0 && t >= cues[prev].end) {
        autoPausedRef.current    = true;
        autoPausedCueRef.current = prev;
        video.pause();
      }

      prevIdxRef.current = idx;
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play',   onPlay);
    video.addEventListener('pause',  onPause);
    video.addEventListener('loadedmetadata', onLoaded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play',   onPlay);
      video.removeEventListener('pause',  onPause);
      video.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [cues, findCueIndex, autoPause]);

  // ── Навигация по фразам ───────────────────────────────────────────────────
  const gotoPrevCue = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cues.length) return;

    const t   = video.currentTime;
    const idx = findCueIndex(t);

    if (idx > 0 && t - cues[idx].start < 1.5) {
      // Начало текущего кью — прыгаем на предыдущий
      seekTo(cues[idx - 1].start);
    } else if (idx > 0) {
      // Внутри кью — возврат на его начало
      seekTo(cues[idx].start);
    } else if (idx === -1) {
      // Между кью — ищем предыдущий
      const prev = [...cues].reverse().find(c => c.end <= t);
      if (prev) seekTo(prev.start);
    } else {
      seekTo(cues[0].start);
    }

    if (autoPause) video.play();
  }, [cues, findCueIndex, autoPause, seekTo]);

  const gotoNextCue = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cues.length) return;

    const t   = video.currentTime;
    const idx = findCueIndex(t);

    const nextIdx = idx >= 0 ? idx + 1 : cues.findIndex(c => c.start > t);
    if (nextIdx >= 0 && nextIdx < cues.length) {
      seekTo(cues[nextIdx].start);
      if (autoPause) video.play();
    }
  }, [cues, findCueIndex, autoPause, seekTo]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      return;
    }

    // После автопаузы продолжение переходит к следующей фразе
    if (autoPause && autoPausedRef.current) {
      const nextIdx = autoPausedCueRef.current + 1;
      seekTo(nextIdx < cues.length ? cues[nextIdx].start : video.duration);
    } else {
      autoPausedRef.current = false;
      prevIdxRef.current = findCueIndex(video.currentTime);
    }

    video.play();
  };

  // Последние обработчики — чтобы горячие клавиши всегда звали свежие версии
  const handlersRef = useRef({ togglePlay, gotoPrevCue, gotoNextCue });
  useEffect(() => {
    handlersRef.current = { togglePlay, gotoPrevCue, gotoNextCue };
  });

  // ── Горячие клавиши ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Игнорируем если фокус на input/textarea/select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      const h = handlersRef.current;
      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); h.gotoPrevCue();                    break;
        case 'ArrowRight': e.preventDefault(); h.gotoNextCue();                    break;
        case 'j': case 'J': setAutoPause(p => !p);                                break;
        case 'l': case 'L': setShowSubtitles(p => !p);                            break;
        case ' ':          e.preventDefault(); h.togglePlay();                     break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Громкость ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  // ── Прогресс-бар ──────────────────────────────────────────────────────────
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect   = e.currentTarget.getBoundingClientRect();
    const ratio  = (e.clientX - rect.left) / rect.width;
    seekTo(ratio * duration);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  // Позиция текущего кью в прогресс-баре
  const cueMarkers = cues.map(c => ({
    left: duration ? (c.start / duration) * 100 : 0,
  }));

  const navButtonStyle: React.CSSProperties = {
    color: 'white',
    fontSize: 18,
    fontFamily: 'monospace',
    padding: '4px 8px',
    borderRadius: 6,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    lineHeight: 1,
    transition: 'color 0.2s, background 0.2s',
  };

  const chipBaseStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    padding: '6px 12px',
    borderRadius: 50,
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'rgba(255,255,255,0.6)',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  };

  return (
    <div
      ref={containerRef}
      style={{ background: '#000', borderRadius: 20, overflow: 'hidden', userSelect: 'none' }}
    >
      {/* Видео */}
      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          style={{ width: '100%', aspectRatio: '16 / 9', display: 'block' }}
          onClick={togglePlay}
          playsInline
        />

        {/* Субтитры поверх видео */}
        {showSubtitles && currentCueText && (
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            textAlign: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{
              background: 'rgba(26,26,26,0.75)',
              color: 'white',
              fontSize: 16,
              padding: '6px 12px',
              borderRadius: 8,
              lineHeight: 1.7,
            }}>
              {currentCueText.split('\n').map((line, i) => (
                <span key={i}>{line}{i < currentCueText.split('\n').length - 1 && <br />}</span>
              ))}
            </span>
          </div>
        )}
      </div>

      {/* Прогресс-бар */}
      <div
        style={{
          position: 'relative',
          height: 4,
          background: 'rgba(255,255,255,0.2)',
          cursor: 'pointer',
          transition: 'height 0.2s',
        }}
        onClick={handleSeek}
        onMouseEnter={e => { e.currentTarget.style.height = '6px'; }}
        onMouseLeave={e => { e.currentTarget.style.height = '4px'; }}
      >
        <div style={{ height: '100%', background: '#E8604A', width: `${progress}%` }} />
        {/* Маркеры кью */}
        {cueMarkers.map((m, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              width: 2,
              height: '100%',
              background: 'rgba(255,255,255,0.3)',
              left: `${m.left}%`,
            }}
          />
        ))}
      </div>

      {/* Панель управления */}
      <div style={{
        background: '#1A1A1A',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}>

        {/* Навигация по фразам */}
        <button
          onClick={gotoPrevCue}
          title="Предыдущая фраза (←)"
          style={navButtonStyle}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8604A'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'transparent'; }}
        >
          |◁
        </button>

        {/* Плей/пауза */}
        <button
          onClick={togglePlay}
          style={{ ...navButtonStyle, fontSize: 20 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8604A'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'transparent'; }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          onClick={gotoNextCue}
          title="Следующая фраза (→)"
          style={navButtonStyle}
          onMouseEnter={e => { e.currentTarget.style.color = '#E8604A'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'transparent'; }}
        >
          ▷|
        </button>

        {/* Таймер */}
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'monospace' }}>
          {fmtTime(currentTime)} / {fmtTime(duration)}
        </span>

        {/* Название текущего кью */}
        {currentCueIndex >= 0 && (
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            {currentCueIndex + 1} / {cues.length}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Автопауза */}
        <button
          onClick={() => setAutoPause(p => !p)}
          title="Автопауза после каждой фразы (J)"
          style={{
            ...chipBaseStyle,
            ...(autoPause
              ? { background: '#E8604A', borderColor: '#E8604A', color: 'white' }
              : {}),
          }}
          onMouseEnter={e => {
            if (!autoPause) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; }
          }}
          onMouseLeave={e => {
            if (!autoPause) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }
          }}
        >
          ⏸ Автопауза
        </button>

        {/* Субтитры — переключатель трека */}
        {subtitles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              onClick={() => setShowSubtitles(p => !p)}
              title="Показать/скрыть субтитры (L)"
              style={{
                ...chipBaseStyle,
                ...(showSubtitles
                  ? { background: '#E8604A', borderColor: '#E8604A', color: 'white' }
                  : {}),
              }}
              onMouseEnter={e => {
                if (!showSubtitles) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)'; }
              }}
              onMouseLeave={e => {
                if (!showSubtitles) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }
              }}
            >
              CC
            </button>

            {/* Выбор дорожки */}
            {subtitles.length > 1 && (
              <select
                value={activeTrackId ?? ''}
                onChange={e => {
                  const track = subtitles.find(s => s.id === +e.target.value);
                  if (track) loadTrack(track);
                }}
                style={{
                  background: '#2A2A2A',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  borderRadius: 6,
                  padding: '6px 8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontFamily: 'inherit',
                }}
              >
                {subtitles.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Громкость */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setMuted(m => !m)}
            title={muted ? 'Включить звук' : 'Выключить звук'}
            style={{
              ...chipBaseStyle,
              fontSize: 14,
              padding: '6px 10px',
              lineHeight: 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
          >
            {muted || volume === 0 ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={e => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (v > 0 && muted) setMuted(false);
            }}
            style={{ width: 90, accentColor: '#E8604A', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Подсказка по горячим клавишам */}
      <div style={{
        background: '#1A1A1A',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '6px 16px',
        display: 'flex',
        gap: 16,
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
      }}>
        {[
          ['←', 'пред. фраза'],
          ['→', 'след. фраза'],
          ['J', 'автопауза'],
          ['L', 'субтитры'],
          ['Пробел', 'плей/пауза'],
        ].map(([key, label]) => (
          <span key={key}><kbd style={{ fontFamily: 'monospace' }}>{key}</kbd> {label}</span>
        ))}
      </div>
    </div>
  );
}
