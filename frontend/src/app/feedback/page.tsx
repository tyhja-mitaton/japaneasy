'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth-api';
import { useI18n } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Page() {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<{ id: number; email: string } | null | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (!localStorage.getItem('token')) {
        setUser(null);
        return;
      }
      authApi.me()
        .then((u: { id: number; email: string }) => setUser(u))
        .catch((err: { status?: number }) => {
          if (err?.status === 401) localStorage.removeItem('token');
          setUser(null);
        });
    };

    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const body: Record<string, string> = { message };
      if (!token) body.email = email;
      const res = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = data as { message?: string | string[]; errors?: Record<string, string[]> };
        setError(typeof err.message === 'string' ? err.message : t.feedback.errorSend);
        return;
      }
      setSent(true);
    } catch {
      setError(t.feedback.errorNetwork);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #EDE8E1',
    borderRadius: 12,
    padding: '14px 16px',
    fontSize: 15,
    fontFamily: "'Noto Sans JP', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#1A1A1A',
    background: 'white',
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(232,96,74,0.1)',
            borderRadius: 50,
            padding: '6px 14px',
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 500,
            color: '#E8604A',
          }}>
            <span>💬</span> {t.feedback.badge}
          </div>
          <h1 style={{
            fontFamily: "'Noto Serif JP'",
            fontSize: 28,
            fontWeight: 700,
            color: '#1A1A1A',
            marginBottom: 8,
          }}>
            {t.feedback.title}
          </h1>
          <p style={{ fontSize: 15, color: '#8B7355' }}>
            {t.feedback.subtitle}
          </p>
        </div>

        {sent ? (
          <div style={{
            background: 'white',
            borderRadius: 20,
            border: '1px solid #EDE8E1',
            padding: 48,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
              {t.feedback.thanks}
            </div>
            <div style={{ fontSize: 14, color: '#8B7355', marginBottom: 24, lineHeight: 1.6 }}>
              {t.feedback.thanksDesc}
            </div>
            <button
              onClick={() => router.push('/')}
              style={{
                background: '#E8604A',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#D14A35'}
              onMouseLeave={e => e.currentTarget.style.background = '#E8604A'}
            >
              {t.feedback.toHome}
            </button>
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: 20,
            border: '1px solid #EDE8E1',
            padding: 32,
          }}>
            {error && (
              <div style={{
                marginBottom: 20,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(232,96,74,0.08)',
                color: '#D14A35',
                fontSize: 14,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {user === null && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#1A1A1A',
                    marginBottom: 8,
                  }}>
                    {t.feedback.emailLabel}
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                    placeholder="you@example.com"
                    onFocus={e => e.target.style.borderColor = '#E8604A'}
                    onBlur={e => e.target.style.borderColor = '#EDE8E1'}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#1A1A1A',
                  marginBottom: 8,
                }}>
                  {t.feedback.messageLabel}
                </label>
                <textarea
                  name="message"
                  required
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    fontFamily: "'Noto Sans JP', sans-serif",
                  }}
                  placeholder={t.feedback.messagePlaceholder}
                  onFocus={e => e.target.style.borderColor = '#E8604A'}
                  onBlur={e => e.target.style.borderColor = '#EDE8E1'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? '#D4C5B0' : '#E8604A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 50,
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.background = '#D14A35';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={e => {
                  if (!loading) {
                    e.currentTarget.style.background = '#E8604A';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? t.feedback.sending : t.feedback.send}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
