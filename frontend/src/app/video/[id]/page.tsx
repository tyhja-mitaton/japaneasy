'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import PremiumGate from '@/components/PremiumGate';
import { useI18n } from '@/lib/i18n';
import { toApiUrl } from '@/lib/media-url';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type VideoDetail = {
  id: number;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  subtitles: Array<{
    id: number;
    label: string;
    language: string;
    url: string;
    is_default: boolean;
  }>;
};

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_URL}/api/videos/${id}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setVideo(data); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PremiumGate>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{ background: '#1A1A1A', borderRadius: 20, aspectRatio: '16 / 9', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
      </PremiumGate>
    );
  }

  if (notFound || !video) {
    return (
      <PremiumGate>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            border: '2px dashed #EDE8E1',
            padding: '64px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>📭</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
              {t.video.notFound}
            </div>
            <div style={{ fontSize: 14, color: '#8B7355', marginBottom: 24 }}>
              {t.video.notFoundHint}
            </div>
            <button
              onClick={() => router.push('/video')}
              style={{
                background: 'none',
                border: '1.5px solid #E8604A',
                color: '#E8604A',
                borderRadius: 50,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#E8604A';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#E8604A';
              }}
            >
              {t.video.back}
            </button>
          </div>
        </div>
      </PremiumGate>
    );
  }

  return (
    <PremiumGate>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>
        <button
          onClick={() => router.push('/video')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            color: '#E8604A',
            padding: 0,
            marginBottom: 16,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#D14A35'}
          onMouseLeave={e => e.currentTarget.style.color = '#E8604A'}
        >
          {t.video.back}
        </button>

        <VideoPlayer
          videoUrl={toApiUrl(video.video_url)}
          subtitles={video.subtitles.map(s => ({ ...s, url: toApiUrl(s.url) }))}
          title={video.title}
        />

        <div style={{ marginTop: 24 }}>
          <h1 style={{
            fontFamily: "'Noto Serif JP'",
            fontSize: 'clamp(20px, 3vw, 28px)',
            fontWeight: 700,
            color: '#1A1A1A',
          }}>
            {video.title}
          </h1>
          {video.description && (
            <p style={{
              fontSize: 15,
              color: '#8B7355',
              lineHeight: 1.7,
              marginTop: 10,
            }}>
              {video.description}
            </p>
          )}
        </div>
      </div>
    </PremiumGate>
  );
}
