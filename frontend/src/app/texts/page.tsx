'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth-api';

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
    <div className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Texts</h1>

      {/* Форма загрузки */}
      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste Japanese text here…"
          rows={6}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-japanese"
        />
        <button
          type="submit" disabled={loading || !input.trim()}
          className="mt-2 bg-indigo-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? 'Saving…' : 'Analyze text →'}
        </button>
      </form>

      {/* Список сохранённых текстов */}
      {texts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Saved texts</h2>
          {texts.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-indigo-300 transition">
              <button
                onClick={() => router.push(`/texts/${t.id}`)}
                className="text-sm text-gray-800 hover:text-indigo-600 text-left flex-1"
              >
                {t.title}
                <span className="ml-3 text-xs text-gray-400">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </button>
              <button
                onClick={() => handleDelete(t.id)}
                className="text-xs text-red-400 hover:text-red-600 ml-4"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
