'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, logout, getAccessToken, APIError } from '@/lib/api';

interface MeResponse {
  user_id: string;
  role: string;
  email: string;
  handle: string;
  display_name: string;
  message_price_coins: number;
  is_verified: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        const data = await getMe();
        setMe(data);
      } catch (err) {
        if (err instanceof APIError && err.status === 401) {
          router.replace('/login');
          return;
        }
        setError('Konto konnte nicht geladen werden.');
      }
    })();
  }, [router]);

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  if (!me) {
    return <div className="p-8 text-zinc-500">Lade…</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="font-bold tracking-tight">Creator Studio</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">@{me.handle}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Hi, {me.display_name} 👋</h1>
          <p className="mt-1 text-sm text-zinc-500">Willkommen in deinem Studio.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Nachrichten-Preis</div>
            <div className="mt-1 text-2xl font-bold">{me.message_price_coins} Coins</div>
            <div className="mt-1 text-xs text-zinc-500">pro Kunden-Nachricht</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Status</div>
            <div className="mt-1 text-2xl font-bold">{me.is_verified ? '✓ Verifiziert' : 'Aktiv'}</div>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Email</div>
            <div className="mt-1 truncate text-base font-medium">{me.email}</div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <h2 className="text-lg font-semibold">Inbox & Chat kommen in der nächsten Iteration</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Auth funktioniert. Als nächstes bauen wir Echtzeit-Chat, Coin-Käufe und Media-Upload.
          </p>
        </div>
      </main>
    </div>
  );
}
