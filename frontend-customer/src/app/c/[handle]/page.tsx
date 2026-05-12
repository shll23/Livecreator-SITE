'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { api, getAccessToken, getWallet, APIError } from '@/lib/api';
import { Header } from '@/components/Header';

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

export default function CreatorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const handle = params.handle as string;

  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<Creator>(`/api/creators/${handle}`);
        setCreator(data);
      } catch (err) {
        if (err instanceof APIError && err.status === 404) {
          setError('Creator nicht gefunden.');
        } else {
          setError('Profil konnte nicht geladen werden.');
        }
      } finally {
        setLoading(false);
      }
    })();

    if (getAccessToken()) {
      getWallet().then((d) => setBalance(d.balance_coins)).catch(() => {});
    }
  }, [handle]);

  function handleStartChat() {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    // Chat kommt in nächster Session
    alert('Chat-Funktion kommt in der nächsten Iteration. Coin-System läuft schon ✓');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-mesh">
        <Header />
        <div className="p-8 text-zinc-500">Lade…</div>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="min-h-screen bg-mesh">
        <Header />
        <div className="mx-auto max-w-2xl p-8 text-center">
          <p className="text-zinc-600">{error}</p>
          <Link href="/explore" className="mt-4 inline-block text-brand-600 hover:underline">
            ← Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const initials = creator.display_name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const insufficientCoins = balance !== null && balance < creator.message_price_coins;

  return (
    <div className="min-h-screen bg-mesh">
      <Header />

      <main className="mx-auto max-w-3xl p-4 md:p-8">
        <Link href="/explore" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          ← Alle Creators
        </Link>

        <div className="animate-fade-up overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lg">
          <div
            className="relative h-48 bg-brand-gradient md:h-64"
            style={creator.cover_url ? { backgroundImage: `url(${creator.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          />

          <div className="px-6 pb-8 md:px-10 md:pb-10">
            <div className="-mt-16 mb-4 flex items-end justify-between">
              <div className="grid h-32 w-32 place-items-center rounded-full border-4 border-white bg-gradient-to-br from-brand-100 to-brand-200 text-3xl font-bold text-brand-700 shadow-lg">
                {creator.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={creator.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold tracking-tight">{creator.display_name}</h1>
              {creator.is_verified && (
                <svg className="h-6 w-6 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="mt-1 text-zinc-500">@{creator.handle}</div>

            {creator.bio && (
              <p className="mt-5 leading-relaxed text-zinc-700">{creator.bio}</p>
            )}

            <div className="mt-8 rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/50 p-5 ring-1 ring-brand-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                    Pro Nachricht
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-display text-3xl font-bold tracking-tight text-zinc-900">
                      {creator.message_price_coins}
                    </span>
                    <span className="text-sm font-semibold text-zinc-600">Coins</span>
                  </div>
                </div>
                <button
                  onClick={handleStartChat}
                  className="rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-pink transition hover:from-brand-600 hover:to-brand-700"
                >
                  Chat starten
                </button>
              </div>

              {insufficientCoins && (
                <div className="mt-4 rounded-xl bg-white p-3 text-xs text-amber-700 ring-1 ring-amber-200">
                  Du hast nur <span className="font-semibold">{balance} Coins</span>. Du brauchst mindestens{' '}
                  <span className="font-semibold">{creator.message_price_coins}</span>.{' '}
                  <Link href="/wallet" className="underline font-semibold">
                    Coins kaufen →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
