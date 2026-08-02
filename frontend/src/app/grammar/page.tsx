'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Article = {
  id: number; title: string; code: string;
  info: string | null;
  title_en: string | null;
  info_en: string | null;
};

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

const GREEN = '#2D5A3D';

export default function GrammarIndexPage() {
  const router = useRouter();
  const { lang } = useI18n();
  const [articles, setArticles] = useState<Article[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/grammar-articles?page=${page}`, {
      headers: { Accept: 'application/json' },
    })
      .then(res => res.json())
      .then(res => { setArticles(res.data ?? []); setMeta(res.meta ?? null); })
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(45,90,61,0.1)',
          borderRadius: 50,
          padding: '6px 14px',
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 500,
          color: GREEN,
        }}>
          <span>📖</span> Грамматика
        </div>
        <h1 style={{
          fontFamily: "'Noto Serif JP'",
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 700,
          color: '#1A1A1A',
          marginBottom: 8,
        }}>
          Справочник по японской грамматике
        </h1>
        <p style={{ fontSize: 15, color: '#8B7355' }}>
          Разборы конструкций и частиц. Выберите тему, чтобы прочитать статью.
        </p>
      </div>

      {/* Articles list */}
      {loading ? (
        <div style={{ fontSize: 14, color: '#8B7355', padding: '24px 0' }}>Загрузка…</div>
      ) : articles.length === 0 && meta ? (
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
            Нет статей
          </div>
          <div style={{ fontSize: 14, color: '#8B7355' }}>
            Статьи появятся здесь после публикации
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {articles.map(a => {
            const isEn = lang === 'en';
            const title = isEn && a.title_en ? a.title_en : a.title;
            const info = isEn && a.info_en ? a.info_en : a.info;

            return (
            <button
              key={a.id}
              onClick={() => router.push(`/grammar/${a.code}`)}
              style={{
                background: 'white',
                borderRadius: 16,
                padding: '20px 24px',
                border: '1px solid #EDE8E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = 'rgba(45,90,61,0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#EDE8E1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#1A1A1A',
                  marginBottom: 6,
                }}>
                  {title}
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
                    color: GREEN,
                    background: 'rgba(45,90,61,0.08)',
                    padding: '3px 8px',
                    borderRadius: 6,
                  }}>
                    {a.code}
                  </span>
                  {info && (
                    <span style={{
                      fontSize: 13,
                      color: '#8B7355',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 420,
                    }}>
                      {info}
                    </span>
                  )}
                </div>
              </div>
              <span style={{
                fontSize: 18,
                color: GREEN,
                flexShrink: 0,
                marginLeft: 16,
              }}>→</span>
            </button>
            );
          })}
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
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{
              fontSize: 14,
              color: page === 1 ? '#D4C5B0' : GREEN,
              background: 'none',
              border: '1px solid #EDE8E1',
              borderRadius: 50,
              padding: '8px 16px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (page !== 1) { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.background = 'rgba(45,90,61,0.06)'; }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.background = 'none';
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
                background: n === page ? GREEN : 'transparent',
                border: n === page ? 'none' : '1px solid #EDE8E1',
                borderRadius: 50,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (n !== page) { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.color = GREEN; }
              }}
              onMouseLeave={e => {
                if (n !== page) { e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.color = '#1A1A1A'; }
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
              color: page === meta.last_page ? '#D4C5B0' : GREEN,
              background: 'none',
              border: '1px solid #EDE8E1',
              borderRadius: 50,
              padding: '8px 16px',
              cursor: page === meta.last_page ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (page !== meta.last_page) { e.currentTarget.style.borderColor = GREEN; e.currentTarget.style.background = 'rgba(45,90,61,0.06)'; }
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
            background: 'rgba(45,90,61,0.06)',
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
