'use client';

import LegalLayout from '@/components/LegalLayout';
import LegalDocument from '@/components/LegalDocument';
import { privacyContent } from '@/lib/legalContent';
import { useI18n } from '@/lib/i18n';

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <LegalLayout title={t.legal.privacyTitle} desc={t.legal.privacyDesc}>
      <LegalDocument blocks={privacyContent} />
    </LegalLayout>
  );
}
