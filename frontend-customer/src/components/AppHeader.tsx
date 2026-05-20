'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getWallet, getInbox, logout, getAccessToken } from '@/lib/api';

// ============================================================================
// LOGO
// ============================================================================
function Logo() {
  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2">
      <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span className="font-display text-lg sm:text-2xl font-semibold tracking-tight text-zinc-900">
        verliebdich
      </span>
    </span>
  );
}

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const [coins, setCoins] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    refreshData();
    const interval = setInterval(refreshData, 5000);
    const onRefresh = () => refreshData();
    window.addEventListener('app:refresh-balance', onRefresh);
    window.addEventListener('app:refresh-inbox', onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('app:refresh-balance', onRefresh);
      window.removeEventListener('app:refresh-inbox', onRefresh);
    };
  }, []);

  async function refreshData() {
    if (!getAccessToken()) return;
    try {
      const [walletRes, inboxRes] = await Promise.all([
        getWallet().catch(() => null),
        getInbox().catch(() => null),
      ]);
      if (walletRes) setCoins(walletRes.balance_coins);
      if (inboxRes) {
        const total = inboxRes.conversations.reduce((sum, c) => sum + c.unread_count, 0);
        setUnreadCount(total);
      }
    } catch {}
  }

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    setTimeout(() => document.addEventListener('click', close), 0);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  async function handleLogout() {
    try { await logout(); } catch {}
    router.push('/login');
  }

  const isExplore = pathname?.startsWith('/explore');
  const isInbox = pathname?.startsWith('/inbox');

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link href="/explore" aria-label="Zur Startseite">
          <Logo />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <nav className="hidden sm:flex items-center gap-1 mr-2">
            <Link
              href="/explore"
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isExplore ? 'bg-brand-50 text-brand-700' : 'text-zinc-600 hover:text-brand-600 hover:bg-zinc-50'
              }`}
            >
              Entdecken
            </Link>
            <Link
              href="/inbox"
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isInbox ? 'bg-brand-50 text-brand-700' : 'text-zinc-600 hover:text-brand-600 hover:bg-zinc-50'
              }`}
            >
              Chats
              {mounted && unreadCount > 0 && (
                <span className="bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </nav>

          <Link
            href="/wallet"
            className="flex items-center gap-1.5 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200/60 px-2.5 sm:px-3.5 py-1.5 rounded-full hover:from-amber-100 hover:to-yellow-100 transition-all"
            aria-label="Coins kaufen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" className="text-amber-500 sm:w-4 sm:h-4" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <text x="12" y="16" fontSize="10" fontWeight="bold" textAnchor="middle" fill="white">€</text>
            </svg>
            <span className="text-sm sm:text-base font-bold text-amber-700 tabular-nums">
              {mounted && coins !== null ? coins : '…'}
            </span>
          </Link>

          <Link
            href="/inbox"
            className="sm:hidden relative p-2 rounded-full hover:bg-zinc-100 transition-colors"
            aria-label="Chats"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {mounted && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-brand-600 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-semibold text-sm flex items-center justify-center hover:scale-105 transition-transform"
              aria-label="Menü"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="opacity-90">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-zinc-200/60 overflow-hidden animate-fade-up">
                <Link href="/wallet" className="flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-700 hover:bg-brand-50 hover:text-brand-700 transition-colors border-b border-zinc-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
                  </svg>
                  Coins kaufen
                </Link>
                <Link href="/settings" className="flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-700 hover:bg-brand-50 hover:text-brand-700 transition-colors border-b border-zinc-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Einstellungen
                </Link>
                <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-zinc-700 hover:bg-red-50 hover:text-red-700 transition-colors text-left">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Abmelden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
