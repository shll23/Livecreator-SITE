'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, getMe, logout } from '@/lib/api';

export function Header() {
  const router = useRouter();
  const [handle, setHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    getMe()
      .then((d) => setHandle(d.handle))
      .catch(() => setHandle(null));
  }, []);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-pink">
            <span className="font-display text-lg font-bold text-white">v</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-bold tracking-tight">Creator Studio</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">verliebdich</span>
          </div>
        </Link>

        {handle && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-zinc-600 sm:inline">
              @{handle}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Abmelden
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
