'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function GrammarArticlePage() {
    const { code } = useParams<{ code: string }>();
    const router = useRouter();
    const [article, setArticle] = useState<any>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/api/grammar-articles/${code}`, {
            headers: { Accept: 'application/json' },
        })
            .then(res => {
                if (res.status === 404) { setNotFound(true); return null; }
                return res.json();
            })
            .then(data => { if (data) setArticle(data); });
    }, [code]);

    if (notFound) return (
        <div className="max-w-2xl mx-auto py-20 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Article not found</h1>
            <p className="text-gray-500 text-sm">No article exists for code <code className="font-mono">{code}</code> yet.</p>
        </div>
    );

    if (!article) return (
        <div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>
    );

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-6 block">
                ← Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{article.title}</h1>
            {article.info && (
                <p className="text-gray-500 text-sm mb-6">{article.info}</p>
            )}
            <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{article.text}</ReactMarkdown>
            </div>
        </div>
    );
}