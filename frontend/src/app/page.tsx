'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, tf } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Palette ──────────────────────────────────────────────────────────────────
// #F7F3EE — тёплый молочный фон
// #1A1A1A — почти чёрный текст
// #E8604A — коралловый акцент (CTA)
// #8B7355 — тёплый коричневый (вторичный)
// #D4C5B0 — бежевый (разделители, фоны карточек)
// #2D5A3D — тёмно-зелёный (навигация, тихие акценты)

type Plan = { id: string; name: string; price: number; currency: string; features: string[] };

type Me = {
  plan?: string;
  subscription_period?: string | null;
  subscription_ends_at?: string | null;
  is_premium?: boolean;
};

// Периоды оплаты — зеркалит расчёт на бэкенде (PaymentController::initiate)
const PERIODS = [
  { id: '1m',  months: 1,  discount: 0.00 },
  { id: '3m',  months: 3,  discount: 0.05 },
  { id: '6m',  months: 6,  discount: 0.10 },
  { id: '12m', months: 12, discount: 0.15 },
] as const;

type PeriodId = typeof PERIODS[number]['id'];

const PLAN_COLORS: Record<string, string> = {
  free: '#8B7355',
  standard: '#2D5A3D',
  premium: '#E8604A',
};

export default function Page() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [periodId, setPeriodId] = useState<PeriodId>('1m');
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<string>('premium');

  const period = PERIODS.find(p => p.id === periodId)!;

  const periodLabel = {
    '1m': t.landing.period1m,
    '3m': t.landing.period3m,
    '6m': t.landing.period6m,
    '12m': t.landing.period12m,
  } as const;

  useEffect(() => {
    fetch(`${API_URL}/api/plans?lang=${lang}`, { headers: { Accept: 'application/json' } })
      .then(res => res.json())
      .then(data => {
        setPlans(data.plans ?? []);
        setNow(Date.now());
      })
      .catch(() => setPlansError(t.landing.plansLoadError));

    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          setMe(data);
          if (data) {
            const hasActivePaid = !!data.plan
              && data.plan !== 'free'
              && !!data.subscription_ends_at
              && new Date(data.subscription_ends_at).getTime() > Date.now();
            setSelectedPlan(hasActivePaid ? data.plan : 'free');
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const priceFor = (base: number) => Math.round(base * period.months * (1 - period.discount));

  const formatPrice = (n: number, currency: string) =>
    n.toLocaleString(locale) + (currency === 'USD' ? ' $' : ' ₽');

  const hasActivePaid =
    !!me?.plan
    && me.plan !== 'free'
    && !!me.subscription_ends_at
    && new Date(me.subscription_ends_at).getTime() > now;

  const currentPlanId = hasActivePaid ? (me?.plan ?? 'free') : 'free';

  const startCheckout = async (planId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    setCheckingOut(planId);
    setPlansError(null);
    try {
      const res = await fetch(`${API_URL}/api/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId, period: periodId }),
      });

      if (res.status === 401 || res.status === 403) {
        router.push('/auth/login');
        return;
      }
      if (!res.ok) throw new Error('initiate failed');

      const data = await res.json();
      window.location.assign(data.redirect_url);
    } catch {
      setPlansError(t.landing.checkoutError);
      setCheckingOut(null);
    }
  };

  return (
      <div>

        {/* ── Styles ── */}
        <style>{`
        .btn-primary {
          background: #E8604A;
          color: white;
          border: none;
          border-radius: 50px;
          padding: 14px 28px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s, transform 0.15s;
          text-decoration: none;
        }
        .btn-primary:hover { background: #D14A35; transform: translateY(-1px); }

        .btn-outline {
          background: transparent;
          color: #1A1A1A;
          border: 1.5px solid #D4C5B0;
          border-radius: 50px;
          padding: 13px 26px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: border-color 0.2s, color 0.2s;
          text-decoration: none;
        }
        .btn-outline:hover { border-color: #8B7355; color: #8B7355; }

        .feature-card {
          background: white;
          border-radius: 20px;
          padding: 28px 24px;
          border: 1px solid #EDE8E1;
          transition: box-shadow 0.25s, transform 0.25s;
          cursor: pointer;
        }
        .feature-card:hover {
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          transform: translateY(-3px);
        }

        .plan-card {
          background: white;
          border-radius: 24px;
          padding: 32px 28px;
          border: 1.5px solid #EDE8E1;
          transition: box-shadow 0.25s, border-color 0.25s;
          position: relative;
        }
        .plan-card.selected {
          border-color: #E8604A;
          box-shadow: 0 4px 24px rgba(232,96,74,0.12);
        }

        .check-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14px;
          color: #555;
          line-height: 1.5;
          margin-bottom: 10px;
        }
        .check-icon { color: #E8604A; flex-shrink: 0; margin-top: 1px; }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .float { animation: float 6s ease-in-out infinite; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
        .fade-up-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.3s ease both; }

        .sakura {
          position: absolute;
          font-size: 24px;
          opacity: 0.35;
          pointer-events: none;
          animation: float 8s ease-in-out infinite;
        }

        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; }
          .hero-visual { display: none !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .plans-grid { grid-template-columns: 1fr !important; }
          .grammar-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section style={{
          padding: '72px max(24px, calc(50vw - 640px)) 80px',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 520,
        }}>
          {/* Декор: большой круг */}
          <div style={{
            position: 'absolute', right: -60, top: -80,
            width: 600, height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,96,74,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>

          <div className="hero-grid" style={{display: 'flex', alignItems: 'center', gap: 60}}>
            {/* Left */}
            <div style={{flex: '1 1 480px', maxWidth: 560}}>
              <div className="fade-up" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(232,96,74,0.1)', borderRadius: 50,
                padding: '6px 14px', marginBottom: 24,
                fontSize: 13, fontWeight: 500, color: '#E8604A',
              }}>
                <span>🌸</span> {t.landing.heroBadge}
              </div>

              <h1 className="fade-up-2" style={{
                fontFamily: "'Noto Serif JP', serif",
                fontSize: 'clamp(36px, 5vw, 58px)',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                marginBottom: 20,
                color: '#1A1A1A',
              }}>
                {t.landing.heroTitle1}<br/>
                <span style={{color: '#E8604A'}}>{t.landing.heroTitle2}</span>
              </h1>

              <p className="fade-up-3" style={{
                fontSize: 17, lineHeight: 1.7, color: '#6B6355',
                marginBottom: 36, maxWidth: 440,
              }}>
                {t.landing.heroSub1}<br/>
                {t.landing.heroSub2}<br/>
                {t.landing.heroSub3}
              </p>

              <div style={{display: 'flex', gap: 14, flexWrap: 'wrap'}}>
                <Link href="/texts" className="btn-primary">
                  <span>📄</span> {t.landing.uploadText}
                </Link>
                <a href="#how" className="btn-outline">
                  <span>▶</span> {t.landing.howWorksBtn}
                </a>
              </div>
            </div>

            {/* Right — иллюстрация */}
            <div className="hero-visual float" style={{
              flex: '0 0 420px',
              position: 'relative',
              height: 380,
            }}>
              {/* Большой круг-фон */}
              <div style={{
                position: 'absolute', right: 0, top: '50%',
                transform: 'translateY(-50%)',
                width: 360, height: 360,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FCDDD8 0%, #F9C5BB 50%, #F5A898 100%)',
                opacity: 0.6,
              }}/>

              {/* Японский текст */}
              <div style={{
                position: 'absolute', right: 24, top: 20,
                fontFamily: "'Noto Serif JP'",
                fontSize: 22, fontWeight: 700,
                writingMode: 'vertical-rl',
                color: 'rgba(139,115,85,0.4)',
                letterSpacing: '0.1em',
                lineHeight: 1.8,
              }}>
                継続は力なり
              </div>

              {/* Сакура emoji крупно */}
              <div style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 120,
                filter: 'drop-shadow(0 8px 32px rgba(232,96,74,0.2))',
              }}>
                🏯
              </div>

              {/* Мелкие декоративные элементы */}
              <div className="sakura" style={{left: 20, top: 60, animationDelay: '1s'}}>🌸</div>
              <div className="sakura" style={{right: 30, bottom: 80, animationDelay: '3s'}}>🌸</div>
              <div className="sakura" style={{left: 60, bottom: 40, animationDelay: '2s', fontSize: 16}}>🌸</div>

              {/* Плашка "JLPT N5" */}
              <div style={{
                position: 'absolute', left: 0, bottom: 60,
                background: 'white',
                borderRadius: 14, padding: '10px 16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{color: '#E8604A'}}>📚</span>
                <div>
                  <div style={{color: '#1A1A1A'}}>食べる · たべる</div>
                  <div style={{color: '#8B7355', fontWeight: 400, fontSize: 11}}>to eat · JLPT N5</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{padding: '72px max(24px, calc(50vw - 640px))'}}>
          <div className="grammar-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 60,
            alignItems: 'center',
          }}>
            <div>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#E8604A',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: 10
              }}>
                {t.landing.grammarKicker}
              </div>
              <h2 style={{
                fontFamily: "'Noto Serif JP'",
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: 700,
                color: '#1A1A1A',
                lineHeight: 1.3,
                marginBottom: 24
              }}>
                {t.landing.grammarInOneClick}
              </h2>
              <Link href="/grammar" className="btn-outline">{t.landing.grammarCta}</Link>
            </div>
            <div style={{
              background: 'white',
              border: '1px solid #EDE8E1',
              borderRadius: 20,
              padding: '32px 28px',
              fontSize: 15,
              color: '#6B6355',
              lineHeight: 1.8,
              whiteSpace: 'pre-line',
            }}>
              {t.landing.grammarClickAway}
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────────── */}
        <section style={{padding: '72px max(24px, calc(50vw - 640px))'}}>
        <div style={{marginBottom: 40}}>
            <div style={{
              fontSize: 12,
                fontWeight: 600,
                color: '#E8604A',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: 10
              }}>
                {t.landing.whatWeTeach}
              </div>
              <h2 style={{
                fontFamily: "'Noto Serif JP'",
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: 700,
                color: '#1A1A1A'
              }}>
                {t.landing.whatStudyToday}
              </h2>
            </div>

            <div className="features-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
            }}>
              {[
                {icon: '📄', title: t.landing.fTextsTitle, desc: t.landing.fTextsDesc, href: '/texts', color: '#E8604A'},
                {
                  icon: '📖',
                  title: t.landing.fGrammarTitle,
                  desc: t.landing.fGrammarDesc,
                  href: '/grammar',
                  color: '#2D5A3D'
                },
                {
                  icon: '🔍',
                  title: t.landing.fVocabTitle,
                  desc: t.landing.fVocabDesc,
                  href: '/vocabulary',
                  color: '#8B7355'
                },
                {icon: '▶', title: t.landing.fAvTitle, desc: t.landing.fAvDesc, href: '/video', color: '#6B7FCC'},
              ].map(f => (
                  <a key={f.title} href={f.href} className="feature-card" style={{textDecoration: 'none'}}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: f.color + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, marginBottom: 16,
                    }}>
                      {f.icon}
                    </div>
                    <h3 style={{fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 10}}>{f.title}</h3>
                    <p style={{fontSize: 13, color: '#6B6355', lineHeight: 1.65, marginBottom: 20}}>{f.desc}</p>
                    <div style={{color: f.color, fontSize: 18, fontWeight: 700}}>→</div>
                  </a>
              ))}
            </div>
          </section>

          {/* ── How it works ─────────────────────────────────────────────────── */}
          <section id="how" style={{
            padding: '72px max(24px, calc(50vw - 640px))',
            background: '#1A1A1A',
            color: 'white',
          }}>
            <div style={{
              marginBottom: 48,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#E8604A',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  marginBottom: 10
                }}>
                  {t.landing.howTitle}
                </div>
                <h2 style={{fontFamily: "'Noto Serif JP'", fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700}}>
                  {t.landing.threeSteps}
                </h2>
              </div>
              <Link href="/texts" className="btn-primary" style={{flexShrink: 0}}>{t.landing.tryIt}</Link>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24}}>
              {[
                {n: '01', title: t.landing.s1Title, desc: t.landing.s1Desc},
                {n: '02', title: t.landing.s2Title, desc: t.landing.s2Desc},
                {n: '03', title: t.landing.s3Title, desc: t.landing.s3Desc},
              ].map(s => (
                  <div key={s.n} style={{
                    padding: '28px 24px',
                    borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                  }}>
                    <div style={{
                      fontFamily: "'Noto Serif JP'", fontSize: 48, fontWeight: 700,
                      color: 'rgba(232,96,74,0.3)', marginBottom: 16, lineHeight: 1,
                    }}>
                      {s.n}
                    </div>
                    <h3 style={{fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 10}}>{s.title}</h3>
                    <p style={{fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7}}>{s.desc}</p>
                  </div>
              ))}
            </div>
          </section>

          {/* ── Pricing ───────────────────────────────────────────────────────── */}
          <section id="pricing" style={{padding: '80px max(24px, calc(50vw - 640px)) 96px'}}>
            <div style={{marginBottom: 32, textAlign: 'center'}}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#E8604A',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: 10
              }}>
                {t.landing.pricingTitle}
              </div>
              <h2 style={{
                fontFamily: "'Noto Serif JP'",
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: 700,
                color: '#1A1A1A'
              }}>
                {t.landing.choosePlanTitle}
              </h2>
            </div>

            {/* Период оплаты */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 32,
            }}>
              <div style={{
                display: 'inline-flex',
                background: 'white',
                border: '1px solid #EDE8E1',
                borderRadius: 50,
                padding: 4,
                gap: 2,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                {PERIODS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPeriodId(p.id)}
                        style={{
                          padding: '9px 18px',
                          borderRadius: 50,
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: periodId === p.id ? '#E8604A' : 'transparent',
                          color: periodId === p.id ? 'white' : '#8B7355',
                        }}
                        onMouseEnter={e => {
                          if (periodId !== p.id) {
                            e.currentTarget.style.background = 'rgba(232,96,74,0.08)';
                            e.currentTarget.style.color = '#E8604A';
                          }
                        }}
                        onMouseLeave={e => {
                          if (periodId !== p.id) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#8B7355';
                          }
                        }}
                    >
                      {periodLabel[p.id]}
                      {p.discount > 0 && (
                          <span style={{opacity: 0.85}}>{` −${Math.round(p.discount * 100)}%`}</span>
                      )}
                    </button>
                ))}
              </div>
            </div>

            {plansError && (
                <div style={{
                  maxWidth: 520,
                  margin: '0 auto 24px',
                  textAlign: 'center',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'rgba(232,96,74,0.08)',
                  color: '#D14A35',
                  fontSize: 14,
                }}>
                  {plansError}
                </div>
            )}

            <div className="plans-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
              maxWidth: 900,
              margin: '0 auto',
            }}>
              {plans.map(plan => {
                const color = PLAN_COLORS[plan.id] || '#8B7355';
                const selected = selectedPlan === plan.id;
                const isCurrentPlan = currentPlanId === plan.id;
                const price = priceFor(plan.price);
                const perMonth = Math.round(plan.price * (1 - period.discount));

                return (
                    <div
                        key={plan.id}
                        className={`plan-card${selected ? ' selected' : ''}`}
                        onClick={() => setSelectedPlan(plan.id)}
                        style={{cursor: 'pointer'}}
                    >
                      {plan.id === 'premium' && (
                          <div style={{
                            position: 'absolute', top: -12, right: 20,
                            background: '#E8604A', color: 'white',
                            borderRadius: 50, width: 36, height: 36,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16,
                          }}>⭐</div>
                      )}
                      <div style={{
                        marginBottom: 4,
                        fontSize: 13,
                        fontWeight: 600,
                        color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                      }}>
                        {plan.name}
                      </div>
                      <div style={{display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6}}>
                  <span style={{fontSize: 36, fontWeight: 700, color: '#1A1A1A'}}>
                    {formatPrice(price, plan.currency)}
                  </span>
                      </div>
                      <div style={{fontSize: 13, color: '#8B7355', marginBottom: 28}}>
                        {period.months > 1
                            ? tf(t.landing.forMonths, {
                              months: period.months,
                              word: period.months === 3 ? t.landing.monthWord3 : t.landing.monthWordOther,
                              price: formatPrice(perMonth, plan.currency),
                            })
                            : t.landing.perMonth}
                      </div>
                      <div style={{borderTop: '1px solid #EDE8E1', paddingTop: 24, marginBottom: 28}}>
                        {plan.features.map(f => (
                            <div key={f} className="check-item"><span className="check-icon">✓</span>{f}</div>
                        ))}
                      </div>

                      {isCurrentPlan ? (
                          <button style={{
                            width: '100%', padding: '13px', borderRadius: 50,
                            border: '1.5px solid #EDE8E1', background: 'transparent',
                            fontSize: 14, fontWeight: 600,
                            color: plan.id === 'free' ? '#8B7355' : '#2D5A3D',
                            cursor: 'default',
                          }}>
                            {plan.id === 'free' ? t.plans.current : t.landing.yourPlan}
                          </button>
                      ) : (
                          <button
                              className="btn-primary"
                              onClick={() => {
                                if (plan.id === 'free') {
                                  setSelectedPlan(plan.id);
                                  return;
                                }
                                startCheckout(plan.id);
                              }}
                              disabled={checkingOut !== null}
                              style={{
                                width: '100%', justifyContent: 'center',
                                background: checkingOut === plan.id ? '#D4C5B0' : '#E8604A',
                                cursor: checkingOut !== null ? 'not-allowed' : 'pointer',
                              }}
                          >
                            {checkingOut === plan.id ? t.landing.goingToCheckout : t.plans.choose}
                          </button>
                      )}
                    </div>
                );
              })}
            </div>
          </section>
      </div>
);
}
