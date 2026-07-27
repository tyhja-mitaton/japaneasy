'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/auth-api';

export default function Page() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Произошла ошибка.');
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

  if (sent) {
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
          <div style={{ fontSize: 64, marginBottom: 24 }}>✉️</div>
          <h1 style={{
            fontFamily: "'Noto Serif JP'",
            fontSize: 28,
            fontWeight: 700,
            color: '#1A1A1A',
            marginBottom: 12,
          }}>
            Проверьте почту
          </h1>
          <p style={{
            fontSize: 15,
            color: '#8B7355',
            marginBottom: 32,
            lineHeight: 1.6,
          }}>
            Если аккаунт с email <strong style={{ color: '#1A1A1A' }}>{email}</strong> существует, мы отправили ссылку для сброса пароля.
          </p>
          <Link
            href="/auth/login"
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
            onMouseEnter={e => {
              e.currentTarget.style.background = '#D14A35';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#E8604A';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ← Вернуться ко входу
          </Link>
        </div>
      </div>
    );
  }

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
            <span>🔑</span> Забыли пароль?
          </div>
          <h1 style={{
            fontFamily: "'Noto Serif JP'",
            fontSize: 28,
            fontWeight: 700,
            color: '#1A1A1A',
            marginBottom: 8,
          }}>
            Восстановление пароля
          </h1>
          <p style={{
            fontSize: 15,
            color: '#8B7355',
          }}>
            Введите email и мы отправим ссылку для сброса
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
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#1A1A1A',
                marginBottom: 8,
              }}>
                Email
              </label>
              <input
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
              {loading ? 'Отправка…' : 'Отправить ссылку'}
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
          <Link
            href="/auth/login"
            style={{
              color: '#E8604A',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            ← Вернуться ко входу
          </Link>
        </p>
      </div>
    </div>
  );
}
