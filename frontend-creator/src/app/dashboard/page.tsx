'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, getAccessToken, APIError } from '@/lib/api';
import { Header } from '@/components/Header';

interface MeResponse {
  user_id: string;
  role: string;
  email: string;
  handle: string;
  display_name: string;
  message_price_coins: number;
  revenue_share_bps: number;
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

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!me) {
    return (
      <div className="min-h-screen bg-mesh">
        <Header />
        <div className="p-8 text-zinc-500">Lade…</div>
      </div>
    );
  }

  const initials = me.display_name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-mesh">
      <Header />

      <main className="mx-auto max-w-6xl p-4 md:p-8">
        {/* Welcome Hero */}
        <section className="mb-10 animate-fade-up">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-white shadow-pink">
              {initials}
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold tracking-tight">
                Hi, {me.display_name}
              </h1>
              <p className="mt-1 text-zinc-500">
                <span className="font-medium text-zinc-700">@{me.handle}</span> · Willkommen in deinem Studio
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-10 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Nachrichten-Preis"
            value={`${me.message_price_coins}`}
            unit="Coins"
            sub="pro Kunden-Nachricht"
            delay={60}
          />
          <StatCard
            label="Dein Anteil"
            value={`${(me.revenue_share_bps / 100).toFixed(1)}%`}
            unit=""
            sub="vom Coin-Umsatz"
            delay={120}
            highlight
          />
          <StatCard
            label="Status"
            value={me.is_verified ? 'Verifiziert' : 'Aktiv'}
            unit={me.is_verified ? '✓' : ''}
            sub={me.email}
            delay={180}
          />
        </section>

        {/* Roadmap */}
        <section className="animate-fade-up rounded-2xl border border-dashed border-zinc-300 bg-white/40 p-8 text-center md:p-12">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-500">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Inbox & Chat kommen als nächstes
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
            Coin-System ist live ✓ — als nächstes bauen wir Echtzeit-Chat, Icebreaker und Media-Upload.
          </p>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  sub,
  delay,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  sub: string;
  delay: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        'animate-fade-up rounded-2xl border p-6',
        highlight
          ? 'border-brand-300 bg-gradient-to-br from-brand-50 to-white shadow-pink'
          : 'border-zinc-200 bg-white',
      ].join(' ')}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-4xl font-bold tracking-tight">{value}</span>
        {unit && <span className="text-base font-medium text-zinc-500">{unit}</span>}
      </div>
      <div className="mt-2 truncate text-sm text-zinc-500">{sub}</div>
    </div>
  );
}
