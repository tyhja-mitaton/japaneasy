'use client';

import Link from 'next/link';

// ── Palette ──────────────────────────────────────────────────────────────────
// #F7F3EE — тёплый молочный фон
// #1A1A1A — почти чёрный текст
// #E8604A — коралловый акцент (CTA)
// #8B7355 — тёплый коричневый (вторичный)
// #D4C5B0 — бежевый (разделители, фоны карточек)
// #2D5A3D — тёмно-зелёный (навигация, тихие акценты)

export default function Page() {
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
          transition: box-shadow 0.25s;
          position: relative;
        }
        .plan-card.featured {
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
        }} />

        <div className="hero-grid" style={{ display: 'flex', alignItems: 'center', gap: 60 }}>
          {/* Left */}
          <div style={{ flex: '1 1 480px', maxWidth: 560 }}>
            <div className="fade-up" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(232,96,74,0.1)', borderRadius: 50,
              padding: '6px 14px', marginBottom: 24,
              fontSize: 13, fontWeight: 500, color: '#E8604A',
            }}>
              <span>🌸</span> Учись на том, что тебе интересно
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
              Изучай японский<br />
              <span style={{ color: '#E8604A' }}>с удовольствием</span>
            </h1>

            <p className="fade-up-3" style={{
              fontSize: 17, lineHeight: 1.7, color: '#6B6355',
              marginBottom: 36, maxWidth: 440,
            }}>
              Загружай любые тексты, смотри переводы,<br />
              разбирай грамматику и пополняй словарь.<br />
              Учись на том, что тебе интересно.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/texts" className="btn-primary">
                <span>📄</span> Загрузить текст
              </Link>
              <a href="#how" className="btn-outline">
                <span>▶</span> Как это работает?
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
            }} />

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
            <div className="sakura" style={{ left: 20, top: 60, animationDelay: '1s' }}>🌸</div>
            <div className="sakura" style={{ right: 30, bottom: 80, animationDelay: '3s' }}>🌸</div>
            <div className="sakura" style={{ left: 60, bottom: 40, animationDelay: '2s', fontSize: 16 }}>🌸</div>

            {/* Плашка "JLPT N5" */}
            <div style={{
              position: 'absolute', left: 0, bottom: 60,
              background: 'white',
              borderRadius: 14, padding: '10px 16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: '#E8604A' }}>📚</span>
              <div>
                <div style={{ color: '#1A1A1A' }}>食べる · たべる</div>
                <div style={{ color: '#8B7355', fontWeight: 400, fontSize: 11 }}>to eat · JLPT N5</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '72px max(24px, calc(50vw - 640px))' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#E8604A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
            Что изучаем
          </div>
          <h2 style={{ fontFamily: "'Noto Serif JP'", fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#1A1A1A' }}>
            Что хотите изучить сегодня?
          </h2>
        </div>

        <div className="features-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}>
          {[
            { icon: '📄', title: 'Тексты', desc: 'Загружайте любые тексты на японском языке и получайте перевод, грамматический разбор и список слов.', href: '/texts', color: '#E8604A' },
            { icon: '📖', title: 'Грамматика', desc: 'Изучайте грамматические конструкции с примерами на реальных текстах и тренируйте их в упражнениях.', href: '/grammar', color: '#2D5A3D' },
            { icon: '🔍', title: 'Словарь', desc: 'Сохраняйте новые слова, повторяйте их с помощью карточек и отслеживайте свой прогресс.', href: '/vocabulary', color: '#8B7355' },
            { icon: '▶', title: 'Аудио/Видео', desc: 'Смотрите видео и слушайте аудио с субтитрами, сохраняйте слова и выражения.', href: '#', color: '#6B7FCC' },
          ].map(f => (
            <a key={f.title} href={f.href} className="feature-card" style={{ textDecoration: 'none' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: f.color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, marginBottom: 16,
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#6B6355', lineHeight: 1.65, marginBottom: 20 }}>{f.desc}</p>
              <div style={{ color: f.color, fontSize: 18, fontWeight: 700 }}>→</div>
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
        <div style={{ marginBottom: 48, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#E8604A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
              Как это работает
            </div>
            <h2 style={{ fontFamily: "'Noto Serif JP'", fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700 }}>
              Три шага до понимания
            </h2>
          </div>
          <Link href="/texts" className="btn-primary" style={{ flexShrink: 0 }}>Попробовать →</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {[
            { n: '01', title: 'Загрузи текст', desc: 'Вставь любой японский текст — новость, рецепт, манга, субтитры. Без ограничений по теме.' },
            { n: '02', title: 'Анализируй', desc: 'Кликай на слова — получай перевод и грамматику. Переключайся между режимами перевода и анализа.' },
            { n: '03', title: 'Запоминай', desc: 'Добавляй незнакомые слова в словарь. Повторяй с карточками. Экспортируй в Anki.' },
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
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px max(24px, calc(50vw - 640px)) 96px' }}>
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#E8604A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
            Тарифы
          </div>
          <h2 style={{ fontFamily: "'Noto Serif JP'", fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#1A1A1A' }}>
            Выберите тарифный план
          </h2>
        </div>

        <div className="plans-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          maxWidth: 900,
          margin: '0 auto',
        }}>
          {/* Free */}
          <div className="plan-card">
            <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#8B7355', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Free</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#1A1A1A' }}>0 ₽</span>
            </div>
            <div style={{ fontSize: 13, color: '#8B7355', marginBottom: 28 }}>/ месяц</div>
            <div style={{ borderTop: '1px solid #EDE8E1', paddingTop: 24, marginBottom: 28 }}>
              {['Загрузка до 5 текстов в месяц', 'Базовый словарь (до 100 слов)', 'Ограниченный доступ к упражнениям'].map(f => (
                <div key={f} className="check-item"><span className="check-icon">✓</span>{f}</div>
              ))}
            </div>
            <button style={{
              width: '100%', padding: '13px', borderRadius: 50,
              border: '1.5px solid #EDE8E1', background: 'transparent',
              fontSize: 14, fontWeight: 600, color: '#8B7355', cursor: 'default',
            }}>
              Текущий план
            </button>
          </div>

          {/* Standard */}
          <div className="plan-card">
            <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#2D5A3D', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Standart</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#1A1A1A' }}>490 ₽</span>
            </div>
            <div style={{ fontSize: 13, color: '#8B7355', marginBottom: 28 }}>/ месяц</div>
            <div style={{ borderTop: '1px solid #EDE8E1', paddingTop: 24, marginBottom: 28 }}>
              {['Загрузка до 50 текстов в месяц', 'Расширенный словарь', 'Все упражнения', 'Аудио и видео с субтитрами'].map(f => (
                <div key={f} className="check-item"><span className="check-icon">✓</span>{f}</div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Выбрать план
            </button>
          </div>

          {/* Premium */}
          <div className="plan-card featured">
            {/* Бейдж */}
            <div style={{
              position: 'absolute', top: -12, right: 20,
              background: '#E8604A', color: 'white',
              borderRadius: 50, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>⭐</div>
            <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#E8604A', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Premium</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#1A1A1A' }}>990 ₽</span>
            </div>
            <div style={{ fontSize: 13, color: '#8B7355', marginBottom: 28 }}>/ месяц</div>
            <div style={{ borderTop: '1px solid #EDE8E1', paddingTop: 24, marginBottom: 28 }}>
              {['Неограниченная загрузка текстов', 'Полный доступ ко всем функциям', 'Персональная статистика', 'Приоритетная поддержка'].map(f => (
                <div key={f} className="check-item"><span className="check-icon">✓</span>{f}</div>
              ))}
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Выбрать план
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
