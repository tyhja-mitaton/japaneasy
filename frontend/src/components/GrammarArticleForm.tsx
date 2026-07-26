'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

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
    }, [articleId]);

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
        } catch (err: any) {
            setError(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEdit ? 'Edit article' : 'New grammar article'}
                </h1>
                <button
                    onClick={() => router.push('/admin/grammar')}
                    className="text-sm text-gray-500 hover:text-gray-700"
                >
                    ← Back
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            name="title" required value={form.title} onChange={handleChange}
                            placeholder="The Particle は"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Code <span className="text-gray-400 font-normal">(уникальный, a-z, 0-9, дефис)</span>
                        </label>
                        <input
                            name="code" required value={form.code} onChange={handleChange}
                            placeholder="particle-wa"
                            pattern="^[a-z0-9\-]+$"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pattern</label>
                    <input
                        name="pattern" value={form.pattern} onChange={handleChange}
                        placeholder="Паттерн"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brief info</label>
                    <input
                        name="info" value={form.info} onChange={handleChange}
                        placeholder="Краткое описание паттерна"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>


                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">Article text (Markdown)</label>
                        <button
                            type="button"
                            onClick={() => setPreview(p => !p)}
                            className="text-xs text-indigo-600 hover:underline"
                        >
                            {preview ? 'Edit' : 'Preview'}
                        </button>
                    </div>

                    {preview ? (
                        <div
                            className="prose prose-sm max-w-none border border-gray-200 rounded-lg p-4 min-h-64 bg-white">
                            {/* react-markdown рендерит markdown в HTML */}
                            <MarkdownPreview text={form.text}/>
                        </div>
                    ) : (
                        <textarea
                            name="text" required value={form.text} onChange={handleChange}
                            rows={20}
                            placeholder={`## The Particle は\n\nは (wa) is the **topic marker** in Japanese...\n\n### Usage\n\n- Pattern: \`X は Y です\`\n- Example: 私は学生です。`}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit" disabled={loading}
                        className="bg-indigo-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                        {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create article'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/admin/grammar')}
                        className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// Lazy markdown preview — устанавливается: npm install react-markdown
function MarkdownPreview({text}: { text: string }) {
    const [ReactMarkdown, setRM] = useState<any>(null);
    useEffect(() => {
        import('react-markdown').then(m => setRM(() => m.default));
    }, []);
    if (!ReactMarkdown) return <span className="text-gray-400 text-sm">Loading preview…</span>;
    return <ReactMarkdown>{text}</ReactMarkdown>;
}
