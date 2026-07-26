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
  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
}

export const authApi = {
  register: (body: { name: string; email: string; password: string; password_confirmation: string; country?: string }) =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    apiFetch('/api/auth/logout', { method: 'POST' }),

  me: () =>
    apiFetch('/api/auth/me'),

  forgotPassword: (email: string) =>
    apiFetch('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (body: { token: string; email: string; password: string; password_confirmation: string }) =>
    apiFetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  resendVerification: () =>
    apiFetch('/api/auth/resend-verification', { method: 'POST' }),
};
