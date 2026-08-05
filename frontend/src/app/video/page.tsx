'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PremiumGate from '@/components/PremiumGate';
import { useI18n } from '@/lib/i18n';
import { toApiUrl } from '@/lib/media-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type VideoMeta = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_formatted: string;
  created_at: string;
};

export default function VideoGridPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/videos`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 403) throw new Error('premium-required');
        if (!r.ok) throw new Error('load-failed');
        return r.json();
      })
      .then(setVideos)
      .catch(() => setError('load-failed'))
      .finally(() => setLoading(false));
  }, []);

  const skeletonCard = (
    <div>
      <div style={{
        background: '#F3EFE9',
        borderRadius: 16,
        aspectRatio: '16 / 9',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      <div style={{
        marginTop: 12,
        background: '#F3EFE9',
        borderRadius: 8,
        height: 14,
        width: '80%',
      }} />
      <div style={{
        marginTop: 8,
        background: '#F3EFE9',
        borderRadius: 8,
        height: 12,
        width: '50%',
      }} />
    </div>
  );

  return (
    <PremiumGate>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(232,96,74,0.1)',
            borderRadius: 50,
            padding: '6px 14px',
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 500,
            color: '#E8604A',
          }}>
            <span>▶</span> {t.video.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{
                fontFamily: "'Noto Serif JP'",
                fontSize: 'clamp(24px, 3vw, 32px)',
                fontWeight: 700,
                color: '#1A1A1A',
                marginBottom: 8,
              }}>
                {t.video.title}
              </h1>
              <p style={{ fontSize: 15, color: '#8B7355' }}>
                {t.video.subtitle}
              </p>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(45,90,61,0.1)',
              color: '#2D5A3D',
              borderRadius: 50,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
            }}>
              ⭐ {t.video.premium}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {Array.from({ length: 8 }).map((_, i) => <div key={i}>{skeletonCard}</div>)}
          </div>
        ) : error ? (
          <div style={{
            background: 'white',
            borderRadius: 20,
            border: '2px dashed #EDE8E1',
            padding: '64px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
              {t.video.error}
            </div>
            <div style={{ fontSize: 14, color: '#8B7355' }}>
              {t.video.errorDesc}
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: 20,
            border: '2px dashed #EDE8E1',
            padding: '64px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>▶</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
              {t.video.empty}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {videos.map(v => (
              <button
                key={v.id}
                onClick={() => router.push(`/video/${v.id}`)}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  border: '1px solid #EDE8E1',
                  overflow: 'hidden',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: 0,
                  transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(232,96,74,0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#EDE8E1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Превью */}
                <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#F3EFE9' }}>
                  {v.thumbnail_url ? (
                    <img
                      src={toApiUrl(v.thumbnail_url)}
                      alt={v.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#D4C5B0',
                      fontSize: 36,
                    }}>
                      ▶
                    </div>
                  )}
                  {/* Иконка плея при hover */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    background: 'rgba(26,26,26,0.25)',
                    transition: 'opacity 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      color: '#1A1A1A',
                    }}>
                      ▶
                    </div>
                  </div>
                  {/* Длительность */}
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    background: 'rgba(26,26,26,0.7)',
                    color: 'white',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    padding: '2px 8px',
                    borderRadius: 6,
                  }}>
                    {v.duration_formatted}
                  </div>
                </div>

                {/* Информация */}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1A1A1A',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {v.title}
                  </div>
                  {v.description && (
                    <div style={{
                      fontSize: 13,
                      color: '#8B7355',
                      marginTop: 6,
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {v.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </PremiumGate>
  );
}
