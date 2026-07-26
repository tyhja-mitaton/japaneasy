'use client';

import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function LogoutButton({ className }: { className?: string }) {
    const router = useRouter();

    const handleExport = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/vocabulary/export/anki`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vocabulary.txt';
        a.click();
    };

    return (
        <button
            onClick={handleExport}
            className={className ?? 'text-sm text-gray-500 hover:text-gray-900 transition'}
        >
            Export to Anki
        </button>
    );
}