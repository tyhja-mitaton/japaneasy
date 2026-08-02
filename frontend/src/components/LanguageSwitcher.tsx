'use client';

import { useI18n, Lang } from '@/lib/i18n';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'white',
        border: '1px solid #EDE8E1',
        borderRadius: 50,
        padding: 4,
      }}
    >
      {(['ru', 'en'] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            border: 'none',
            cursor: 'pointer',
            padding: '7px 16px',
            borderRadius: 50,
            fontSize: 13,
            fontWeight: 600,
            transition: 'all 0.2s',
            background: lang === l ? '#E8604A' : 'transparent',
            color: lang === l ? 'white' : '#8B7355',
          }}
          onMouseEnter={e => {
            if (lang !== l) e.currentTarget.style.color = '#1A1A1A';
          }}
          onMouseLeave={e => {
            if (lang !== l) e.currentTarget.style.color = '#8B7355';
          }}
        >
          {l === 'ru' ? 'RU' : 'EN'}
        </button>
      ))}
    </div>
  );
}
