'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

type Dict = {
  id: number;
  name: string;
  slug: string;
  source_lang: string;
  target_lang: string;
  is_active: boolean;
  default_priority: number;
  entries_count: number;
  import_status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  import_progress: number;
  import_error: string | null;
  import_path: string | null;
};

const LANG_FLAG: Record<string, string> = {
  ru: '🇷🇺', en: '🇬🇧', de: '🇩🇪', fr: '🇫🇷', zh: '🇨🇳',
};

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return GREEN;
    case 'processing': return BLUE;
    case 'pending': return '#B45309';
    case 'failed': return CORAL;
    default: return '#8B7355';
  }
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

export default function Page() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const [dicts, setDicts] = useState<Dict[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  // Import form
  const [showImport, setShowImport] = useState(false);
  const [importPath, setImportPath] = useState('');
  const [importForce, setImportForce] = useState(false);
  const [importing, setImporting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const load = () =>
    apiFetch('/api/admin/dictionaries')
      .then(setDicts)
      .catch(() => router.push('/auth/login'));

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const isImporting = dicts.some(d => d.import_status === 'pending' || d.import_status === 'processing');

  const startImport = async () => {
    setImporting(true);
    setNotice(null);
    try {
      await apiFetch('/api/admin/dictionaries/import', {
        method: 'POST',
        body: JSON.stringify({ path: importPath.trim(), force: importForce }),
      });
      setShowImport(false);
      setImportPath('');
      setImportForce(false);

      const poll = () =>
        apiFetch('/api/admin/dictionaries')
          .then(setDicts)
          .catch(() => {});

      await poll();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(poll, 2000);

      setTimeout(() => {
        if (pollRef.current) clearInterval(pollRef.current);
      }, 60000);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setNotice(err?.message ?? t.admin.dictionaries.importError);
    } finally {
      setImporting(false);
    }
  };

  const toggleActive = async (dict: Dict) => {
    const prev = dicts;
    setDicts(prevList => prevList.map(d => d.id === dict.id ? { ...d, is_active: !d.is_active } : d));
    try {
      await apiFetch(`/api/admin/dictionaries/${dict.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !dict.is_active }),
      });
    } catch {
      setDicts(prev);
      setNotice(t.admin.dictionaries.updateError);
    }
  };

  const openEdit = (dict: Dict) => {
    setEditingId(dict.id);
    setEditName(dict.name);
    setEditPriority(String(dict.default_priority));
    setNotice(null);
  };

  const saveEdit = async (dict: Dict) => {
    setSavingEdit(true);
    try {
      const updated = await apiFetch(`/api/admin/dictionaries/${dict.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          default_priority: Number(editPriority),
        }),
      });
      setDicts(prev => prev.map(d => d.id === dict.id ? { ...d, ...updated } : d));
      setEditingId(null);
    } catch {
      setNotice(t.admin.dictionaries.saveError);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (dict: Dict) => {
    if (!confirm(tf(t.admin.dictionaries.deleteConfirm, { name: dict.name }))) return;
    try {
      await apiFetch(`/api/admin/dictionaries/${dict.id}`, { method: 'DELETE' });
      setDicts(prev => prev.filter(d => d.id !== dict.id));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setNotice(err?.message ?? t.admin.dictionaries.deleteError);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <div>
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
            {t.admin.dictionaries.title}
          </h1>
          <div style={{ fontSize: 14, color: '#8B7355', marginTop: 4 }}>
            {t.admin.dictionaries.desc}
          </div>
        </div>
        <button
          onClick={() => setShowImport(v => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: BLUE,
            color: 'white',
            border: 'none',
            borderRadius: 50,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = BLUE_HOVER; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {showImport ? t.admin.dictionaries.hideImport : t.admin.dictionaries.importDict}
        </button>
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

      {/* Import form */}
      {showImport && (
        <div style={{
          background: 'white',
          borderRadius: 20,
          border: '1px solid #EDE8E1',
          padding: 24,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
            {t.admin.dictionaries.importTitle}
          </div>
          <div style={{ fontSize: 13, color: '#8B7355', marginBottom: 16 }}>
            {t.admin.dictionaries.importHint}
          </div>
          <input
            value={importPath}
            onChange={e => setImportPath(e.target.value)}
            placeholder="/var/www/storage/dictionaries/jmdict-ru"
            style={{ ...fieldStyle(), marginBottom: 12 }}
            onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#1A1A1A', cursor: 'pointer', marginBottom: 16 }}>
            <input
              type="checkbox"
              checked={importForce}
              onChange={e => setImportForce(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            {t.admin.dictionaries.forceReimport}
          </label>
          <button
            onClick={startImport}
            disabled={!importPath.trim() || importing}
            style={{
              background: BLUE,
              color: 'white',
              border: 'none',
              borderRadius: 50,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: !importPath.trim() || importing ? 'not-allowed' : 'pointer',
              opacity: !importPath.trim() || importing ? 0.5 : 1,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => { if (importPath.trim() && !importing) e.currentTarget.style.background = BLUE_HOVER; }}
            onMouseLeave={e => { e.currentTarget.style.background = BLUE; }}
          >
            {importing ? t.admin.dictionaries.starting : t.admin.dictionaries.startImport}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 240, color: '#8B7355', fontSize: 16,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>⏳</div>
            {t.common.loading}
          </div>
        </div>
      ) : dicts.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 20,
          border: '2px dashed #EDE8E1',
          padding: '64px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>📚</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
            {t.admin.dictionaries.noDicts}
          </div>
          <div style={{ fontSize: 14, color: '#8B7355', marginBottom: 24 }}>
            {t.admin.dictionaries.noDictsHint}
          </div>
          <button
            onClick={() => setShowImport(true)}
            style={{
              background: BLUE, color: 'white', border: 'none', borderRadius: 50,
              padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t.admin.dictionaries.startImport}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dicts.map(dict => (
            <div key={dict.id}>
              <div
                style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: '18px 22px',
                  border: '1px solid #EDE8E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                  opacity: dict.is_active ? 1 : 0.65,
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#EDE8E1'; }}
              >
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{LANG_FLAG[dict.target_lang] ?? '📖'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A' }}>{dict.name}</span>
                      <span style={{
                        fontSize: 12, fontFamily: 'monospace', color: BLUE,
                        background: 'rgba(59,130,246,0.08)', padding: '3px 8px', borderRadius: 6,
                      }}>
                        {dict.slug}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#8B7355', marginTop: 6 }}>
                      {dict.target_lang.toUpperCase()} · {tf(t.admin.dictionaries.entries, { count: dict.entries_count.toLocaleString(locale) })} · {tf(t.admin.dictionaries.priority, { n: dict.default_priority })}
                    </div>
                    {dict.import_status !== 'idle' && (
                      <div style={{ marginTop: 8 }}>
                        {dict.import_status === 'processing' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: statusColor(dict.import_status) }}>
                              {tf(t.admin.dictionaries.importing, { n: dict.import_progress })}
                            </span>
                          </div>
                        )}
                        {dict.import_status !== 'processing' && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: statusColor(dict.import_status), marginBottom: 6 }}>
                            {t.admin.dictionaries['status' + dict.import_status.charAt(0).toUpperCase() + dict.import_status.slice(1) as 'statusIdle' | 'statusPending' | 'statusProcessing' | 'statusCompleted' | 'statusFailed']}
                          </div>
                        )}
                        {dict.import_status !== 'processing' && (
                          <div style={{ height: 6, borderRadius: 50, background: '#F3EFE9', overflow: 'hidden', maxWidth: 320 }}>
                            <div style={{
                              width: `${dict.import_status === 'completed' ? 100 : dict.import_progress}%`,
                              height: '100%',
                              borderRadius: 50,
                              background: dict.import_status === 'failed' ? CORAL : GREEN,
                            }} />
                          </div>
                        )}
                        {dict.import_status === 'failed' && dict.import_error && (
                          <div style={{ fontSize: 12, color: CORAL, marginTop: 4, wordBreak: 'break-word' }}>
                            {dict.import_error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleActive(dict)}
                    style={{
                      position: 'relative',
                      width: 40,
                      height: 22,
                      borderRadius: 50,
                      border: 'none',
                      background: dict.is_active ? GREEN : '#E5DDD2',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    title={dict.is_active ? t.admin.dictionaries.deactivate : t.admin.dictionaries.activate}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3,
                      left: 0,
                      width: 16,
                      height: 16,
                      borderRadius: 50,
                      background: 'white',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s',
                      transform: dict.is_active ? 'translateX(19px)' : 'translateX(2px)',
                    }} />
                  </button>
                  <Link
                    href={`/admin/dictionaries/${dict.id}`}
                    className="link-hover-bg-blue-soft"
                    style={{
                      fontSize: 14, color: BLUE, textDecoration: 'none',
                      padding: '8px 12px', borderRadius: 8,
                      transition: 'background 0.2s',
                    }}
                  >
                    {t.admin.dictionaries.details}
                  </Link>
                  <button
                    onClick={() => editingId === dict.id ? setEditingId(null) : openEdit(dict)}
                    style={{
                      fontSize: 14, color: BLUE, background: 'none', border: 'none',
                      cursor: 'pointer', padding: '8px 12px', borderRadius: 8,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {editingId === dict.id ? t.admin.dictionaries.cancel : t.admin.dictionaries.edit}
                  </button>
                  <button
                    onClick={() => handleDelete(dict)}
                    style={{
                      fontSize: 14, color: '#8B7355', background: 'none', border: 'none',
                      cursor: 'pointer', padding: '8px 12px', borderRadius: 8,
                      transition: 'color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = CORAL_HOVER; e.currentTarget.style.background = 'rgba(232,96,74,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#8B7355'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    {t.admin.dictionaries.delete}
                  </button>
                </div>
              </div>

              {/* Inline edit */}
              {editingId === dict.id && (
                <div style={{
                  background: '#FBF9F5',
                  borderRadius: 16,
                  border: '1px solid #EDE8E1',
                  borderTop: 'none',
                  padding: '16px 22px',
                  marginTop: -4,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 6 }}>
                        {t.admin.dictionaries.nameField}
                      </label>
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        style={fieldStyle()}
                        onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 6 }}>
                        {t.admin.dictionaries.priorityField}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editPriority}
                        onChange={e => setEditPriority(e.target.value)}
                        style={fieldStyle()}
                        onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => saveEdit(dict)}
                      disabled={savingEdit}
                      style={{
                        background: BLUE, color: 'white', border: 'none', borderRadius: 50,
                        padding: '10px 20px', fontSize: 14, fontWeight: 600,
                        cursor: savingEdit ? 'not-allowed' : 'pointer', opacity: savingEdit ? 0.5 : 1,
                      }}
                    >
                      {savingEdit ? t.common.saving : t.common.save}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        background: 'none', border: '1.5px solid #EDE8E1', borderRadius: 50,
                        padding: '10px 20px', fontSize: 14, color: '#8B7355', cursor: 'pointer',
                      }}
                    >
                      {t.admin.dictionaries.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!loading && dicts.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{
            fontSize: 13, color: '#8B7355', background: 'rgba(59,130,246,0.06)',
            padding: '8px 16px', borderRadius: 20,
          }}>
            {tf(t.admin.dictionaries.total, { count: dicts.length })}
          </div>
          {isImporting && (
            <div style={{
              fontSize: 13, color: BLUE, background: 'rgba(59,130,246,0.06)',
              padding: '8px 16px', borderRadius: 20,
            }}>
              {t.admin.dictionaries.importingLive}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
