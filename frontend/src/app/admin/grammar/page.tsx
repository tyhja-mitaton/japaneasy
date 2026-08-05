'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

type Article = {
  id: number; title: string; code: string;
  info: string | null; created_at: string;
  author: { id: number; name: string };
};

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export default function Page() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page) });
    if (search) qs.set('search', search);
    apiFetch(`/api/admin/grammar-articles?${qs.toString()}`)
      .then(res => { setArticles(res.data ?? []); setMeta(res.meta ?? null); })
      .catch(() => router.push('/auth/login'));
  }, [page, search, router]);

  const runSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту статью?')) return;
    await apiFetch(`/api/admin/grammar-articles/${id}`, { method: 'DELETE' });
    setArticles(prev => prev.filter(a => a.id !== id));
    if (articles.length === 1 && page > 1) setPage(p => p - 1);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
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
            color: '#2563EB',
          }}>
            <span>⚙️</span> Админ-панель
          </div>
          <h1 style={{
            fontFamily: "'Noto Serif JP'",
            fontSize: 'clamp(24px, 3vw, 32px)',
            fontWeight: 700,
            color: '#1A1A1A',
          }}>
            Грамматические статьи
          </h1>
        </div>
        <Link
          href="/admin/grammar/create"
          className="link-hover-bg-blue"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#2563EB',
            color: 'white',
            border: 'none',
            borderRadius: 50,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background 0.2s, transform 0.15s',
          }}
        >
          <span>+</span> Новая статья
        </Link>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
          placeholder="Поиск по названию или коду…"
          style={{
            width: '100%',
            maxWidth: 360,
            border: '1px solid #EDE8E1',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 14,
            fontFamily: "'Noto Sans JP', sans-serif",
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            color: '#1A1A1A',
            background: 'white',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        <button
          onClick={runSearch}
          style={{
            background: '#2563EB', color: 'white', border: 'none', borderRadius: 50,
            padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1D4ED8'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2563EB'; }}
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
      </div>

      {/* Articles list */}
      {articles.length === 0 && meta ? (
        <div style={{
          background: 'white',
          borderRadius: 20,
          border: '2px dashed #EDE8E1',
          padding: '64px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>📝</div>
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#1A1A1A',
            marginBottom: 8,
          }}>
            {search ? 'Ничего не найдено' : 'Нет статей'}
          </div>
          <div style={{
            fontSize: 14,
            color: '#8B7355',
            marginBottom: 24,
          }}>
            {search ? 'Попробуйте изменить поисковый запрос' : 'Создайте первую грамматическую статью'}
          </div>
          {!search && (
            <Link
              href="/admin/grammar/create"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#2563EB',
                color: 'white',
                border: 'none',
                borderRadius: 50,
                padding: '12px 24px',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Создать статью
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {articles.map(a => (
            <div
              key={a.id}
              style={{
                background: 'white',
                borderRadius: 16,
                padding: '20px 24px',
                border: '1px solid #EDE8E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'box-shadow 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#BFDBFE';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#EDE8E1';
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1A1A1A',
                  marginBottom: 6,
                }}>
                  {a.title}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}>
                  <span style={{
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: '#2563EB',
                    background: 'rgba(59,130,246,0.08)',
                    padding: '3px 8px',
                    borderRadius: 6,
                  }}>
                    {a.code}
                  </span>
                  {a.info && (
                    <span style={{
                      fontSize: 13,
                      color: '#8B7355',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 300,
                    }}>
                      {a.info}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#8B7355',
                  marginTop: 8,
                }}>
                  {a.author.name} · {new Date(a.created_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
                marginLeft: 16,
              }}>
                <Link
                  href={`/admin/grammar/${a.id}/edit`}
                  className="link-hover-bg-blue-soft"
                  style={{
                    fontSize: 14,
                    color: '#2563EB',
                    textDecoration: 'none',
                    padding: '8px 12px',
                    borderRadius: 8,
                    transition: 'background 0.2s',
                  }}
                >
                  Редактировать
                </Link>
                <button
                  onClick={() => handleDelete(a.id)}
                  style={{
                    fontSize: 14,
                    color: '#8B7355',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: 8,
                    transition: 'color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = '#D14A35';
                    e.currentTarget.style.background = 'rgba(232,96,74,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = '#8B7355';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination & Stats */}
      {meta && meta.last_page > 1 && (
        <div style={{
          marginTop: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}>
          {/* Prev */}
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{
              fontSize: 14,
              color: page === 1 ? '#D4C5B0' : '#2563EB',
              background: 'none',
              border: '1px solid #EDE8E1',
              borderRadius: 50,
              padding: '8px 16px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (page !== 1) { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.background = 'none';
            }}
          >
            ← Назад
          </button>

          {/* Page numbers */}
          {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              style={{
                width: 36, height: 36,
                fontSize: 14,
                fontWeight: n === page ? 600 : 400,
                color: n === page ? 'white' : '#1A1A1A',
                background: n === page ? '#2563EB' : 'transparent',
                border: n === page ? 'none' : '1px solid #EDE8E1',
                borderRadius: 50,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (n !== page) { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.color = '#2563EB'; }
              }}
              onMouseLeave={e => {
                if (n !== page) { e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.color = '#1A1A1A'; }
              }}
            >
              {n}
            </button>
          ))}

          {/* Next */}
          <button
            disabled={page === meta.last_page}
            onClick={() => setPage(p => p + 1)}
            style={{
              fontSize: 14,
              color: page === meta.last_page ? '#D4C5B0' : '#2563EB',
              background: 'none',
              border: '1px solid #EDE8E1',
              borderRadius: 50,
              padding: '8px 16px',
              cursor: page === meta.last_page ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (page !== meta.last_page) { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.background = 'none';
            }}
          >
            Далее →
          </button>
        </div>
      )}

      {/* Stats */}
      {meta && articles.length > 0 && (
        <div style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 13,
            color: '#8B7355',
            background: 'rgba(59,130,246,0.06)',
            padding: '8px 16px',
            borderRadius: 20,
          }}>
            Всего статей: {meta.total}
          </div>
        </div>
      )}
    </div>
  );
}
