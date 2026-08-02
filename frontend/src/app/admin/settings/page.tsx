'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

type Setting = { key: string; value: string; description: string; masked?: boolean };

const BLUE = '#2563EB';

// Группировка настроек для отображения
const GROUPS = [
  {
    title: 'Платёжная система',
    keys: ['payment_provider', 'payment_test_mode'],
  },
  {
    title: 'Тарифы',
    keys: ['plan_standard_price', 'plan_premium_price'],
  },
  {
    title: 'Налоги',
    keys: ['business_type', 'vat_enabled', 'vat_rate'],
  },
  {
    title: 'Robokassa',
    keys: ['robokassa_login', 'robokassa_password1', 'robokassa_password2', 'robokassa_hash_algo'],
  },
  {
    title: 'Prodamus',
    keys: ['prodamus_shop_url', 'prodamus_api_key', 'prodamus_secret_key'],
  },
];

// Поля с выбором из вариантов
const SELECT_OPTIONS: Record<string, { label: string; value: string }[]> = {
  payment_provider: [
    { label: 'Robokassa', value: 'robokassa' },
    { label: 'Prodamus',  value: 'prodamus'  },
  ],
  payment_test_mode: [
    { label: 'Тестовый режим', value: '1' },
    { label: 'Боевой режим',   value: '0' },
  ],
  business_type: [
    { label: 'Самозанятый', value: 'self_employed' },
    { label: 'ИП',          value: 'ip'            },
    { label: 'ООО',         value: 'ooo'           },
  ],
  vat_enabled: [
    { label: 'Без НДС (самозанятый)', value: '0' },
    { label: 'НДС включён (ИП/ООО)', value: '1' },
  ],
  robokassa_hash_algo: [
    { label: 'MD5',    value: 'md5'    },
    { label: 'SHA256', value: 'sha256' },
    { label: 'SHA512', value: 'sha512' },
  ],
};

// Секретные поля — показывать как password
const PASSWORD_FIELDS = new Set([
  'robokassa_password1', 'robokassa_password2',
  'prodamus_api_key', 'prodamus_secret_key',
]);

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, Setting>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/admin/settings')
      .then((data: Setting[]) => {
        const map: Record<string, Setting> = {};
        data.forEach(s => { map[s.key] = s; });
        setSettings(map);
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const setValue = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          settings: Object.values(settings).map(s => ({ key: s.key, value: s.value })),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const provider = settings['payment_provider']?.value ?? 'robokassa';
  const testMode = settings['payment_test_mode']?.value === '1';
  const vatEnabled = settings['vat_enabled']?.value === '1';

  const fieldStyle: React.CSSProperties = {
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

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
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
            <span>⚙️</span> Админ-панель
          </div>
          <h1 style={{
            fontFamily: "'Noto Serif JP'",
            fontSize: 'clamp(24px, 3vw, 32px)',
            fontWeight: 700,
            color: '#1A1A1A',
            marginBottom: 4,
          }}>
            Настройки
          </h1>
          <div style={{ fontSize: 14, color: '#8B7355' }}>
            Платёжные системы, тарифы, налоги
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span style={{ color: '#2D5A3D', fontSize: 14 }}>✓ Сохранено</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: saving ? '#93C5FD' : BLUE,
              color: 'white',
              border: 'none',
              borderRadius: 50,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.15s',
            }}
            onMouseEnter={e => {
              if (!saving) {
                e.currentTarget.style.background = '#1D4ED8';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = saving ? '#93C5FD' : BLUE;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 24,
          padding: '12px 16px',
          borderRadius: 12,
          background: 'rgba(232,96,74,0.08)',
          color: '#D14A35',
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Статус */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 14px',
          borderRadius: 50,
          fontSize: 13,
          fontWeight: 500,
          background: testMode ? 'rgba(217,119,6,0.1)' : 'rgba(45,90,61,0.1)',
          color: testMode ? '#B45309' : '#2D5A3D',
        }}>
          <span style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: testMode ? '#D97706' : '#2D5A3D',
          }} />
          {testMode ? 'Тестовый режим' : 'Боевой режим'}
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 14px',
          borderRadius: 50,
          fontSize: 13,
          fontWeight: 500,
          background: 'rgba(59,130,246,0.1)',
          color: BLUE,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: BLUE }} />
          {provider === 'robokassa' ? 'Robokassa' : 'Prodamus'}
        </div>
        {!vatEnabled && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 14px',
            borderRadius: 50,
            fontSize: 13,
            fontWeight: 500,
            background: 'rgba(139,115,85,0.1)',
            color: '#8B7355',
          }}>
            Самозанятый · Без НДС
          </div>
        )}
      </div>

      {/* Группы настроек */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {GROUPS.map(group => {
          const groupSettings = group.keys.filter(k => settings[k]);
          if (!groupSettings.length) return null;

          return (
            <div key={group.title} style={{
              background: 'white',
              borderRadius: 20,
              border: '1px solid #EDE8E1',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '14px 24px',
                borderBottom: '1px solid #EDE8E1',
                background: '#FBF9F5',
              }}>
                <h2 style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#1A1A1A',
                }}>
                  {group.title}
                </h2>
              </div>
              <div style={{ borderTop: '1px solid #F3EFE9' }}>
                {groupSettings.map((key, idx) => {
                  const s = settings[key];
                  const options = SELECT_OPTIONS[key];
                  const isPassword = PASSWORD_FIELDS.has(key);
                  const isPrice = key.includes('_price');
                  const isVatRate = key === 'vat_rate';

                  return (
                    <div
                      key={key}
                      style={{
                        padding: '16px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                        borderTop: idx === 0 ? 'none' : '1px solid #F3EFE9',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>
                          {s.description || key}
                        </div>
                        <div style={{ fontSize: 12, color: '#B9A88F', fontFamily: 'monospace', marginTop: 2 }}>
                          {key}
                        </div>
                      </div>
                      <div style={{ width: 240, flexShrink: 0 }}>
                        {options ? (
                          <select
                            value={s.value}
                            onChange={e => setValue(key, e.target.value)}
                            style={fieldStyle}
                          >
                            {options.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isPrice && <span style={{ color: '#8B7355', fontSize: 14 }}>₽</span>}
                            {isVatRate && <span style={{ color: '#8B7355', fontSize: 14 }}>%</span>}
                            <input
                              type={isPassword ? 'password' : isPrice || isVatRate ? 'number' : 'text'}
                              value={s.value}
                              onChange={e => setValue(key, e.target.value)}
                              placeholder={s.masked ? '••••••••' : ''}
                              style={{
                                ...fieldStyle,
                                fontFamily: isPassword ? 'monospace' : "'Noto Sans JP', sans-serif",
                                letterSpacing: isPassword ? '0.1em' : 'normal',
                              }}
                              onFocus={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                              onBlur={e => { e.currentTarget.style.borderColor = '#EDE8E1'; e.currentTarget.style.boxShadow = 'none'; }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Инструкция по вебхукам */}
      <div style={{
        marginTop: 24,
        background: 'rgba(59,130,246,0.06)',
        borderRadius: 20,
        border: '1px solid rgba(59,130,246,0.2)',
        padding: '20px 24px',
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E40AF', marginBottom: 12 }}>
          URL для вебхуков
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Robokassa (Result URL)', url: `${API_URL}/api/webhooks/robokassa` },
            { label: 'Prodamus (URL уведомления)', url: `${API_URL}/api/webhooks/prodamus` },
          ].map(w => (
            <div key={w.label}>
              <div style={{ fontSize: 12, color: '#2563EB', marginBottom: 4 }}>
                {w.label}
              </div>
              <code style={{
                display: 'block',
                fontSize: 12,
                fontFamily: 'monospace',
                background: 'white',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 10,
                padding: '8px 12px',
                color: '#1E40AF',
                wordBreak: 'break-all',
              }}>
                {w.url}
              </code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
