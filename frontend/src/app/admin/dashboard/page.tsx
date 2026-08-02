'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const BLUE = '#2563EB';

const COUNTRY_NAMES: Record<string, string> = {
  RU: 'Россия',
  KZ: 'Казахстан',
  BY: 'Беларусь',
  UA: 'Украина',
  UZ: 'Узбекистан',
  KG: 'Кыргызстан',
  TJ: 'Таджикистан',
  TM: 'Туркменистан',
  AM: 'Армения',
  AZ: 'Азербайджан',
  GE: 'Грузия',
  MD: 'Молдова',
  LV: 'Латвия',
  LT: 'Литва',
  EE: 'Эстония',
  PL: 'Польша',
  DE: 'Германия',
  US: 'США',
  GB: 'Великобритания',
  FR: 'Франция',
  ES: 'Испания',
  IT: 'Италия',
  TR: 'Турция',
  JP: 'Япония',
  CN: 'Китай',
  KR: 'Южная Корея',
  IL: 'Израиль',
  IN: 'Индия',
  AE: 'ОАЭ',
};

function countryName(code: string | null): string {
  if (!code) return 'Не указана';
  return COUNTRY_NAMES[code] || code;
}

type Totals = { users: number; paying_users: number; vocabulary_words: number };
type CountryStat = { country: string | null; total: number };
type PurchaseStat = { country: string; total_users: number; paying_users: number; conversion_rate: number };
type TopWord = { surface: string; reading: string | null; translation: string | null; total: number };

type Dashboard = {
  totals: Totals;
  users_by_country: CountryStat[];
  countries_by_purchase: PurchaseStat[];
  top_words: TopWord[];
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };

    fetch(`${API_URL}/api/auth/me`, { headers })
      .then(meRes => {
        if (!meRes.ok) throw new Error('unauthorized');
        return meRes.json();
      })
      .then(me => {
        const roles: string[] = Array.isArray(me.roles) ? me.roles : [];
        const isAdmin = roles.includes('administrator') || roles.includes('manager');
        if (!isAdmin) {
          setDenied(true);
          return null;
        }
        return fetch(`${API_URL}/api/admin/dashboard`, { headers }).then(dashRes => {
          if (!dashRes.ok) throw new Error('load-failed');
          return dashRes.json();
        });
      })
      .then(dashboard => {
        if (dashboard) setData(dashboard);
      })
      .catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false));
  }, [router]);

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

  if (denied) {
    return (
      <div style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 420,
          background: 'white',
          borderRadius: 20,
          border: '1px solid #EDE8E1',
          padding: 48,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🔒</div>
          <h1 style={{
            fontFamily: "'Noto Serif JP'",
            fontSize: 26,
            fontWeight: 700,
            color: '#1A1A1A',
            marginBottom: 12,
          }}>
            Нет доступа
          </h1>
          <p style={{ fontSize: 15, color: '#8B7355', marginBottom: 24, lineHeight: 1.6 }}>
            Раздел доступен только администраторам и менеджерам.
          </p>
          <Link
            href="/texts"
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
            }}
          >
            Вернуться к текстам
          </Link>
        </div>
      </div>
    );
  }

  const maxCountry = Math.max(1, ...(data?.users_by_country ?? []).map(c => c.total));
  const maxWord = Math.max(1, ...(data?.top_words ?? []).map(w => w.total));

  const summaryCards = [
    { icon: '👥', label: 'Пользователей', value: data?.totals.users ?? 0, color: BLUE },
    { icon: '💳', label: 'С активной подпиской', value: data?.totals.paying_users ?? 0, color: '#2D5A3D' },
    { icon: '📚', label: 'Слов в словаре', value: data?.totals.vocabulary_words ?? 0, color: '#E8604A' },
  ];

  const sections = [
    {
      href: '/admin/grammar',
      icon: '📝',
      title: 'Грамматические статьи',
      desc: 'Создание и редактирование статей по грамматике',
    },
    {
      href: '/admin/settings',
      icon: '⚙️',
      title: 'Настройки',
      desc: 'Платёжные системы, тарифы, налоги',
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
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
          marginBottom: 4,
        }}>
          Дашборд
        </h1>
        <div style={{ fontSize: 14, color: '#8B7355' }}>
          Статистика по пользователям и словарю
        </div>
      </div>

      {/* Summary cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {summaryCards.map(card => (
          <div key={card.label} style={{
            background: 'white',
            borderRadius: 20,
            border: '1px solid #EDE8E1',
            padding: '24px',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: card.color + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, marginBottom: 16,
            }}>
              {card.icon}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#1A1A1A', lineHeight: 1 }}>
              {card.value.toLocaleString('ru-RU')}
            </div>
            <div style={{ fontSize: 13, color: '#8B7355', marginTop: 6 }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Country stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginBottom: 32,
      }}>
        {/* Users by country */}
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
              Пользователи по странам
            </h2>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(data?.users_by_country ?? []).length === 0 && (
              <div style={{ fontSize: 14, color: '#8B7355' }}>Нет данных</div>
            )}
            {(data?.users_by_country ?? []).map(row => (
              <div key={row.country ?? 'unknown'}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>
                    {countryName(row.country)}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: BLUE }}>
                    {row.total.toLocaleString('ru-RU')}
                  </span>
                </div>
                <div style={{
                  height: 8,
                  borderRadius: 50,
                  background: '#F3EFE9',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(row.total / maxCountry) * 100}%`,
                    height: '100%',
                    borderRadius: 50,
                    background: BLUE,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Countries by purchase */}
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
              Страны, чаще всего покупающие подписку
            </h2>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(data?.countries_by_purchase ?? []).length === 0 && (
              <div style={{ fontSize: 14, color: '#8B7355' }}>Покупок ещё не было</div>
            )}
            {(data?.countries_by_purchase ?? []).map(row => {
              const rate = Math.round(row.conversion_rate * 100);
              return (
                <div key={row.country}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>
                      {countryName(row.country)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#2D5A3D' }}>
                      {rate}% · {row.paying_users}/{row.total_users}
                    </span>
                  </div>
                  <div style={{
                    height: 8,
                    borderRadius: 50,
                    background: '#F3EFE9',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${rate}%`,
                      height: '100%',
                      borderRadius: 50,
                      background: '#2D5A3D',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top words */}
      <div style={{
        background: 'white',
        borderRadius: 20,
        border: '1px solid #EDE8E1',
        overflow: 'hidden',
        marginBottom: 32,
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #EDE8E1',
          background: '#FBF9F5',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>
            Топ слов, добавленных в словарь
          </h2>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(data?.top_words ?? []).length === 0 && (
            <div style={{ fontSize: 14, color: '#8B7355' }}>Словарь пока пуст</div>
          )}
          {(data?.top_words ?? []).map((word, idx) => (
            <div key={`${word.surface}-${idx}`}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
                  <span style={{
                    fontFamily: "'Noto Serif JP'",
                    fontSize: 17,
                    fontWeight: 700,
                    color: '#1A1A1A',
                  }}>
                    {word.surface}
                  </span>
                  {word.reading && (
                    <span style={{ fontSize: 13, color: '#8B7355' }}>{word.reading}</span>
                  )}
                  {word.translation && (
                    <span style={{
                      fontSize: 13,
                      color: '#6B7FCC',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      — {word.translation}
                    </span>
                  )}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#E8604A',
                  flexShrink: 0,
                  marginLeft: 12,
                }}>
                  × {word.total.toLocaleString('ru-RU')}
                </span>
              </div>
              <div style={{
                height: 8,
                borderRadius: 50,
                background: '#F3EFE9',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(word.total / maxWord) * 100}%`,
                  height: '100%',
                  borderRadius: 50,
                  background: '#E8604A',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other sections */}
      <div>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#8B7355',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Другие разделы
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sections.map(section => (
            <Link
              key={section.href}
              href={section.href}
              style={{
                background: 'white',
                borderRadius: 16,
                border: '1px solid #EDE8E1',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                textDecoration: 'none',
                transition: 'box-shadow 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = '#BFDBFE';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#EDE8E1';
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(59,130,246,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {section.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
                  {section.title}
                </div>
                <div style={{ fontSize: 13, color: '#8B7355' }}>
                  {section.desc}
                </div>
              </div>
              <div style={{ color: BLUE, fontSize: 18, fontWeight: 700, flexShrink: 0 }}>→</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
