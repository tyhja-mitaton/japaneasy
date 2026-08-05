'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const BLUE = '#2563EB';
const BLUE_HOVER = '#1D4ED8';
const GREEN = '#2D5A3D';
const CORAL = '#E8604A';
const CORAL_HOVER = '#D14A35';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

type Feedback = {
  id: number;
  email: string;
  message: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  meta: { user_id?: number; plan?: string; profile_url?: string; user_agent?: string };
};

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Page() {
  const router = useRouter();
  const [items, setItems] = useState<Feedback[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'new'>('all');
  const [notice, setNotice] = useState<string | null>(null);

  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page) });
    if (search) qs.set('search', search);
    if (filter === 'new') qs.set('filter', 'new');
    apiFetch(`/api/admin/feedback?${qs.toString()}`)
      .then(res => { setItems(res.data ?? []); setMeta(res.meta ?? null); })
      .catch(() => router.push('/auth/login'));
  }, [page, search, filter, router]);

  const runSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const startReply = (item: Feedback) => {
    setReplyingId(item.id);
    setReplyText('');
    setNotice(null);
  };

  const sendReply = async (item: Feedback) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const updated = await apiFetch(`/api/admin/feedback/${item.id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply: replyText }),
      });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
      setReplyingId(null);
      setNotice(null);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setNotice(err?.message ?? 'Не удалось отправить ответ.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async (item: Feedback) => {
    if (!confirm('Удалить обращение?')) return;
    try {
      await apiFetch(`/api/admin/feedback/${item.id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.id !== item.id));
      if (items.length === 1 && page > 1) setPage(p => p - 1);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setNotice(err?.message ?? 'Не удалось удалить обращение.');
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #EDE8E1',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 14,
    fontFamily: "'Noto Sans JP', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    color: '#1A1A1A',
    background: 'white',
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(59,130,246,0.1)',
          borderRadius: 50,
          padding: '6px 14px',
          marginBottom: 12,
          fontSize: 13,
          fontWeight: 500,
          color: BLUE,
        }}>
          <span>⚙️</span> Админ-панель
        </div>
        <h1 style={{
          fontFamily: "'Noto Serif JP'",
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 700,
          color: '#1A1A1A',
        }}>
          Обратная связь
        </h1>
        <div style={{ fontSize: 14, color: '#8B7355', marginTop: 4 }}>
          Запросы от пользователей и гостей
        </div>
      </div>

      {notice && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          background: 'rgba(232,96,74,0.08)',
          border: '1px solid rgba(232,96,74,0.25)',
          borderRadius: 14,
          fontSize: 13,
          color: '#B3261E',
          lineHeight: 1.5,
        }}>
          {notice}
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
          placeholder="Поиск по email или тексту…"
          style={{ ...fieldStyle, maxWidth: 340 }}
          onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        <button
          onClick={runSearch}
          style={{
            background: BLUE, color: 'white', border: 'none', borderRadius: 50,
            padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = BLUE_HOVER; }}
          onMouseLeave={e => { e.currentTarget.style.background = BLUE; }}
        >
          Найти
        </button>
        {search && (
          <button
            onClick={() => { setSearch(''); setSearchInput(''); }}
            style={{
              background: 'none', border: '1.5px solid #EDE8E1', borderRadius: 50,
              padding: '10px 20px', fontSize: 14, color: '#8B7355', cursor: 'pointer',
            }}
          >
            Сбросить
          </button>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          {(['all', 'new'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setPage(1); setFilter(f); }}
              style={{
                background: filter === f ? BLUE : 'transparent',
                color: filter === f ? 'white' : '#8B7355',
                border: filter === f ? 'none' : '1.5px solid #EDE8E1',
                borderRadius: 50,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {f === 'all' ? 'Все' : 'Без ответа'}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback list */}
      {items.length === 0 && meta ? (
        <div style={{
          background: 'white',
          borderRadius: 20,
          border: '2px dashed #EDE8E1',
          padding: '64px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>💬</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
            {search ? 'Ничего не найдено' : filter === 'new' ? 'Нет неотвеченных обращений' : 'Нет обращений'}
          </div>
          <div style={{ fontSize: 14, color: '#8B7355' }}>
            Обращения появятся после отправки формы обратной связи
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => (
            <div key={item.id} style={{
              background: 'white',
              borderRadius: 16,
              border: '1px solid #EDE8E1',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 50, flexShrink: 0,
                  background: item.replied_at ? 'rgba(45,90,61,0.12)' : 'rgba(232,96,74,0.12)',
                  color: item.replied_at ? GREEN : CORAL,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17,
                }}>
                  {item.replied_at ? '✓' : '✉'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{item.email}</span>
                    {item.meta?.user_id && (
                      <a
                        href={item.meta.profile_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: 11, fontWeight: 600, color: BLUE,
                          background: 'rgba(59,130,246,0.08)', padding: '3px 10px', borderRadius: 20,
                          textDecoration: 'none',
                        }}
                      >
                        профиль #{item.meta.user_id}
                      </a>
                    )}
                    {item.meta?.plan && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: GREEN,
                        background: 'rgba(45,90,61,0.08)', padding: '3px 10px', borderRadius: 20,
                      }}>
                        {item.meta.plan}
                      </span>
                    )}
                    {item.replied_at ? (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: GREEN,
                        background: 'rgba(45,90,61,0.08)', padding: '3px 10px', borderRadius: 20,
                      }}>
                        отвечено
                      </span>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: '#B45309',
                        background: 'rgba(217,119,6,0.1)', padding: '3px 10px', borderRadius: 20,
                      }}>
                        без ответа
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 14, color: '#1A1A1A', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', marginBottom: 8,
                  }}>
                    {item.message}
                  </div>
                  <div style={{ fontSize: 12, color: '#B9A88F', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>{formatDate(item.created_at)}</span>
                    {item.meta?.user_agent && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                        {item.meta.user_agent}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {!item.replied_at && (
                    <button
                      onClick={() => replyingId === item.id ? setReplyingId(null) : startReply(item)}
                      style={{
                        fontSize: 14, color: BLUE, background: 'none', border: 'none',
                        cursor: 'pointer', padding: '8px 12px', borderRadius: 8,
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {replyingId === item.id ? 'Отмена' : 'Ответить'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item)}
                    style={{
                      fontSize: 14, color: '#8B7355', background: 'none', border: 'none',
                      cursor: 'pointer', padding: '8px 12px', borderRadius: 8,
                      transition: 'color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = CORAL_HOVER; e.currentTarget.style.background = 'rgba(232,96,74,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#8B7355'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    Удалить
                  </button>
                </div>
              </div>

              {/* Inline reply */}
              {replyingId === item.id && (
                <div style={{
                  background: '#FBF9F5',
                  borderTop: '1px solid #EDE8E1',
                  padding: '16px 22px',
                }}>
                  {item.admin_reply && (
                    <div style={{
                      fontSize: 13, color: '#2D5A3D', marginBottom: 12, lineHeight: 1.5,
                      background: 'rgba(45,90,61,0.06)', borderRadius: 10, padding: '10px 14px',
                    }}>
                      Ранее отправлен ответ: {item.admin_reply}
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 8 }}>
                    Ответ придёт на {item.email}
                  </div>
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Текст ответа…"
                    style={{ ...fieldStyle, resize: 'vertical', fontFamily: "'Noto Sans JP', sans-serif" }}
                    onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => sendReply(item)}
                      disabled={sendingReply || !replyText.trim()}
                      style={{
                        background: sendingReply || !replyText.trim() ? '#93C5FD' : BLUE,
                        color: 'white', border: 'none', borderRadius: 50,
                        padding: '10px 20px', fontSize: 14, fontWeight: 600,
                        cursor: sendingReply || !replyText.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {sendingReply ? 'Отправляем…' : 'Отправить ответ'}
                    </button>
                    <button
                      onClick={() => setReplyingId(null)}
                      style={{
                        background: 'none', border: '1.5px solid #EDE8E1', borderRadius: 50,
                        padding: '10px 20px', fontSize: 14, color: '#8B7355', cursor: 'pointer',
                      }}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{
              fontSize: 14,
              color: page === 1 ? '#D4C5B0' : BLUE,
              background: 'none',
              border: '1px solid #EDE8E1',
              borderRadius: 50,
              padding: '8px 16px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Назад
          </button>
          {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              style={{
                width: 36, height: 36,
                fontSize: 14,
                fontWeight: n === page ? 600 : 400,
                color: n === page ? 'white' : '#1A1A1A',
                background: n === page ? BLUE : 'transparent',
                border: n === page ? 'none' : '1px solid #EDE8E1',
                borderRadius: 50,
                cursor: 'pointer',
              }}
            >
              {n}
            </button>
          ))}
          <button
            disabled={page === meta.last_page}
            onClick={() => setPage(p => p + 1)}
            style={{
              fontSize: 14,
              color: page === meta.last_page ? '#D4C5B0' : BLUE,
              background: 'none',
              border: '1px solid #EDE8E1',
              borderRadius: 50,
              padding: '8px 16px',
              cursor: page === meta.last_page ? 'not-allowed' : 'pointer',
            }}
          >
            Далее →
          </button>
        </div>
      )}
    </div>
  );
}
