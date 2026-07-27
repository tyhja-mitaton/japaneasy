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

type MarkdownComponent = React.ComponentType<{ children: string }>;

// Этот компонент используется и для создания, и для редактирования.
// Если props.articleId передан — режим редактирования.
export default function GrammarArticleForm({ articleId }: { articleId?: number }) {
    const router = useRouter();
    const [form, setForm] = useState({ title: '', code: '', info: '', text: '', pattern: '' });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(false);
    const isEdit = !!articleId;

    useEffect(() => {
        if (!isEdit) return;
        apiFetch(`/api/admin/grammar-articles/${articleId}`)
            .then(a => setForm({ title: a.title, code: a.code, info: a.info ?? '', text: a.text, pattern: a.pattern ?? '' }))
            .catch(() => router.push('/admin/grammar'));
    }, [articleId, isEdit, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (isEdit) {
                await apiFetch(`/api/admin/grammar-articles/${articleId}`, {
                    method: 'PUT',
                    body: JSON.stringify(form),
                });
            } else {
                await apiFetch('/api/admin/grammar-articles', {
                    method: 'POST',
                    body: JSON.stringify(form),
                });
            }
            router.push('/admin/grammar');
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

    const monoInputStyle: React.CSSProperties = {
        ...inputStyle,
        fontFamily: 'monospace',
        fontSize: 14,
    };

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                    <button
                        onClick={() => router.push('/admin/grammar')}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 14,
                            color: '#8B7355',
                            marginBottom: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: 0,
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#2563EB'}
                        onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
                    >
                        ← К списку статей
                    </button>
                    <h1 style={{
                        fontFamily: "'Noto Serif JP'",
                        fontSize: 'clamp(24px, 3vw, 32px)',
                        fontWeight: 700,
                        color: '#1A1A1A',
                    }}>
                        {isEdit ? 'Редактирование статьи' : 'Новая статья'}
                    </h1>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    marginBottom: 24,
                    padding: '14px 18px',
                    borderRadius: 12,
                    background: 'rgba(232,96,74,0.08)',
                    color: '#D14A35',
                    fontSize: 14,
                }}>
                    {error}
                </div>
            )}

            {/* Form card */}
            <div style={{
                background: 'white',
                borderRadius: 20,
                border: '1px solid #EDE8E1',
                padding: 32,
            }}>
                <form onSubmit={handleSubmit}>
                    {/* Title & Code row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#1A1A1A',
                                marginBottom: 8,
                            }}>
                                Заголовок
                            </label>
                            <input
                                name="title"
                                required
                                value={form.title}
                                onChange={handleChange}
                                placeholder="Частица は"
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = '#2563EB'}
                                onBlur={e => e.target.style.borderColor = '#EDE8E1'}
                            />
                        </div>
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#1A1A1A',
                                marginBottom: 8,
                            }}>
                                Код <span style={{ color: '#8B7355', fontWeight: 400 }}>(уникальный, a-z, 0-9, дефис)</span>
                            </label>
                            <input
                                name="code"
                                required
                                value={form.code}
                                onChange={handleChange}
                                placeholder="particle-wa"
                                pattern="^[a-z0-9\-]+$"
                                style={monoInputStyle}
                                onFocus={e => e.target.style.borderColor = '#2563EB'}
                                onBlur={e => e.target.style.borderColor = '#EDE8E1'}
                            />
                        </div>
                    </div>

                    {/* Pattern */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{
                            display: 'block',
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#1A1A1A',
                            marginBottom: 8,
                        }}>
                            Паттерн
                        </label>
                        <input
                            name="pattern"
                            value={form.pattern}
                            onChange={handleChange}
                            placeholder="~は~です"
                            style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#2563EB'}
                            onBlur={e => e.target.style.borderColor = '#EDE8E1'}
                        />
                    </div>

                    {/* Info */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={{
                            display: 'block',
                            fontSize: 14,
                            fontWeight: 500,
                            color: '#1A1A1A',
                            marginBottom: 8,
                        }}>
                            Краткое описание
                        </label>
                        <input
                            name="info"
                            value={form.info}
                            onChange={handleChange}
                            placeholder="Краткое описание паттерна"
                            style={inputStyle}
                            onFocus={e => e.target.style.borderColor = '#2563EB'}
                            onBlur={e => e.target.style.borderColor = '#EDE8E1'}
                        />
                    </div>

                    {/* Markdown editor */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <label style={{
                                display: 'block',
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#1A1A1A',
                            }}>
                                Текст статьи (Markdown)
                            </label>
                            <button
                                type="button"
                                onClick={() => setPreview(p => !p)}
                                style={{
                                    fontSize: 13,
                                    color: '#2563EB',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#1D4ED8'}
                                onMouseLeave={e => e.currentTarget.style.color = '#2563EB'}
                            >
                                {preview ? 'Редактировать' : 'Предпросмотр'}
                            </button>
                        </div>

                        {preview ? (
                            <div style={{
                                border: '1px solid #EDE8E1',
                                borderRadius: 12,
                                padding: 20,
                                minHeight: 320,
                                background: 'white',
                                fontFamily: "'Noto Sans JP', sans-serif",
                                fontSize: 15,
                                lineHeight: 1.8,
                                color: '#1A1A1A',
                            }}>
                                <MarkdownPreview text={form.text} />
                            </div>
                        ) : (
                            <textarea
                                name="text"
                                required
                                value={form.text}
                                onChange={handleChange}
                                rows={18}
                                placeholder={`## Частица は\n\nは (wa) — частица темы в японском языке...\n\n### Использование\n\n- Паттерн: \`X は Y です\`\n- Пример: 私は学生です。`}
                                style={{
                                    ...monoInputStyle,
                                    minHeight: 320,
                                    resize: 'vertical',
                                }}
                                onFocus={e => e.target.style.borderColor = '#2563EB'}
                                onBlur={e => e.target.style.borderColor = '#EDE8E1'}
                            />
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: loading ? '#93C5FD' : '#2563EB',
                                color: 'white',
                                border: 'none',
                                borderRadius: 50,
                                padding: '14px 28px',
                                fontSize: 15,
                                fontWeight: 600,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'background 0.2s, transform 0.15s',
                            }}
                            onMouseEnter={e => {
                                if (!loading) {
                                    e.currentTarget.style.background = '#1D4ED8';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!loading) {
                                    e.currentTarget.style.background = '#2563EB';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }
                            }}
                        >
                            {loading ? 'Сохранение…' : isEdit ? 'Сохранить изменения' : 'Создать статью'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/admin/grammar')}
                            style={{
                                background: 'none',
                                border: '1.5px solid #EDE8E1',
                                borderRadius: 50,
                                padding: '13px 26px',
                                fontSize: 14,
                                fontWeight: 500,
                                color: '#8B7355',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s, color 0.2s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#8B7355';
                                e.currentTarget.style.color = '#1A1A1A';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#EDE8E1';
                                e.currentTarget.style.color = '#8B7355';
                            }}
                        >
                            Отмена
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Lazy markdown preview
function MarkdownPreview({ text }: { text: string }) {
    const [ReactMarkdown, setRM] = useState<MarkdownComponent | null>(null);
    useEffect(() => {
        import('react-markdown').then(m => setRM(() => m.default));
    }, []);
    if (!ReactMarkdown) return <span style={{ color: '#8B7355', fontSize: 14 }}>Загрузка предпросмотра…</span>;
    return <ReactMarkdown>{text}</ReactMarkdown>;
}
