'use client';

import { useState } from 'react';
import { authApi } from '@/lib/auth-api';

export default function Page() {
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await authApi.resendVerification();
      setResent(true);
    } catch {
      // токена нет — просто игнорируем
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-500 text-sm mb-6">
          We sent a verification link to your email address.
          Click the link to activate your account.
        </p>

        {resent ? (
          <p className="text-green-600 text-sm">Verification email resent!</p>
        ) : (
          <button
            onClick={handleResend} disabled={loading}
            className="text-indigo-600 text-sm hover:underline disabled:opacity-50"
          >
            {loading ? 'Sending…' : "Didn't receive it? Resend"}
          </button>
        )}
      </div>
    </div>
  );
}
