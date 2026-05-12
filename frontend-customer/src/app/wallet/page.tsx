'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, getAccessToken, APIError } from '@/lib/api';

export default function WalletPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        setMe(await getMe());
      } catch (err) {
        if (err instanceof APIError && err.status === 401) router.replace('/login');
      }
    })();
  }, [router]);

  if (!me) return <div className="p-8 text-zinc-500">Lade…</div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/explore" className="font-bold tracking-tight">LiveCreator</Link>
          <Link href="/explore" className="text-sm text-zinc-500 hover:underline">
            ← zurück
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 md:p-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Dein Wallet</h1>

        <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-center">
            <div className="text-sm uppercase tracking-wide text-zinc-500">Aktuelles Guthaben</div>
            <div className="mt-2 text-5xl font-bold">0</div>
            <div className="mt-1 text-sm text-zinc-500">Coins</div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
          <h2 className="text-lg font-semibold">Coin-Käufe kommen in der nächsten Iteration</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Wir bauen als nächstes das Bezahl-System (PSP-Integration) und die Coin-Pakete.
          </p>
        </div>
      </main>
    </div>
  );
}
