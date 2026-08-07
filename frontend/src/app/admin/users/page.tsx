'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, tf } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const BLUE = '#2563EB';
const BLUE_HOVER = '#1D4ED8';
const GREEN = '#2D5A3D';
const CORAL = '#E8604A';
const CORAL_HOVER = '#D14A35';

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

type User = {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  country: string | null;
  plan: 'free' | 'standard' | 'premium';
  subscription_period: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  roles: string[];
};

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

const PLAN_LABEL: Record<string, string> = { free: 'Free', standard: 'Standard', premium: 'Premium' };
const PLAN_COLOR: Record<string, string> = { free: '#8B7355', standard: BLUE, premium: GREEN };
const PLAN_BG: Record<string, string> = {
  free: 'rgba(139,115,85,0.1)',
  standard: 'rgba(59,130,246,0.1)',
  premium: 'rgba(45,90,61,0.1)',
};
const ROLE_LABEL: Record<string, string> = { user: 'user', manager: 'manager', administrator: 'administrator' };
const ROLE_COLOR: Record<string, string> = { user: '#8B7355', manager: BLUE, administrator: CORAL };
const ROLE_BG: Record<string, string> = {
  user: 'rgba(139,115,85,0.1)',
  manager: 'rgba(59,130,246,0.08)',
  administrator: 'rgba(232,96,74,0.1)',
};

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';
}

function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function fieldStyle(): React.CSSProperties {
  return {
    width: '100%',
    border: '1px solid #EDE8E1',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 14,
    fontFamily: "'Noto Sans JP', sans-serif",
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    color: '#1A1A1A',
    background: 'white',
  };
}

const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>, on: boolean) => {
  e.currentTarget.style.borderColor = on ? BLUE : '#EDE8E1';
  e.currentTarget.style.boxShadow = on ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none';
};

type EditState = {
  name: string;
  email: string;
  plan: string;
  period: string;
  ends_at: string;
  roles: string[];
};

export default function Page() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(res => { if (!res.ok) throw new Error('unauthorized'); return res.json(); })
      .then(me => setCurrentUserId(me.id))
      .catch(() => router.push('/auth/login'));
  }, [router]);

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page) });
    if (search) qs.set('search', search);
    apiFetch(`/api/admin/users?${qs.toString()}`)
      .then(res => { setUsers(res.data ?? []); setMeta(res.meta ?? null); })
      .catch(() => router.push('/auth/login'));
  }, [page, search, router]);

  const runSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const openEdit = (user: User) => {
    setEditingId(user.id);
    setEdit({
      name: user.name,
      email: user.email,
      plan: user.plan,
      period: user.subscription_period ?? '',
      ends_at: user.subscription_ends_at ? user.subscription_ends_at.slice(0, 10) : '',
      roles: user.roles.length ? user.roles : ['user'],
    });
    setNotice(null);
  };

  const toggleRole = (role: string) => {
    if (!edit) return;
    setEdit(prev => {
      if (!prev) return prev;
      const has = prev.roles.includes(role);
      const next = has ? prev.roles.filter(r => r !== role) : [...prev.roles, role];
      return { ...prev, roles: next.length ? next : ['user'] };
    });
  };

  const saveEdit = async (user: User) => {
    if (!edit) return;
    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = {
        name: edit.name.trim(),
        email: edit.email.trim(),
        plan: edit.plan,
        roles: edit.roles,
      };
      if (edit.plan !== 'free') {
        body.subscription_period = edit.period || null;
        body.subscription_ends_at = edit.ends_at || null;
      }
      const updated = await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
      setEditingId(null);
      setNotice(null);
    } catch (e: unknown) {
      const err = e as { message?: string; errors?: Record<string, string[]> };
      const msg = err?.message || (err?.errors ? Object.values(err.errors).flat()[0] : undefined);
      setNotice(msg ?? t.admin.users.saveError);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(tf(t.admin.users.deleteConfirm, { name: user.name }))) return;
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== user.id));
      if (users.length === 1 && page > 1) setPage(p => p - 1);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setNotice(err?.message ?? t.admin.users.deleteError);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(59,130,246,0.1)',
          borderRadius: 50,
          padding: '6px 14px',
          marginBottom: 12,
          fontSize: 13,
          fontWeight: 500,
          color: BLUE,
        }}>
          <span>⚙️</span> {t.nav.adminPanel}
        </div>
        <h1 style={{
          fontFamily: "'Noto Serif JP'",
          fontSize: 'clamp(24px, 3vw, 32px)',
          fontWeight: 700,
          color: '#1A1A1A',
        }}>
          {t.admin.users.title}
        </h1>
        <div style={{ fontSize: 14, color: '#8B7355', marginTop: 4 }}>
          {t.admin.users.desc}
        </div>
      </div>

      {notice && (
        <div style={{
          marginBottom: 16,
          padding: '12px 16px',
          background: 'rgba(232,96,74,0.08)',
          border: '1px solid rgba(232,96,74,0.25)',
          borderRadius: 14,
          fontSize: 13,
          color: '#B3261E',
          lineHeight: 1.5,
        }}>
          {notice}
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') runSearch(); }}
          placeholder={t.admin.users.searchPlaceholder}
          style={{ ...fieldStyle(), maxWidth: 360 }}
          onFocus={e => inputFocus(e, true)}
          onBlur={e => inputFocus(e, false)}
        />
        <button
          onClick={runSearch}
          style={{
            background: BLUE, color: 'white', border: 'none', borderRadius: 50,
            padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = BLUE_HOVER; }}
          onMouseLeave={e => { e.currentTarget.style.background = BLUE; }}
        >
          {t.admin.users.find}
        </button>
        {search && (
          <button
            onClick={() => { setSearch(''); setSearchInput(''); }}
            style={{
              background: 'none', border: '1.5px solid #EDE8E1', borderRadius: 50,
              padding: '10px 20px', fontSize: 14, color: '#8B7355', cursor: 'pointer',
            }}
          >
            {t.admin.users.reset}
          </button>
        )}
      </div>

      {/* Users list */}
      {users.length === 0 && meta ? (
        <div style={{
          background: 'white',
          borderRadius: 20,
          border: '2px dashed #EDE8E1',
          padding: '64px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>👥</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
            {search ? t.admin.users.noResults : t.admin.users.noUsers}
          </div>
          <div style={{ fontSize: 14, color: '#8B7355' }}>
            {search ? t.admin.users.noResultsHint : t.admin.users.noUsersHint}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {users.map(user => (
            <div key={user.id}>
              <div
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: '18px 22px',
                  border: '1px solid #EDE8E1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#EDE8E1'; }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 50, flexShrink: 0,
                  background: 'rgba(232,96,74,0.12)',
                  color: CORAL, fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {initials(user.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>{user.name}</span>
                    {user.id === currentUserId && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: BLUE,
                        background: 'rgba(59,130,246,0.08)', padding: '2px 8px', borderRadius: 20,
                      }}>
                        {t.admin.users.itIsYou}
                      </span>
                    )}
                    {user.roles.map(role => (
                      <span key={role} style={{
                        fontSize: 11, fontWeight: 600, color: ROLE_COLOR[role] ?? '#8B7355',
                        background: ROLE_BG[role] ?? 'rgba(139,115,85,0.1)',
                        padding: '3px 10px', borderRadius: 20,
                      }}>
                        {ROLE_LABEL[role] ?? role}
                      </span>
                    ))}
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: PLAN_COLOR[user.plan] ?? '#8B7355',
                      background: PLAN_BG[user.plan] ?? 'rgba(139,115,85,0.1)',
                      padding: '3px 10px', borderRadius: 20,
                    }}>
                      {PLAN_LABEL[user.plan] ?? user.plan}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#8B7355', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                    {user.country && ` · ${user.country}`}
                    {!user.email_verified_at && (
                      <span style={{ color: '#B45309' }}> · {t.admin.users.emailNotVerified}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#B9A88F', marginTop: 4 }}>
                    {tf(t.admin.users.registered, { date: formatDate(user.created_at, locale) })}
                    {user.subscription_ends_at && (
                      <> · {tf(t.admin.users.subUntil, { date: formatDate(user.subscription_ends_at, locale) })}</>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => editingId === user.id ? setEditingId(null) : openEdit(user)}
                    style={{
                      fontSize: 14, color: BLUE, background: 'none', border: 'none',
                      cursor: 'pointer', padding: '8px 12px', borderRadius: 8,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {editingId === user.id ? t.admin.users.cancel : t.admin.users.edit}
                  </button>
                  {user.id !== currentUserId && (
                    <button
                      onClick={() => handleDelete(user)}
                      style={{
                        fontSize: 14, color: '#8B7355', background: 'none', border: 'none',
                        cursor: 'pointer', padding: '8px 12px', borderRadius: 8,
                        transition: 'color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = CORAL_HOVER; e.currentTarget.style.background = 'rgba(232,96,74,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#8B7355'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      {t.admin.users.delete}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit */}
              {editingId === user.id && edit && (
                <div style={{
                  background: '#FBF9F5',
                  borderRadius: 16,
                  border: '1px solid #EDE8E1',
                  borderTop: 'none',
                  padding: '16px 22px',
                  marginTop: -4,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 6 }}>{t.admin.users.nameField}</label>
                      <input value={edit.name} onChange={e => setEdit(prev => prev ? { ...prev, name: e.target.value } : prev)} style={fieldStyle()} onFocus={e => inputFocus(e, true)} onBlur={e => inputFocus(e, false)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 6 }}>{t.admin.users.emailField}</label>
                      <input value={edit.email} onChange={e => setEdit(prev => prev ? { ...prev, email: e.target.value } : prev)} style={fieldStyle()} onFocus={e => inputFocus(e, true)} onBlur={e => inputFocus(e, false)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 6 }}>{t.admin.users.planField}</label>
                      <select value={edit.plan} onChange={e => setEdit(prev => prev ? { ...prev, plan: e.target.value } : prev)} style={fieldStyle()} onFocus={e => inputFocus(e, true)} onBlur={e => inputFocus(e, false)}>
                        <option value="free">Free</option>
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                    {edit.plan !== 'free' && (
                      <>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 6 }}>{t.admin.users.periodField}</label>
                          <select value={edit.period} onChange={e => setEdit(prev => prev ? { ...prev, period: e.target.value } : prev)} style={fieldStyle()} onFocus={e => inputFocus(e, true)} onBlur={e => inputFocus(e, false)}>
                            <option value="">{t.admin.users.noPeriod}</option>
                            <option value="1m">{t.admin.users.period1m}</option>
                            <option value="3m">{t.admin.users.period3m}</option>
                            <option value="6m">{t.admin.users.period6m}</option>
                            <option value="12m">{t.admin.users.period12m}</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 6 }}>{t.admin.users.endsAt}</label>
                          <input type="date" value={edit.ends_at} onChange={e => setEdit(prev => prev ? { ...prev, ends_at: e.target.value } : prev)} style={fieldStyle()} onFocus={e => inputFocus(e, true)} onBlur={e => inputFocus(e, false)} />
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 8 }}>{t.admin.users.roleField}</div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {(['user', 'manager', 'administrator'] as const).map(role => (
                        <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#1A1A1A', cursor: 'pointer' }}>
                          <input type="checkbox" checked={edit.roles.includes(role)} onChange={() => toggleRole(role)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                          {ROLE_LABEL[role]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => saveEdit(user)}
                      disabled={savingEdit}
                      style={{
                        background: BLUE, color: 'white', border: 'none', borderRadius: 50,
                        padding: '10px 20px', fontSize: 14, fontWeight: 600,
                        cursor: savingEdit ? 'not-allowed' : 'pointer', opacity: savingEdit ? 0.5 : 1,
                      }}
                    >
                      {savingEdit ? t.admin.users.saving : t.admin.users.save}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        background: 'none', border: '1.5px solid #EDE8E1', borderRadius: 50,
                        padding: '10px 20px', fontSize: 14, color: '#8B7355', cursor: 'pointer',
                      }}
                    >
                      {t.admin.users.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{
              fontSize: 14,
              color: page === 1 ? '#D4C5B0' : BLUE,
              background: 'none',
              border: '1px solid #EDE8E1',
              borderRadius: 50,
              padding: '8px 16px',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.admin.users.prev}
          </button>
          {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => setPage(n)}
              style={{
                width: 36, height: 36,
                fontSize: 14,
                fontWeight: n === page ? 600 : 400,
                color: n === page ? 'white' : '#1A1A1A',
                background: n === page ? BLUE : 'transparent',
                border: n === page ? 'none' : '1px solid #EDE8E1',
                borderRadius: 50,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {n}
            </button>
          ))}
          <button
            disabled={page === meta.last_page}
            onClick={() => setPage(p => p + 1)}
            style={{
              fontSize: 14,
              color: page === meta.last_page ? '#D4C5B0' : BLUE,
              background: 'none',
              border: '1px solid #EDE8E1',
              borderRadius: 50,
              padding: '8px 16px',
              cursor: page === meta.last_page ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.admin.users.next}
          </button>
        </div>
      )}

      {/* Stats */}
      {meta && users.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            fontSize: 13, color: '#8B7355', background: 'rgba(59,130,246,0.06)',
            padding: '8px 16px', borderRadius: 20,
          }}>
            {tf(t.admin.users.total, { total: meta.total })}
          </div>
        </div>
      )}
    </div>
  );
}
