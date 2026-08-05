'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const BLUE = '#2563EB';
const GREEN = '#2D5A3D';
const CORAL = '#E8604A';

type DictDetail = {
  id: number;
  name: string;
  slug: string;
  import_status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  import_progress: number;
  import_error: string | null;
  entries_count: number;
  is_active: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  idle: 'Не импортирован',
  pending: 'В очереди',
  processing: 'Идёт импорт',
  completed: 'Импорт завершён',
  failed: 'Ошибка импорта',
};

const STATUS_COLOR: Record<string, string> = {
  idle: '#8B7355',
  pending: '#B45309',
  processing: BLUE,
  completed: GREEN,
  failed: CORAL,
};

export default function Page() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const router = useRouter();

  const [dict, setDict] = useState<DictDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;

    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async (): Promise<boolean> => {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/dictionaries/${id}`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!active) return false;

      if (res.status === 404) {
        setNotFound(true);
        return false;
      }
      if (res.status === 401 || res.status === 403) {
        router.push('/auth/login');
        return false;
      }
      if (!res.ok) {
        setNotFound(true);
        return false;
      }

      const data = await res.json();
      setDict(data);
      setNotFound(false);
      return data.import_status === 'pending' || data.import_status === 'processing';
    };

    load().then(keepPolling => {
      setLoading(false);
      if (keepPolling) {
        timer = setInterval(async () => {
          const still = await load();
          if (!still && timer) clearInterval(timer);
        }, 2000);
      }
    });

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
      <Link
        href="/admin/dictionaries"
        className="link-hover-text-blue"
        style={{
          display: 'inline-block',
          fontSize: 14,
          color: '#8B7355',
          textDecoration: 'none',
          marginBottom: 20,
          transition: 'color 0.2s',
        }}
      >
        ← К списку словарей
      </Link>

      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 240, color: '#8B7355', fontSize: 16,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>⏳</div>
            Загрузка…
          </div>
        </div>
      ) : notFound ? (
        <div style={{
          background: 'white',
          borderRadius: 20,
          border: '2px dashed #EDE8E1',
          padding: '64px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>📚</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>
            Словарь не найден
          </div>
          <div style={{ fontSize: 14, color: '#8B7355' }}>
            Возможно, он был удалён
          </div>
        </div>
      ) : dict ? (
        <>
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
              <span>⚙️</span> Админ-панель
            </div>
            <h1 style={{
              fontFamily: "'Noto Serif JP'",
              fontSize: 'clamp(24px, 3vw, 32px)',
              fontWeight: 700,
              color: '#1A1A1A',
              marginBottom: 8,
            }}>
              {dict.name}
            </h1>
            <span style={{
              fontSize: 12,
              fontFamily: 'monospace',
              color: BLUE,
              background: 'rgba(59,130,246,0.08)',
              padding: '3px 8px',
              borderRadius: 6,
            }}>
              {dict.slug}
            </span>
          </div>

          {/* Import status */}
          <div style={{
            background: 'white',
            borderRadius: 20,
            border: '1px solid #EDE8E1',
            overflow: 'hidden',
            marginBottom: 16,
          }}>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #EDE8E1',
              background: '#FBF9F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
                Статус импорта
              </h2>
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                color: STATUS_COLOR[dict.import_status],
                background: (STATUS_COLOR[dict.import_status] ?? '#8B7355') + '14',
                padding: '4px 12px',
                borderRadius: 20,
              }}>
                {STATUS_LABEL[dict.import_status]}
              </span>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {dict.import_status === 'processing' && (
                <>
                  <div style={{ fontSize: 13, color: '#8B7355', marginBottom: 8 }}>
                    Идёт загрузка записей — {dict.import_progress}%
                  </div>
                  <div style={{ height: 10, borderRadius: 50, background: '#F3EFE9', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(0, dict.import_progress))}%`,
                      height: '100%',
                      borderRadius: 50,
                      background: BLUE,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </>
              )}
              {(dict.import_status === 'completed' || dict.import_status === 'idle') && (
                <div style={{ height: 10, borderRadius: 50, background: '#F3EFE9', overflow: 'hidden' }}>
                  <div style={{
                    width: dict.import_status === 'completed' ? '100%' : '0%',
                    height: '100%',
                    borderRadius: 50,
                    background: GREEN,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              )}
              {dict.import_status === 'pending' && (
                <div style={{ fontSize: 14, color: '#8B7355' }}>
                  Задача поставлена в очередь, импорт начнётся автоматически…
                </div>
              )}
              {dict.import_status === 'failed' && (
                <div style={{ fontSize: 14, color: CORAL, lineHeight: 1.6 }}>
                  {dict.import_error || 'Не удалось импортировать словарь.'}
                </div>
              )}
              {(dict.import_status === 'pending' || dict.import_status === 'processing') && (
                <div style={{ fontSize: 12, color: '#8B7355', marginTop: 10 }}>
                  Страница обновляется автоматически
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div style={{
            background: 'white',
            borderRadius: 20,
            border: '1px solid #EDE8E1',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #EDE8E1',
              background: '#FBF9F5',
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
                Информация
              </h2>
            </div>
            <div style={{ padding: '8px 24px' }}>
              {[
                { label: 'Записей в словаре', value: dict.entries_count.toLocaleString('ru-RU') },
                { label: 'Статус', value: dict.is_active ? 'Активен' : 'Деактивирован' },
                { label: 'ID', value: String(dict.id) },
              ].map((row, idx, arr) => (
                <div key={row.label} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: idx === arr.length - 1 ? 'none' : '1px solid #F3EFE9',
                }}>
                  <span style={{ fontSize: 14, color: '#8B7355' }}>{row.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
