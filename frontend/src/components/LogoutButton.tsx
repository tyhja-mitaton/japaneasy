'use client';

import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth-api';

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      router.push('/auth/login');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className={className ?? 'text-sm text-gray-500 hover:text-gray-900 transition'}
    >
      Sign out
    </button>
  );
}
