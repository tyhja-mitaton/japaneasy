'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/auth-api';

export default function Page() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    email: params.get('email') || '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token = params.get('token') || '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword({ token, ...form });
      router.push('/auth/login?reset=success');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Ссылка для сброса недействительна или истекла.');
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
            <span>🔑</span> Сброс пароля
          </div>
          <h1 style={{
            fontFamily: "'Noto Serif JP'",
            fontSize: 28,
            fontWeight: 700,
            color: '#1A1A1A',
            marginBottom: 8,
          }}>
            Новый пароль
          </h1>
          <p style={{
            fontSize: 15,
            color: '#8B7355',
          }}>
            Придумайте надёжный пароль для аккаунта
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
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                style={inputStyle}
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
                Новый пароль
              </label>
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Минимум 8 символов"
                onFocus={e => e.target.style.borderColor = '#E8604A'}
                onBlur={e => e.target.style.borderColor = '#EDE8E1'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 500,
                color: '#1A1A1A',
                marginBottom: 8,
              }}>
                Подтвердите пароль
              </label>
              <input
                name="password_confirmation"
                type="password"
                required
                value={form.password_confirmation}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Повторите пароль"
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
              {loading ? 'Сохранение…' : 'Установить пароль'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
