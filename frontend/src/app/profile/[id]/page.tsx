'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/lib/i18n';

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

type Me = {
  id: number;
  name: string;
  email: string;
  plan?: string;
  subscription_period?: string | null;
  subscription_ends_at?: string | null;
  is_premium?: boolean;
};

type TextMeta = { id: number; title: string; created_at: string };

type TextFull = TextMeta & { content: string };

type VocabItem = {
  id: number;
  surface: string;
  base_form: string;
  reading: string | null;
  pos: string | null;
  translation: string | null;
  context_sentence: string | null;
  created_at: string;
};

type Tab = 'texts' | 'vocabulary' | 'subscription' | 'settings';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();

  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>('texts');
  const [loading, setLoading] = useState(true);

  const [texts, setTexts] = useState<TextMeta[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState<TextFull | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const [vocabulary, setVocabulary] = useState<VocabItem[]>([]);
  const [now, setNow] = useState(0);
  const TABS: { key: Tab; label: string }[] = [
    { key: 'texts', label: t.texts.title },
    { key: 'vocabulary', label: t.vocabulary.title },
    { key: 'subscription', label: t.plans.subscription },
    { key: 'settings', label: t.settings.title },
  ];

  useEffect(() => {
    Promise.all([apiFetch('/api/auth/me'), apiFetch('/api/texts'), apiFetch('/api/vocabulary')])
      .then(([user, userTexts, vocab]) => {
        setMe(user);
        setTexts(userTexts);
        setVocabulary(vocab);
        setNow(Date.now());
        if (String(user.id) !== id) {
          router.replace(`/profile/${user.id}`);
        }
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false));
  }, [id, router]);

  // ── Тексты ──────────────────────────────────────────────────────────────────

  const startEdit = async (t: TextMeta) => {
    const full = await apiFetch(`/api/texts/${t.id}`);
    setEditingId(t.id);
    setEditText(full);
    setEditTitle(full.title ?? '');
    setEditContent(full.content ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText(null);
  };

  const saveEdit = async () => {
    if (!editText || !editContent.trim()) return;
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/texts/${editText.id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      setTexts(prev => prev.map(t => (t.id === updated.id ? {
        id: updated.id,
        title: updated.title,
        created_at: updated.created_at,
      } : t)));
      cancelEdit();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteText = async (textId: number) => {
    await apiFetch(`/api/texts/${textId}`, { method: 'DELETE' });
    setTexts(prev => prev.filter(t => t.id !== textId));
    if (editingId === textId) cancelEdit();
  };

  // ── Словарь ─────────────────────────────────────────────────────────────────

  const handleDownload = async (path: string, filename: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw await res.json();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const detail = e instanceof Error ? e.message : JSON.stringify(e);
      alert(`Не удалось экспортировать: ${detail}`);
    }
  };

  const handleExportCsv = () => handleDownload('/api/vocabulary/export/csv', 'vocabulary.csv');

  const handleExportAnki = () => handleDownload('/api/vocabulary/export/anki', 'vocabulary.txt');

  const handleDeleteWord = async (wordId: number) => {
    await apiFetch(`/api/vocabulary/${wordId}`, { method: 'DELETE' });
    setVocabulary(prev => prev.filter(v => v.id !== wordId));
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: '#8B7355',
        fontSize: 16,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>⏳</div>
          Загрузка…
        </div>
      </div>
    );
  }

  const initial = (me?.name || 'Я').charAt(0).toUpperCase();

  const FEATURES_BY_PLAN: Record<string, string[]> = {
    standard: ['До 50 текстов в месяц', 'Расширенный словарь', 'Все упражнения', 'Аудио и видео с субтитрами'],
    premium: ['Неограниченная загрузка текстов', 'Полный доступ ко всем функциям', 'Персональная статистика', 'Приоритетная поддержка'],
  };

  const subscriptionActive =
    !!me?.plan
    && me.plan !== 'free'
    && !!me.subscription_ends_at
    && new Date(me.subscription_ends_at).getTime() > now;

  const planLabel = subscriptionActive
    ? me?.plan === 'premium' ? 'Premium' : me?.plan === 'standard' ? 'Standard' : 'Free'
    : 'Free';

  const features = subscriptionActive
    ? FEATURES_BY_PLAN[me?.plan ?? ''] ?? []
    : ['Загрузка до 5 текстов в месяц', 'Базовый словарь (до 100 слов)', 'Ограниченный доступ к упражнениям'];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#E8604A',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {initial}
        </div>
        <div>
          <h1 style={{
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 700,
            color: '#1A1A1A',
          }}>
            {me?.name}
          </h1>
          <div style={{ fontSize: 14, color: '#8B7355' }}>
            {me?.email}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        background: 'white',
        borderRadius: 14,
        padding: 4,
        border: '1px solid #EDE8E1',
        marginBottom: 32,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: tab === t.key ? '#E8604A' : 'transparent',
              color: tab === t.key ? 'white' : '#8B7355',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Мои тексты ─────────────────────────────────────────────────────── */}
      {tab === 'texts' && (
        <div>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#8B7355',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Сохранённые тексты ({texts.length})
          </div>

          {texts.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 20,
              padding: '48px 24px',
              border: '2px dashed #EDE8E1',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
                Нет сохранённых текстов
              </div>
              <div style={{ fontSize: 14, color: '#8B7355' }}>
                Добавьте текст на странице{' '}
                <span
                  onClick={() => router.push('/texts')}
                  style={{ color: '#E8604A', cursor: 'pointer' }}
                >
                  «Мои тексты»
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {texts.map(t => (
                <div
                  key={t.id}
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: '16px 20px',
                    border: '1px solid #EDE8E1',
                  }}
                >
                  {editingId === t.id && editText ? (
                    <div>
                      <input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        placeholder="Заголовок"
                        style={{
                          width: '100%',
                          border: '1px solid #EDE8E1',
                          borderRadius: 10,
                          padding: '10px 14px',
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#1A1A1A',
                          outline: 'none',
                          marginBottom: 12,
                          background: '#F7F3EE',
                        }}
                      />
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        placeholder="Содержимое текста…"
                        rows={6}
                        style={{
                          width: '100%',
                          border: '1px solid #EDE8E1',
                          borderRadius: 10,
                          padding: '12px 14px',
                          fontSize: 14,
                          fontFamily: "'Noto Sans JP', sans-serif",
                          color: '#1A1A1A',
                          resize: 'vertical',
                          outline: 'none',
                          background: '#F7F3EE',
                          marginBottom: 12,
                        }}
                      />
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button
                          onClick={cancelEdit}
                          style={{
                            background: 'none',
                            border: '1.5px solid #D4C5B0',
                            borderRadius: 50,
                            padding: '9px 20px',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#8B7355',
                            cursor: 'pointer',
                          }}
                        >
                          Отмена
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={saving || !editContent.trim()}
                          style={{
                            background: saving || !editContent.trim() ? '#D4C5B0' : '#E8604A',
                            color: 'white',
                            border: 'none',
                            borderRadius: 50,
                            padding: '10px 22px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: saving || !editContent.trim() ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {saving ? 'Сохранение…' : 'Сохранить'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <button
                          onClick={() => router.push(`/texts/${t.id}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            flex: 1,
                            padding: 0,
                          }}
                        >
                          <div style={{
                            fontSize: 15,
                            fontWeight: 500,
                            color: '#1A1A1A',
                            marginBottom: 4,
                          }}>
                            {t.title}
                          </div>
                          <div style={{ fontSize: 13, color: '#8B7355' }}>
                            {formatDate(t.created_at)}
                          </div>
                        </button>
                        <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
                          <button
                            onClick={() => startEdit(t)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '8px 10px',
                              fontSize: 13,
                              color: '#8B7355',
                              transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#E8604A'}
                            onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
                          >
                            Редактировать
                          </button>
                          <button
                            onClick={() => handleDeleteText(t.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '8px 10px',
                              fontSize: 13,
                              color: '#8B7355',
                              transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#E8604A'}
                            onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Словарь ────────────────────────────────────────────────────────── */}
      {tab === 'vocabulary' && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#8B7355',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              Сохранённые слова ({vocabulary.length})
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleExportAnki}
                style={{
                  background: 'white',
                  color: '#2D5A3D',
                  border: '1.5px solid #2D5A3D',
                  borderRadius: 50,
                  padding: '10px 22px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#2D5A3D';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#2D5A3D';
                }}
              >
                <span>🃏</span>
                Экспорт в Anki
              </button>
              <button
                onClick={handleExportCsv}
                style={{
                  background: 'white',
                  color: '#E8604A',
                  border: '1.5px solid #E8604A',
                  borderRadius: 50,
                  padding: '10px 22px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#E8604A';
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#E8604A';
                }}
              >
                <span>⬇️</span>
                Экспорт (CSV)
              </button>
            </div>
          </div>

          {vocabulary.length === 0 ? (
            <div style={{
              background: 'white',
              borderRadius: 20,
              padding: '48px 24px',
              border: '2px dashed #EDE8E1',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
                Словарь пуст
              </div>
              <div style={{ fontSize: 14, color: '#8B7355' }}>
                Добавляйте слова при изучении текстов, и они появятся здесь
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {vocabulary.map(v => (
                <div
                  key={v.id}
                  style={{
                    background: 'white',
                    borderRadius: 14,
                    padding: '14px 18px',
                    border: '1px solid #EDE8E1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: "'Noto Serif JP'",
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#1A1A1A',
                      }}>
                        {v.surface}
                      </span>
                      {v.base_form && v.base_form !== v.surface && (
                        <span style={{ fontSize: 13, color: '#8B7355' }}>
                          {v.base_form}
                        </span>
                      )}
                      {v.reading && (
                        <span style={{ fontSize: 13, color: '#8B7355' }}>
                          {v.reading}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                      {v.pos && (
                        <span style={{
                          background: 'rgba(139,115,85,0.12)',
                          color: '#8B7355',
                          fontSize: 11,
                          padding: '2px 10px',
                          borderRadius: 20,
                        }}>
                          {v.pos}
                        </span>
                      )}
                      {v.translation && (
                        <span style={{ fontSize: 13, color: '#6B7FCC' }}>
                          {v.translation}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteWord(v.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px 10px',
                      fontSize: 13,
                      color: '#8B7355',
                      transition: 'color 0.2s',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E8604A'}
                    onMouseLeave={e => e.currentTarget.style.color = '#8B7355'}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Подписка ────────────────────────────────────────────────────── */}
      {tab === 'subscription' && (
        <div>
          <div style={{
            background: 'white',
            borderRadius: 20,
            border: '1px solid #EDE8E1',
            overflow: 'hidden',
          }}>
            {/* Шапка тарифа */}
            <div style={{
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              borderBottom: '1px solid #EDE8E1',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 6 }}>
                  Текущий тариф
                </div>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: subscriptionActive ? 'rgba(45,90,61,0.1)' : 'rgba(139,115,85,0.1)',
                  color: subscriptionActive ? '#2D5A3D' : '#8B7355',
                  borderRadius: 50,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  {subscriptionActive ? '✓ ' : ''}{planLabel}
                </div>
              </div>
              <Link
                href="/#pricing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#E8604A',
                  color: 'white',
                  border: 'none',
                  borderRadius: 50,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#D14A35';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#E8604A';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {subscriptionActive ? 'Изменить тариф' : 'Выбрать тариф'}
              </Link>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Действует до */}
              <div>
                <div style={{ fontSize: 13, color: '#8B7355', marginBottom: 4 }}>
                  Подписка действует до
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
                  {subscriptionActive && me?.subscription_ends_at
                    ? formatDate(me.subscription_ends_at)
                    : '—'}
                </div>
              </div>

              {/* Возможности */}
              <div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#8B7355',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}>
                  Возможности тарифа
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#555', lineHeight: 1.5 }}>
                      <span style={{ color: '#E8604A', flexShrink: 0 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 16,
            background: 'rgba(139,115,85,0.06)',
            borderRadius: 14,
            padding: '16px 20px',
            fontSize: 13,
            color: '#8B7355',
            lineHeight: 1.6,
          }}>
            💡 После оплаты доступ к платным тарифам активируется автоматически. Если оплата прошла, но тариф не обновился — напишите нам.
          </div>
        </div>
      )}

      {/* ── Настройки ──────────────────────────────────────────────────────── */}
      {tab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #EDE8E1',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
                  {t.settings.language}
                </div>
                <div style={{ fontSize: 13, color: '#8B7355', marginTop: 4 }}>
                  {t.settings.languageHint}
                </div>
              </div>
              <LanguageSwitcher />
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 24,
            border: '1px solid #EDE8E1',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
                  Выбор словарей
                </div>
                <div style={{ fontSize: 13, color: '#8B7355', marginTop: 4 }}>
                  Подключайте дополнительные словари для анализа текстов
                </div>
              </div>
              <span style={{
                background: 'rgba(232,96,74,0.1)',
                color: '#E8604A',
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 20,
                letterSpacing: '0.05em',
              }}>
                СКОРО
              </span>
            </div>
            <div style={{
              background: '#F7F3EE',
              border: '2px dashed #EDE8E1',
              borderRadius: 14,
              padding: '20px',
              textAlign: 'center',
              fontSize: 14,
              color: '#8B7355',
            }}>
              📖 Раздел появится в ближайших обновлениях
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
