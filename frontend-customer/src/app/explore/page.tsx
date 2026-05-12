'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getAccessToken, logout } from '@/lib/api';

interface Creator {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  message_price_coins: number;
  is_verified: boolean;
}

export default function ExplorePage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!getAccessToken());
    (async () => {
      try {
        const data = await api<{ creators: Creator[] }>('/api/creators');
        setCreators(data.creators);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleLogout() {
    await logout();
    setAuthed(false);
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/explore" className="font-bold tracking-tight">LiveCreator</Link>
          <div className="flex items-center gap-2">
            {authed ? (
              <>
                <Link href="/wallet" className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  Wallet
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  Anmelden
                </Link>
                <Link href="/register" className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm text-white hover:bg-brand-700">
                  Registrieren
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 md:p-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Entdecke Creators</h1>

        {loading ? (
          <div className="text-zinc-500">Lade…</div>
        ) : creators.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
            <p className="text-zinc-500">Noch keine Creators verfügbar.</p>
            <p className="mt-2 text-sm text-zinc-400">
              Registriere einen Creator unter <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">localhost:3001</code>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((c) => (
              <CreatorCard key={c.user_id} creator={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CreatorCard({ creator }: { creator: Creator }) {
  const initials = creator.display_name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div
        className="h-24 bg-gradient-to-br from-brand-500 to-brand-700"
        style={creator.cover_url ? { backgroundImage: `url(${creator.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      />
      <div className="px-4 pb-4">
        <div className="-mt-8 mb-3 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-zinc-200 text-xl font-bold text-zinc-600 dark:border-zinc-900 dark:bg-zinc-700 dark:text-zinc-200">
          {creator.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="font-semibold">{creator.display_name}</span>
          {creator.is_verified && <span className="text-brand-500">✓</span>}
        </div>
        <div className="text-sm text-zinc-500">@{creator.handle}</div>
        {creator.bio && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{creator.bio}</p>}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-zinc-500">
            {creator.message_price_coins} Coins / Nachricht
          </span>
          <button className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">
            Chat
          </button>
        </div>
      </div>
    </div>
  );
}
