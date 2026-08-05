'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function BillingFailPage() {
  return (
    <Suspense fallback={null}>
      <FailContent />
    </Suspense>
  );
}

function FailContent() {
  const params = useSearchParams();
  const paymentId = params.get('payment');

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
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
        <div style={{ fontSize: 64, marginBottom: 24 }}>❌</div>
        <h1 style={{
          fontFamily: "'Noto Serif JP'",
          fontSize: 28,
          fontWeight: 700,
          color: '#D14A35',
          marginBottom: 12,
        }}>
          Платёж не завершён
        </h1>
        <p style={{ fontSize: 15, color: '#8B7355', marginBottom: 32, lineHeight: 1.6 }}>
          Что-то пошло не так при оплате. Средства не были списаны — вы можете попробовать ещё раз.
        </p>
        {paymentId && (
          <div style={{
            fontSize: 12,
            color: '#B9A88F',
            fontFamily: 'monospace',
            marginBottom: 24,
          }}>
            Платёж №{paymentId}
          </div>
        )}
        <Link
          href="/#pricing"
          className="link-hover-bg-coral"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#E8604A',
            color: 'white',
            border: 'none',
            borderRadius: 50,
            padding: '14px 28px',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background 0.2s, transform 0.15s',
          }}
        >
          Попробовать снова
        </Link>
      </div>
    </div>
  );
}
