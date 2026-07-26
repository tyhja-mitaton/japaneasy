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

export default function Page() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    apiFetch('/api/admin/grammar-articles')
      .then(setArticles)
      .catch(() => router.push('/auth/login'));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this article?')) return;
    await apiFetch(`/api/admin/grammar-articles/${id}`, { method: 'DELETE' });
    setArticles(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Grammar Articles</h1>
        <Link
          href="/admin/grammar/create"
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition"
        >
          + New article
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {articles.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">No articles yet.</div>
        )}
        {articles.map(a => (
          <div key={a.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50 transition">
            <div>
              <div className="font-medium text-gray-900">{a.title}</div>
              <div className="flex gap-3 mt-1">
                <span className="text-xs font-mono text-gray-400">{a.code}</span>
                {a.info && <span className="text-xs text-gray-500 truncate max-w-xs">{a.info}</span>}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {a.author.name} · {new Date(a.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex gap-3 shrink-0 ml-4">
              <Link href={`/admin/grammar/${a.id}/edit`} className="text-sm text-indigo-600 hover:underline">
                Edit
              </Link>
              <button onClick={() => handleDelete(a.id)} className="text-sm text-red-400 hover:text-red-600">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
