'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { notifyAuthChanged } from '@/lib/auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Status = { status: string; amount: number | string; plan?: string };

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const params = useSearchParams();
  const router = useRouter();
  const paymentId = params.get('payment');

  const [state, setState] = useState<'pending' | 'completed' | 'failed' | 'error'>(
    paymentId ? 'pending' : 'error'
  );
  const [data, setData] = useState<Status | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    if (!paymentId) return;

    let cancelled = false;
    let attempts = 0;

    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/payments/${paymentId}/status`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          router.push('/auth/login');
          return;
        }
        if (!res.ok) throw new Error('status request failed');
        const d: Status = await res.json();
        if (cancelled) return;

        setData(d);
        if (d.status === 'completed') {
          setState('completed');
          if (!notifiedRef.current) {
            notifiedRef.current = true;
            notifyAuthChanged();
          }
        } else if (d.status === 'failed' || d.status === 'cancelled' || d.status === 'refunded') {
          setState('failed');
        } else {
          attempts += 1;
          if (attempts < 12) {
            setTimeout(check, 2500);
          }
        }
      } catch {
        if (!cancelled) setState('error');
      }
    };

    check();
    return () => { cancelled = true; };
  }, [paymentId, router]);

  const amount = data?.amount != null
    ? Number(data.amount).toLocaleString('ru-RU') + ' ₽'
    : '';

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
        {state === 'pending' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
            <h1 style={{
              fontFamily: "'Noto Serif JP'",
              fontSize: 28,
              fontWeight: 700,
              color: '#1A1A1A',
              marginBottom: 12,
            }}>
              Ожидаем подтверждение оплаты
            </h1>
            <p style={{ fontSize: 15, color: '#8B7355', marginBottom: 24, lineHeight: 1.6 }}>
              Платёж ещё обрабатывается. Обычно это занимает несколько секунд.
            </p>
            <div style={{ fontSize: 13, color: '#B9A88F' }}>
              Не закрывайте эту страницу
            </div>
          </>
        )}

        {state === 'completed' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
            <h1 style={{
              fontFamily: "'Noto Serif JP'",
              fontSize: 28,
              fontWeight: 700,
              color: '#2D5A3D',
              marginBottom: 12,
            }}>
              Оплата прошла успешно!
            </h1>
            {amount && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(45,90,61,0.1)',
                color: '#2D5A3D',
                borderRadius: 50,
                padding: '6px 14px',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 12,
              }}>
                {amount}
              </div>
            )}
            <p style={{ fontSize: 15, color: '#8B7355', marginBottom: 32, lineHeight: 1.6 }}>
              {data?.plan
                ? `Тариф «${data.plan === 'premium' ? 'Premium' : 'Standard'}» активирован.`
                : 'Ваш тариф активирован.'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                href="/texts"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#D14A35';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#E8604A';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Перейти к текстам
              </Link>
              <Link
                href="/"
                style={{
                  fontSize: 14,
                  color: '#8B7355',
                  textDecoration: 'none',
                  padding: '8px',
                }}
              >
                Вернуться на главную
              </Link>
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
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
              Оплата не прошла. Вы можете попробовать ещё раз или выбрать другой способ оплаты.
            </p>
            <Link
              href="/#pricing"
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
              onMouseEnter={e => {
                e.currentTarget.style.background = '#D14A35';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#E8604A';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Попробовать снова
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>⚠️</div>
            <h1 style={{
              fontFamily: "'Noto Serif JP'",
              fontSize: 28,
              fontWeight: 700,
              color: '#1A1A1A',
              marginBottom: 12,
            }}>
              Не удалось получить статус
            </h1>
            <p style={{ fontSize: 15, color: '#8B7355', marginBottom: 32, lineHeight: 1.6 }}>
              Проверьте подключение и обновите страницу. Если оплата прошла, статус тарифа обновится автоматически.
            </p>
            <button
              onClick={() => router.refresh()}
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
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#D14A35'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#E8604A'; }}
            >
              Обновить страницу
            </button>
          </>
        )}
      </div>
    </div>
  );
}
