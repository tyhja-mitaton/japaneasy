'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { useI18n, tf } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type RelatedArticle = {
    id: number;
    code: string;
    title: string;
};

type Article = {
  title: string;
  info?: string;
  text: string;
  code: string;
  related: RelatedArticle[];
};

export default function GrammarArticlePage() {
    const { code } = useParams<{ code: string }>();
    const router = useRouter();
    const { lang, t } = useI18n();
    const [article, setArticle] = useState<Article | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/api/grammar-articles/${code}?lang=${lang}`, {
            headers: { Accept: 'application/json' },
        })
            .then(res => {
                if (res.status === 404) { setNotFound(true); return null; }
                return res.json();
            })
            .then(data => { if (data) setArticle(data); });
    }, [code, lang]);

    if (notFound) return (
        <div style={{
            maxWidth: 640,
            margin: '0 auto',
            padding: '80px 24px',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>📭</div>
            <h1 style={{
                fontFamily: "'Noto Serif JP'",
                fontSize: 28,
                fontWeight: 700,
                color: '#1A1A1A',
                marginBottom: 12,
            }}>
                {t.grammar.notFoundTitle}
            </h1>
            <p style={{
                fontSize: 15,
                color: '#8B7355',
                marginBottom: 32,
            }}>
                {tf(t.grammar.notFoundHint, { code })}
            </p>
            <button
                onClick={() => router.push('/grammar')}
                style={{
                    background: '#E8604A',
                    color: 'white',
                    border: 'none',
                    borderRadius: 50,
                    padding: '14px 28px',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
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
                {t.grammar.backToList}
            </button>
        </div>
    );

    if (!article) return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            color: '#8B7355',
            fontSize: 16,
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>⏳</div>
                {t.common.loading}
            </div>
        </div>
    );

    return (
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '48px 24px' }}>
            {/* Back button */}
            <button
                onClick={() => router.back()}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    color: '#8B7355',
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: 0,
                    transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#E8604A'}
                onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
            >
                {t.grammar.back}
            </button>

            {/* Article header */}
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
                    color: '#2D5A3D',
                }}>
                    <span>📖</span> {t.nav.grammar}
                </div>

                <h1 style={{
                    fontFamily: "'Noto Serif JP'",
                    fontSize: 'clamp(24px, 3vw, 36px)',
                    fontWeight: 700,
                    color: '#1A1A1A',
                    marginBottom: 12,
                    lineHeight: 1.3,
                }}>
                    {article.title}
                </h1>

                {article.info && (
                    <p style={{
                        fontSize: 16,
                        color: '#8B7355',
                        lineHeight: 1.6,
                    }}>
                        {article.info}
                    </p>
                )}
            </div>

            {/* Divider */}
            <div style={{
                height: 1,
                background: '#EDE8E1',
                marginBottom: 32,
            }} />

            {/* Article content */}
            <div style={{
                background: 'white',
                borderRadius: 20,
                border: '1px solid #EDE8E1',
                padding: 32,
            }}>
                <div style={{
                    fontFamily: "'Noto Sans JP', sans-serif",
                    fontSize: 15,
                    lineHeight: 1.8,
                    color: '#1A1A1A',
                }}>
                    <ReactMarkdown>{article.text}</ReactMarkdown>
                </div>
            </div>

            {/* Code badge */}
            {article.related && article.related.length > 0 && (
                <div style={{ marginTop: 32 }}>
                    <h2 style={{
                        fontFamily: "'Noto Serif JP'",
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#1A1A1A',
                        marginBottom: 16,
                    }}>
                        {t.grammar.seeAlso}
                    </h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        {article.related.map(r => (
                            <button
                                key={r.id}
                                onClick={() => router.push(`/grammar/${r.code}`)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    background: 'white',
                                    border: '1px solid #EDE8E1',
                                    borderRadius: 50,
                                    padding: '10px 18px',
                                    fontSize: 14,
                                    color: '#2D5A3D',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = '#2D5A3D';
                                    e.currentTarget.style.background = 'rgba(45,90,61,0.06)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = '#EDE8E1';
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <span>→</span> {r.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div style={{
                marginTop: 24,
                display: 'flex',
                justifyContent: 'center',
            }}>
                <div style={{
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: '#8B7355',
                    background: 'rgba(139,115,85,0.08)',
                    padding: '6px 12px',
                    borderRadius: 20,
                }}>
                    {article.code}
                </div>
            </div>
        </div>
    );
}
