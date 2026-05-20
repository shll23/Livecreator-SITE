'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { getInbox, logout, getAccessToken } from '@/lib/api';

// ============================================================================
// BottomTabBar — Mobile-Navigation am unteren Bildschirmrand
//
// Drei Tabs:
//   - Entdecken (/explore, /profil/*)
//   - Nachrichten (/inbox, /inbox/*)   — mit Badge bei ungelesenen
//   - Profil — öffnet ein Slide-Up Menü mit Profil/Wallet/Einstellungen/Logout
//
// Sichtbar nur auf Mobile (< 1024px / lg).
// Versteckt im Chat-Vollbild (/inbox/[id]) damit der Composer Platz hat.
// ============================================================================

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    refresh();
    const interval = setInterval(refresh, 5000);
    const onRefresh = () => refresh();
    window.addEventListener('app:refresh-inbox', onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('app:refresh-inbox', onRefresh);
    };
  }, []);

  async function refresh() {
    if (!getAccessToken()) return;
    try {
      const inboxRes = await getInbox();
      const total = inboxRes.conversations.reduce((sum, c) => sum + c.unread_count, 0);
      setUnreadCount(total);
    } catch {}
  }

  // Verstecke Tab Bar wenn:
  //  - Nicht eingeloggt
  //  - Auf Public-Seiten wie /, /login, /register
  //  - Im Chat-Vollbild Mobile (/inbox/[id])
  const hideTabBar =
    !mounted ||
    !getAccessToken() ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/welcome' ||
    /^\/inbox\/[^/]+$/.test(pathname || '');

  if (hideTabBar) return null;

  const isExplore = pathname?.startsWith('/explore') || pathname?.startsWith('/profil');
  const isInbox = pathname === '/inbox';
  const isProfileOpen = menuOpen;

  async function handleLogout() {
    try { await logout(); } catch {}
    setMenuOpen(false);
    router.push('/login');
  }

  return (
    <>
      {/* Backdrop für Slide-Up Menu */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 animate-fade-up"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Slide-Up Profil-Menu */}
      {menuOpen && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white rounded-t-3xl z-50 pb-8 pt-4 px-3 shadow-2xl animate-fade-up">
          {/* Pull-Bar */}
          <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto mb-4" />

          <div className="px-2 mb-4">
            <h2 className="font-display text-lg font-semibold">Mein Bereich</h2>
          </div>

          <div className="space-y-1">
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
            >
              <span className="w-9 h-9 rounded-full bg-pink-50 text-brand-600 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              </span>
              <div className="flex-1">
                <div className="font-medium text-sm text-zinc-900">Mein Profil</div>
                <div className="text-xs text-zinc-500">Konto verwalten</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>

            <Link
              href="/wallet"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
            >
              <span className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              </span>
              <div className="flex-1">
                <div className="font-medium text-sm text-zinc-900">Coins kaufen</div>
                <div className="text-xs text-zinc-500">Guthaben aufladen</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>

            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
            >
              <span className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <div className="flex-1">
                <div className="font-medium text-sm text-zinc-900">Einstellungen</div>
                <div className="text-xs text-zinc-500">Benachrichtigungen, Sicherheit</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors text-left mt-2"
            >
              <span className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <div className="flex-1">
                <div className="font-medium text-sm text-red-700">Abmelden</div>
                <div className="text-xs text-red-500">Sicher ausloggen</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* TAB BAR — fixed unten Mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-zinc-200 z-30 pb-safe">
        <div className="grid grid-cols-3 h-16">
          {/* Entdecken */}
          <Link
            href="/explore"
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              isExplore && !isProfileOpen ? 'text-brand-600' : 'text-zinc-500'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="text-[10px] font-medium">Entdecken</span>
          </Link>

          {/* Nachrichten */}
          <Link
            href="/inbox"
            className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${
              isInbox && !isProfileOpen ? 'text-brand-600' : 'text-zinc-500'
            }`}
          >
            <div className="relative">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {mounted && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-brand-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Nachrichten</span>
          </Link>

          {/* Profil */}
          <button
            onClick={() => setMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              isProfileOpen ? 'text-brand-600' : 'text-zinc-500'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-[10px] font-medium">Profil</span>
          </button>
        </div>
      </nav>
    </>
  );
}
