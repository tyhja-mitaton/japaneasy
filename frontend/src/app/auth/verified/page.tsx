'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type StatusContent = {
  icon: string;
  title: string;
  text: string;
  color: string;
};

export default function VerifiedPage() {
    return (
        <Suspense fallback={null}>
            <VerifiedContent />
        </Suspense>
    );
}

function VerifiedContent() {
    const params = useSearchParams();
    const status = params.get('status');

    const content: StatusContent = (() => {
        switch (status) {
            case 'success':
                return { icon: '✅', title: 'Email подтверждён!', text: 'Ваш аккаунт активен. Теперь вы можете войти.', color: '#2D5A3D' };
            case 'expired':
                return { icon: '⏰', title: 'Ссылка истекла', text: 'Запросите новое письмо для подтверждения.', color: '#E8604A' };
            default:
                return { icon: '❌', title: 'Неверная ссылка', text: 'Эта ссылка для подтверждения недействительна.', color: '#D14A35' };
        }
    })();

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
                <div style={{ fontSize: 64, marginBottom: 24 }}>{content.icon}</div>
                <h1 style={{
                    fontFamily: "'Noto Serif JP'",
                    fontSize: 28,
                    fontWeight: 700,
                    color: '#1A1A1A',
                    marginBottom: 12,
                }}>
                    {content.title}
                </h1>
                <p style={{
                    fontSize: 15,
                    color: '#8B7355',
                    marginBottom: 32,
                    lineHeight: 1.6,
                }}>
                    {content.text}
                </p>
                <Link
                    href="/auth/login"
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
                    Войти в аккаунт
                </Link>
            </div>
        </div>
    );
}
