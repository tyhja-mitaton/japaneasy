'use client';

import { useEffect, useState } from 'react';
import LegalLayout from '@/components/LegalLayout';
import { useI18n } from '@/lib/i18n';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type LegalInfo = { fio: string; inn: string; email: string };

export default function LegalInfoPage() {
  const { t } = useI18n();
  const [info, setInfo] = useState<LegalInfo | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/legal/info`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(setInfo)
      .catch(() => setInfo({ fio: '', inn: '', email: '' }));
  }, []);

  const rows = info
    ? [
        { label: t.legal.fioLabel, value: info.fio },
        { label: t.legal.innLabel, value: info.inn },
        { label: t.legal.emailLabel, value: info.email },
      ]
    : [];

  return (
    <LegalLayout title={t.legal.infoTitle} desc={t.legal.infoDesc}>
      {!info ? (
        <div style={{ fontSize: 14, color: '#8B7355' }}>{t.common.loading}</div>
      ) : (
        rows.map(row => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 0',
              borderBottom: '1px solid #F5F1EA',
            }}
          >
            <div style={{
              width: 140,
              fontSize: 13,
              color: '#8B7355',
              flexShrink: 0,
            }}>
              {row.label}
            </div>
            <div style={{
              fontSize: 15,
              color: '#1A1A1A',
              fontWeight: 500,
              wordBreak: 'break-word',
            }}>
              {row.value || '—'}
            </div>
          </div>
        ))
      )}
    </LegalLayout>
  );
}
