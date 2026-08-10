'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

export default function LegalLayout({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
      <button
        onClick={() => router.push('/')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          color: '#8B7355',
          marginBottom: 20,
          padding: 0,
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#E8604A'}
        onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
      >
        {t.legal.back}
      </button>

      <h1 style={{
        fontFamily: "'Noto Serif JP'",
        fontSize: 'clamp(24px, 3vw, 32px)',
        fontWeight: 700,
        color: '#1A1A1A',
        marginBottom: 8,
      }}>
        {title}
      </h1>
      <p style={{ fontSize: 15, color: '#8B7355', marginBottom: 24 }}>
        {desc}
      </p>

      <div style={{
        background: 'white',
        borderRadius: 20,
        border: '1px solid #EDE8E1',
        padding: 32,
      }}>
        {children}
      </div>
    </div>
  );
}
