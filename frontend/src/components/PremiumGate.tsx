'use client';

import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type GateState = 'loading' | 'guest' | 'blocked' | 'error' | 'ok';

export default function PremiumGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<GateState>('loading');

  const checkAccess = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState('guest');
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          setState('guest');
          return null;
        }
        if (!res.ok) throw new Error('me request failed');
        return res.json();
      })
      .then(user => {
        if (!user) return;
        const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const isStaff = roles.includes('administrator') || roles.includes('manager');
        setState(user.is_premium || isStaff ? 'ok' : 'blocked');
      })
      .catch(() => setState('error'));
  };

  useEffect(() => {
    queueMicrotask(checkAccess);
  }, []);

  if (state === 'ok') {
    return <>{children}</>;
  }

  const isGuest = state === 'guest';

  const card = (
    <div style={{
      width: '100%',
      maxWidth: 420,
      background: 'white',
      borderRadius: 20,
      border: '1px solid #EDE8E1',
      padding: 48,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>
        {state === 'loading' ? '⏳' : isGuest ? '🔒' : state === 'error' ? '⚠️' : '⭐'}
      </div>
      <h1 style={{
        fontFamily: "'Noto Serif JP'",
        fontSize: 26,
        fontWeight: 700,
        color: '#1A1A1A',
        marginBottom: 12,
      }}>
        {state === 'loading'
          ? t.video.loading
          : isGuest
            ? t.video.loginTitle
            : state === 'error'
              ? t.video.error
              : t.video.paywallTitle}
      </h1>
      <p style={{ fontSize: 15, color: '#8B7355', marginBottom: 24, lineHeight: 1.6 }}>
        {isGuest
          ? t.video.loginDesc
          : state === 'error'
            ? t.video.errorDesc
            : t.video.paywallDesc}
      </p>
      {state !== 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {state === 'error' ? (
            <button
              onClick={() => { setState('loading'); checkAccess(); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#E8604A',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#D14A35'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#E8604A'; }}
            >
              {t.video.retry}
            </button>
          ) : (
            <>
              <Link
                href={isGuest ? '/auth/login' : '/#pricing'}
                className="link-hover-bg-coral"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: '#E8604A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 50,
                  padding: '14px 28px',
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background 0.2s, transform 0.15s',
                }}
              >
                {isGuest ? t.video.loginCta : t.video.paywallCta}
              </Link>
              <Link
                href="/"
                style={{
                  fontSize: 14,
                  color: '#8B7355',
                  textDecoration: 'none',
                  padding: '8px',
                }}
              >
                {t.video.home}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
    }}>
      {card}
    </div>
  );
}
