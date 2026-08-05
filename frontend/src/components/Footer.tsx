import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #EDE8E1',
      padding: '32px max(24px, calc(50vw - 640px))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 16,
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontFamily: "'Noto Serif JP'", fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>日本語</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#8B7355', letterSpacing: '0.18em' }}>NIHONGO</span>
        </div>
      </Link>
      <div style={{ fontSize: 13, color: '#8B7355' }}>
        継続は力なり — Настойчивость — это сила
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link href="/feedback" className="link-hover-text-coral" style={{
          fontSize: 13,
          color: '#8B7355',
          textDecoration: 'none',
          transition: 'color 0.2s',
        }}>
          Обратная связь
        </Link>
        <div style={{ fontSize: 12, color: '#D4C5B0' }}>© {new Date().getFullYear()} JapanEasy</div>
      </div>
    </footer>
  );
}
