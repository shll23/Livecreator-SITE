'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, getWallet, logout } from '@/lib/api';

interface HeaderProps {
  showWallet?: boolean;
}

export function Header({ showWallet = true }: HeaderProps) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    setAuthed(!!token);

    if (token && showWallet) {
      getWallet()
        .then((d) => setBalance(d.balance_coins))
        .catch(() => setBalance(null));
    }
  }, [showWallet]);

  async function handleLogout() {
    await logout();
    setAuthed(false);
    setBalance(null);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 md:px-6">
        <Link href="/explore" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-pink">
            <span className="font-display text-lg font-bold text-white">v</span>
          </div>
          <span className="font-display text-xl font-bold tracking-tight">verliebdich</span>
        </Link>

        <div className="flex items-center gap-1.5">
          {authed ? (
            <>
              {showWallet && (
                <Link
                  href="/wallet"
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-50 to-brand-100 px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:from-brand-100 hover:to-brand-200"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <circle cx="12" cy="12" r="9" />
                    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" stroke="none" fontWeight="bold">¢</text>
                  </svg>
                  <span>{balance ?? '…'}</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                Abmelden
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Anmelden
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                Registrieren
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
