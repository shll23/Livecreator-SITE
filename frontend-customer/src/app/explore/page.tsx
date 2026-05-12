'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
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

export default function ExplorePage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ creators: Creator[] }>('/api/creators');
        setCreators(data.creators);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-mesh">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-200/60">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500"></span>
              Echte Creators · Direkte Chats
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Verbinde dich.<br />
              <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
                Wie noch nie zuvor.
              </span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-zinc-600">
              Entdecke außergewöhnliche Persönlichkeiten und führe private, persönliche Gespräche — auf deinen Bedingungen.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl"></div>
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl"></div>
      </section>

      {/* Creator Grid */}
      <main className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Entdecke Creators
          </h2>
          {!loading && creators.length > 0 && (
            <span className="text-sm text-zinc-500">{creators.length} {creators.length === 1 ? 'Creator' : 'Creators'}</span>
          )}
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="h-28 bg-zinc-100 shimmer"></div>
                <div className="px-5 pb-5 pt-3 space-y-3">
                  <div className="h-16 w-16 -mt-12 rounded-full bg-zinc-200 shimmer"></div>
                  <div className="h-4 w-32 rounded bg-zinc-200 shimmer"></div>
                  <div className="h-3 w-20 rounded bg-zinc-100 shimmer"></div>
                </div>
              </div>
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white/50 p-12 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-500">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <p className="font-display text-lg font-semibold">Noch keine Creators</p>
            <p className="mt-1 text-sm text-zinc-500">
              Registriere einen Creator unter{' '}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono">localhost:3001</code>
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((c, i) => (
              <CreatorCard key={c.user_id} creator={c} delay={i * 60} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CreatorCard({ creator, delay }: { creator: Creator; delay: number }) {
  const initials = creator.display_name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Link
      href={`/c/${creator.handle}`}
      className="group block animate-fade-up overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all hover:-translate-y-1 hover:border-brand-300 hover:shadow-pink"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="relative h-28 bg-brand-gradient"
        style={creator.cover_url ? { backgroundImage: `url(${creator.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {creator.is_verified && (
          <div className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-white shadow-sm">
            <svg className="h-3.5 w-3.5 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <div className="-mt-9 mb-3 grid h-16 w-16 place-items-center rounded-full border-[3px] border-white bg-gradient-to-br from-brand-100 to-brand-200 text-base font-bold text-brand-700 shadow-md">
          {creator.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>

        <div className="font-display text-lg font-semibold leading-tight">{creator.display_name}</div>
        <div className="mt-0.5 text-sm text-zinc-500">@{creator.handle}</div>

        {creator.bio && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600">{creator.bio}</p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
          <div className="text-xs text-zinc-500">
            <span className="font-semibold text-zinc-900">{creator.message_price_coins}</span> Coins/Nachricht
          </div>
          <span className="rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white transition group-hover:bg-brand-500">
            Chat starten →
          </span>
        </div>
      </div>
    </Link>
  );
}
