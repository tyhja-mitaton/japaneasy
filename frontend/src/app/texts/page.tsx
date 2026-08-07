'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const PER_PAGE = 10;

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

type TextsResponse = {
  data: TextMeta[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export default function Page() {
  const router = useRouter();
  const [texts, setTexts] = useState<TextMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, lang } = useI18n();

  const loadTexts = useCallback(async (pageNum: number, query: string) => {
    const params = new URLSearchParams({ page: String(pageNum) });
    if (query) params.set('search', query);
    const data = await apiFetch(`/api/texts?${params.toString()}`) as TextsResponse;
    setTexts(data.data);
    setTotal(data.meta.total);
    setPage(data.meta.current_page);
    setLastPage(data.meta.last_page);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ page: '1' });
    apiFetch(`/api/texts?${params.toString()}`)
      .then((data: TextsResponse) => {
        setTexts(data.data);
        setTotal(data.meta.total);
        setPage(data.meta.current_page);
        setLastPage(data.meta.last_page);
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const text = await apiFetch('/api/texts', {
        method: 'POST',
        body: JSON.stringify({ content: input }),
      });
      router.push(`/texts/${text.id}`);
    } catch (err: unknown) {
      const e422 = err as { message?: string | string[]; errors?: Record<string, string[]> };
      const msg = Array.isArray(e422?.message)
        ? e422.message[0]
        : e422?.errors
          ? Object.values(e422.errors).flat()[0]
          : e422?.message;
      setError(msg || t.texts.saveError);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTexts(1, searchInput.trim()).catch(() => setError(t.texts.loadError));
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    loadTexts(1, '').catch(() => setError(t.texts.loadError));
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/texts/${id}`, { method: 'DELETE' });
      const newTotal = total - 1;
      if (page > 1 && (page - 1) * PER_PAGE >= newTotal) {
        await loadTexts(page - 1, search);
      } else {
        await loadTexts(page, search);
      }
    } catch {
      setError(t.texts.deleteError);
    }
  };

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #EDE8E1',
    borderRadius: 12,
    padding: '12px 16px',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#1A1A1A',
    background: 'white',
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
            {t.texts.title}
        </div>
        <h1 style={{
          fontFamily: "'Noto Serif JP'",
          fontSize: 'clamp(24px, 3vw, 36px)',
          fontWeight: 700,
          color: '#1A1A1A',
        }}>
            {t.texts.learn}
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
          {error && (
            <div style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(232,96,74,0.08)',
              border: '1px solid rgba(232,96,74,0.25)',
              color: '#D14A35',
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t.texts.placeholder}
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
              {loading ? t.texts.saving : t.texts.analyze}
            </button>
          </div>
        </form>
      </div>

      {/* Search */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '12px 16px',
        border: '1px solid #EDE8E1',
        marginBottom: 16,
      }}>
        <form
          onSubmit={handleSearchSubmit}
          style={{ display: 'flex', gap: 12, alignItems: 'center' }}
        >
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14,
              color: '#B9A88F',
              pointerEvents: 'none',
            }}>🔍</span>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t.texts.searchPlaceholder}
              style={{ ...searchInputStyle, paddingLeft: 42 }}
              onFocus={e => e.target.style.borderColor = '#E8604A'}
              onBlur={e => e.target.style.borderColor = '#EDE8E1'}
            />
          </div>
          <button
            type="submit"
            style={{
              background: '#E8604A',
              color: 'white',
              border: 'none',
              borderRadius: 50,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#D14A35'}
            onMouseLeave={e => e.currentTarget.style.background = '#E8604A'}
          >
            {t.texts.searchButton}
          </button>
          {search && (
            <button
              type="button"
              onClick={clearSearch}
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
              {t.texts.clearSearch}
            </button>
          )}
        </form>
      </div>

      {/* Texts list */}
      {total > 0 ? (
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#8B7355',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
              {t.texts.saved} ({total})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {texts.map(tt => (
              <div
                key={tt.id}
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
                  onClick={() => router.push(`/texts/${tt.id}`)}
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
                    {tt.title}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: '#8B7355',
                  }}>
                    {new Date(tt.created_at).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(tt.id)}
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
                    {t.texts.delete}
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              marginTop: 24,
            }}>
              <button
                onClick={() => loadTexts(page - 1, search)}
                disabled={page <= 1}
                style={{
                  background: 'white',
                  border: '1.5px solid #D4C5B0',
                  borderRadius: 50,
                  padding: '10px 22px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: page <= 1 ? '#D4C5B0' : '#8B7355',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {t.texts.prevPage}
              </button>
              <div style={{ fontSize: 14, color: '#8B7355', minWidth: 110, textAlign: 'center' }}>
                {t.texts.page} {page} {t.texts.of} {lastPage}
              </div>
              <button
                onClick={() => loadTexts(page + 1, search)}
                disabled={page >= lastPage}
                style={{
                  background: 'white',
                  border: '1.5px solid #D4C5B0',
                  borderRadius: 50,
                  padding: '10px 22px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: page >= lastPage ? '#D4C5B0' : '#8B7355',
                  cursor: page >= lastPage ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {t.texts.nextPage}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: '48px 24px',
          border: '2px dashed #EDE8E1',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{search ? '🔍' : '📄'}</div>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1A1A1A',
            marginBottom: 8,
          }}>
              {search ? t.texts.noResults : t.texts.noTexts}
          </div>
          <div style={{
            fontSize: 14,
            color: '#8B7355',
          }}>
            {search
              ? t.texts.searchPlaceholder
              : t.texts.emptyHint}
          </div>
          {search && (
            <button
              onClick={clearSearch}
              style={{
                marginTop: 16,
                background: 'none',
                border: '1.5px solid #E8604A',
                color: '#E8604A',
                borderRadius: 50,
                padding: '10px 22px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#E8604A';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = '#E8604A';
              }}
            >
              {t.texts.clearSearch}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
