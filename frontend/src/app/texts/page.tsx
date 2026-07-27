'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

type TextMeta = { id: number; title: string; created_at: string };

export default function Page() {
  const router = useRouter();
  const [texts, setTexts] = useState<TextMeta[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/texts').then(setTexts).catch(() => router.push('/auth/login'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    try {
      const text = await apiFetch('/api/texts', {
        method: 'POST',
        body: JSON.stringify({ content: input }),
      });
      router.push(`/texts/${text.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/texts/${id}`, { method: 'DELETE' });
    setTexts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#E8604A',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Мои тексты
        </div>
        <h1 style={{
          fontFamily: "'Noto Serif JP'",
          fontSize: 'clamp(24px, 3vw, 36px)',
          fontWeight: 700,
          color: '#1A1A1A',
        }}>
          Загружайте и изучайте
        </h1>
      </div>

      {/* Form */}
      <div style={{
        background: 'white',
        borderRadius: 20,
        padding: 24,
        border: '1px solid #EDE8E1',
        marginBottom: 48,
      }}>
        <form onSubmit={handleSubmit}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Вставьте японский текст здесь…"
            rows={6}
            style={{
              width: '100%',
              border: '1px solid #EDE8E1',
              borderRadius: 12,
              padding: '14px 16px',
              fontSize: 15,
              fontFamily: "'Noto Sans JP', sans-serif",
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
              color: '#1A1A1A',
            }}
            onFocus={e => e.target.style.borderColor = '#E8604A'}
            onBlur={e => e.target.style.borderColor = '#EDE8E1'}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? '#D4C5B0' : '#E8604A',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                padding: '14px 28px',
                fontSize: 15,
                fontWeight: 600,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background 0.2s, transform 0.15s',
              }}
              onMouseEnter={e => {
                if (!loading && input.trim()) {
                  e.currentTarget.style.background = '#D14A35';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                if (!loading && input.trim()) {
                  e.currentTarget.style.background = '#E8604A';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <span>📄</span>
              {loading ? 'Сохранение…' : 'Анализировать текст'}
            </button>
          </div>
        </form>
      </div>

      {/* Texts list */}
      {texts.length > 0 ? (
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#8B7355',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Сохранённые тексты ({texts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {texts.map(t => (
              <div
                key={t.id}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: '16px 20px',
                  border: '1px solid #EDE8E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
                  e.currentTarget.style.borderColor = '#D4C5B0';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#EDE8E1';
                }}
              >
                <button
                  onClick={() => router.push(`/texts/${t.id}`)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    flex: 1,
                    padding: 0,
                  }}
                >
                  <div style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: '#1A1A1A',
                    marginBottom: 4,
                  }}>
                    {t.title}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: '#8B7355',
                  }}>
                    {new Date(t.created_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    fontSize: 13,
                    color: '#8B7355',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#E8604A'}
                  onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '48px 24px',
          border: '2px dashed #EDE8E1',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1A1A1A',
            marginBottom: 8,
          }}>
            Нет сохранённых текстов
          </div>
          <div style={{
            fontSize: 14,
            color: '#8B7355',
          }}>
            Вставьте японский текст в форму выше, чтобы начать изучение
          </div>
        </div>
      )}
    </div>
  );
}
