'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/auth-api';
import { useI18n } from '@/lib/i18n';

export default function Page() {
  const { t } = useI18n();
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await authApi.resendVerification();
      setResent(true);
    } catch {
      // токена нет — просто игнорируем
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'white',
        borderRadius: 20,
        border: '1px solid #EDE8E1',
        padding: 48,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>📧</div>
        <h1 style={{
          fontFamily: "'Noto Serif JP'",
          fontSize: 28,
          fontWeight: 700,
          color: '#1A1A1A',
          marginBottom: 12,
        }}>
          {t.auth.checkEmail}
        </h1>
        <p style={{
          fontSize: 15,
          color: '#8B7355',
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          {t.auth.checkEmailBody}
        </p>

        {resent ? (
          <div style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(45,90,61,0.08)',
            color: '#2D5A3D',
            fontSize: 14,
            marginBottom: 24,
          }}>
            {t.auth.resentSuccess}
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              color: '#8B7355',
              marginBottom: 24,
              padding: 0,
              transition: 'color 0.2s',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#E8604A'}
            onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
          >
            {loading ? t.auth.sending : t.auth.resendAsk}
          </button>
        )}

        <div style={{
          borderTop: '1px solid #EDE8E1',
          paddingTop: 24,
        }}>
          <Link
            href="/auth/login"
            className="link-hover-bg-coral"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
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
            {t.auth.goToLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
