'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi, notifyAuthChanged } from '@/lib/auth-api';
import { detectCountry } from '@/lib/detect-country';
import { useI18n } from '@/lib/i18n';

export default function Page() {
  const router = useRouter();
  const { t } = useI18n();
  const [form, setForm] = useState({ email: '', password: '', country: undefined as string | undefined });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    detectCountry().then(country => {
      if (country) setForm(prev => ({ ...prev, country }));
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login(form);
      localStorage.setItem('token', data.token);
      notifyAuthChanged();
      router.push('/texts');
    } catch (err: unknown) {
      const error = err as { email_verified?: boolean; message?: string };
      if (error.email_verified === false) {
        setError(t.auth.emailNotVerified);
      } else {
        setError(error.message || t.auth.loginFailed);
      }
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
      <div style={{ width: '100%', maxWidth: 420 }}>
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
            <span>👋</span> {t.auth.welcomeBack}
          </div>
          <h1 style={{
            fontFamily: "'Noto Serif JP'",
            fontSize: 28,
            fontWeight: 700,
            color: '#1A1A1A',
            marginBottom: 8,
          }}>
            {t.auth.loginTitle}
          </h1>
          <p style={{
            fontSize: 15,
            color: '#8B7355',
          }}>
            {t.auth.loginSubtitle}
          </p>
        </div>

        {/* Card */}
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
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#1A1A1A',
                marginBottom: 8,
              }}>
                {t.auth.email}
              </label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                style={inputStyle}
                placeholder="you@example.com"
                onFocus={e => e.target.style.borderColor = '#E8604A'}
                onBlur={e => e.target.style.borderColor = '#EDE8E1'}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#1A1A1A',
                marginBottom: 8,
              }}>
                {t.auth.password}
              </label>
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                style={inputStyle}
                placeholder={t.auth.yourPassword}
                onFocus={e => e.target.style.borderColor = '#E8604A'}
                onBlur={e => e.target.style.borderColor = '#EDE8E1'}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <Link
                href="/auth/forgot-password"
                className="link-hover-text-coral"
                style={{
                  fontSize: 14,
                  color: '#8B7355',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
              >
                {t.auth.forgotPassword}
              </Link>
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
              {loading ? t.auth.signingIn : t.auth.login}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          marginTop: 24,
          textAlign: 'center',
          fontSize: 14,
          color: '#8B7355',
        }}>
          {t.auth.noAccount}{' '}
          <Link
            href="/auth/register"
            style={{
              color: '#E8604A',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            {t.auth.registerNow}
          </Link>
        </p>
      </div>
    </div>
  );
}
