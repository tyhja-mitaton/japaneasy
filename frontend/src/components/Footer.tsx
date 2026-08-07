'use client';

import Link from 'next/link';
import { useI18n, tf } from '@/lib/i18n';

export default function Footer() {
  const { t } = useI18n();

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <img src="/japaneasy-logo.png" alt="JapanEasy" style={{ height: 100, width: 'auto', marginTop: 4 }} />
        </div>
      </Link>
      <div style={{ fontSize: 13, color: '#8B7355' }}>
        {t.footer.motto}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link href="/feedback" className="link-hover-text-coral" style={{
          fontSize: 13,
          color: '#8B7355',
          textDecoration: 'none',
          transition: 'color 0.2s',
        }}>
          {t.footer.feedback}
        </Link>
        <div style={{ fontSize: 12, color: '#D4C5B0' }}>{tf(t.footer.copyright, { year: new Date().getFullYear() })}</div>
      </div>
    </footer>
  );
}
