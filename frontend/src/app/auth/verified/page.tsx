'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VerifiedPage() {
    const params = useSearchParams();
    const status = params.get('status');

    const content = {
        success: { icon: '✅', title: 'Email verified!', text: 'Your account is now active.' },
        expired: { icon: '⏰', title: 'Link expired', text: 'Please request a new verification email.' },
        error:   { icon: '❌', title: 'Invalid link', text: 'This verification link is invalid.' },
    }[status ?? 'error'] ?? { icon: '❌', title: 'Something went wrong', text: '' };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
                <div className="text-5xl mb-4">{content.icon}</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{content.title}</h1>
                <p className="text-gray-500 text-sm mb-6">{content.text}</p>
                <Link href="/auth/login" className="text-indigo-600 text-sm hover:underline">
                    Go to sign in
                </Link>
            </div>
        </div>
    );
}