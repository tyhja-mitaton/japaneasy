'use client';

import LegalLayout from '@/components/LegalLayout';
import LegalDocument from '@/components/LegalDocument';
import { ofertaContent } from '@/lib/legalContent';
import { useI18n } from '@/lib/i18n';

export default function OfertaPage() {
  const { t } = useI18n();

  return (
    <LegalLayout title={t.legal.ofertaTitle} desc={t.legal.ofertaDesc}>
      <LegalDocument blocks={ofertaContent} />
    </LegalLayout>
  );
}
