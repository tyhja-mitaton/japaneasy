'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi, notifyAuthChanged, AUTH_CHANGED_EVENT } from '@/lib/auth-api';

type UserInfo = {
  id?: number;
  name?: string;
};

export default function Navbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const refreshAuth = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoggedIn(false);
        setUserName('');
        setUserId(null);
        return;
      }

      authApi.me()
        .then((user: UserInfo) => {
          setIsLoggedIn(true);
          setUserName(user.name?.charAt(0) || 'Я');
          setUserId(user.id ?? null);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setIsLoggedIn(false);
          setUserName('');
          setUserId(null);
        });
    };

    refreshAuth();
    window.addEventListener(AUTH_CHANGED_EVENT, refreshAuth);
    window.addEventListener('storage', refreshAuth);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, refreshAuth);
      window.removeEventListener('storage', refreshAuth);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      notifyAuthChanged();
      setIsLoggedIn(false);
      setUserName('');
      setUserId(null);
      router.push('/');
    }
  };

  const navLinks = isLoggedIn
    ? [
        { label: 'Тексты', href: '/texts' },
        { label: 'Грамматика', href: '/grammar' },
        { label: 'Словарь', href: '/vocabulary' },
      ]
    : [
        { label: 'Главная', href: '/' },
        { label: 'Грамматика', href: '/grammar' },
      ];

  return (
    <>
      <style>{`
        .nav-link {
          color: #1A1A1A;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.01em;
          transition: color 0.2s;
          padding: 4px 0;
          border-bottom: 2px solid transparent;
        }
        .nav-link:hover { color: #E8604A; border-bottom-color: #E8604A; }

        .nav-btn-primary {
          background: #E8604A;
          color: white;
          border: none;
          border-radius: 50px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s;
        }
        .nav-btn-primary:hover { background: #D14A35; }

        .nav-btn-outline {
          background: transparent;
          color: #1A1A1A;
          border: 1.5px solid #D4C5B0;
          border-radius: 50px;
          padding: 9px 18px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: border-color 0.2s, color 0.2s;
        }
        .nav-btn-outline:hover { border-color: #8B7355; color: #8B7355; }

        .nav-hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: #1A1A1A;
          font-size: 24px;
        }

        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .nav-hamburger { display: block; }
          .nav-mobile-menu {
            position: fixed;
            top: 64px;
            left: 0;
            right: 0;
            background: #F7F3EE;
            border-bottom: 1px solid #EDE8E1;
            padding: 16px 24px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            z-index: 99;
          }
          .nav-mobile-menu.hidden { display: none; }
        }
      `}</style>

      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(247,243,238,0.95)' : '#F7F3EE',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #EDE8E1' : '1px solid transparent',
        transition: 'all 0.3s',
        padding: '0 max(24px, calc(50vw - 640px))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 64, gap: 48 }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ fontFamily: "'Noto Serif JP'", fontSize: 20, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em' }}>日本語</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#8B7355', letterSpacing: '0.18em' }}>NIHONGO</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="nav-links-desktop" style={{ display: 'flex', gap: 32, flex: 1 }}>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className="nav-link">{link.label}</Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="nav-links-desktop" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {isLoggedIn ? (
              <>
                <button
                  onClick={handleLogout}
                  className="nav-btn-outline"
                >
                  Выйти
                </button>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#E8604A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'transform 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {userId ? (
                    <Link href={`/profile/${userId}`} style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      color: 'white',
                    }}>
                      {userName || 'Я'}
                    </Link>
                  ) : (
                    userName || 'Я'
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="nav-btn-outline">Войти</Link>
                <Link href="/auth/register" className="nav-btn-primary">Регистрация</Link>
              </>
            )}
          </div>

          {/* Hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`nav-mobile-menu ${menuOpen ? '' : 'hidden'}`}>
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <>
              <button
                onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="nav-btn-outline"
                style={{ width: 'fit-content' }}
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="nav-btn-outline" onClick={() => setMenuOpen(false)}>Войти</Link>
              <Link href="/auth/register" className="nav-btn-primary" onClick={() => setMenuOpen(false)}>Регистрация</Link>
            </>
          )}
        </div>
      </header>
    </>
  );
}
