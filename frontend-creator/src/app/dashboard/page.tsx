'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  getCreatorStats,
  getMe,
  type CreatorStats,
  APIError,
} from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import PushPermissionButton from '@/components/PushPermissionButton';

// Formatiert Cent in "12,34 €"
function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

// Datum für Auszahlungs-Info — nächster 1. des Monats
function nextPayoutDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

interface StatCardProps {
  label: string;
  cents: number;
  coins: number;
  messages: number;
}

function StatCard({ label, cents, coins, messages }: StatCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2">
        {label}
      </div>
      <div className="font-sans text-3xl font-semibold text-zinc-900 tabular-nums tracking-tight">
        {formatEuro(cents)}
      </div>
      <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-zinc-500">Coins</div>
          <div className="font-semibold text-zinc-900 tabular-nums">{coins.toLocaleString('de-DE')}</div>
        </div>
        <div>
          <div className="text-zinc-500">Nachrichten</div>
          <div className="font-semibold text-zinc-900 tabular-nums">{messages.toLocaleString('de-DE')}</div>
        </div>
      </div>
    </div>
  );
}

// Provisions-Tabelle (5 Stufen, alle gleich aussehend, neutral)
const PROVISION_STUFEN = [
  { range: '0 – 10.000', percent: '22,5%' },
  { range: '10.001 – 25.000', percent: '25,0%' },
  { range: '25.001 – 50.000', percent: '27,5%' },
  { range: '50.001 – 100.000', percent: '30,0%' },
  { range: '100.001+', percent: '32,5%' },
];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }

    Promise.all([
      getCreatorStats(),
      getMe().catch(() => null),
    ])
      .then(([statsRes, meRes]) => {
        setStats(statsRes);
        if (meRes?.display_name) setDisplayName(meRes.display_name);
      })
      .catch((err) => {
        if (err instanceof APIError) {
          if (err.code === 'unauthenticated') {
            router.push('/login');
            return;
          }
          if (err.code === 'not_a_creator') {
            setError('Dieser Account ist kein Creator-Account.');
            return;
          }
        }
        setError('Daten konnten nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  // Progress-Bar-Berechnung
  const progressPercent = stats && stats.next_tier !== undefined
    ? Math.min(100, (stats.month.coins / (stats.month.coins + stats.coins_to_next)) * 100)
    : 100;

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar displayName={displayName} />

      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900 tracking-tight">
              Übersicht
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Deine wichtigsten Kennzahlen auf einen Blick.
            </p>
          </div>
          <PushPermissionButton />
        </div>

        {/* Coins-heute Hero-Counter */}
        {!loading && stats && (
          <div className="mb-6 bg-zinc-900 text-white rounded-2xl p-6 sm:p-8 animate-fade-up">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-2">
              Coins heute
            </div>
            <div className="font-sans text-6xl sm:text-7xl font-semibold tabular-nums tracking-tight">
              {stats.today.coins.toLocaleString('de-DE')}
            </div>
            <div className="text-sm text-zinc-400 mt-2 tabular-nums">
              {stats.today.messages.toLocaleString('de-DE')} {stats.today.messages === 1 ? 'Nachricht' : 'Nachrichten'} beantwortet
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
            Daten werden geladen…
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Aktuelle Provisionsstufe (sachlich, ohne Namen) */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 mb-6 animate-fade-up">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2">
                    Aktuelle Provisionsstufe
                  </div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-sans text-4xl font-semibold text-zinc-900 tabular-nums tracking-tight">
                      {stats.tier_percent.toString().replace('.', ',')}%
                    </span>
                    <span className="text-sm text-zinc-500">
                      Provision pro Coin diesen Monat
                    </span>
                  </div>

                  {stats.coins_to_next > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-zinc-600 mb-1.5">
                        <span>
                          Noch <span className="font-semibold text-zinc-900 tabular-nums">{stats.coins_to_next.toLocaleString('de-DE')}</span> Coins bis zur nächsten Stufe
                        </span>
                        <span className="text-zinc-400 tabular-nums">
                          {stats.month.coins.toLocaleString('de-DE')} / {(stats.month.coins + stats.coins_to_next).toLocaleString('de-DE')}
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-900 transition-all duration-700"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stat-Karten Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
              <StatCard label="Heute"        cents={stats.today.cents} coins={stats.today.coins} messages={stats.today.messages} />
              <StatCard label="Diese Woche"  cents={stats.week.cents}  coins={stats.week.coins}  messages={stats.week.messages} />
              <StatCard label="Diesen Monat" cents={stats.month.cents} coins={stats.month.coins} messages={stats.month.messages} />
              <StatCard label="Gesamt"       cents={stats.total.cents} coins={stats.total.coins} messages={stats.total.messages} />
            </div>

            {/* Auszahlungs-Hinweis */}
            <div className="mt-6 bg-zinc-900 text-white rounded-xl p-5 flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-zinc-300">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">Auszahlung am {nextPayoutDate()}</div>
                <div className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
                  Auszahlungen erfolgen monatlich am 01. Am gleichen Tag startet auch deine Provisionsstufe wieder neu.
                </div>
              </div>
            </div>

            {/* Provisions-Tabelle */}
            <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-5">
              <h2 className="font-semibold text-zinc-900 text-sm mb-1">Provisionsstufen</h2>
              <p className="text-xs text-zinc-500 mb-4">
                Deine Provision richtet sich nach den Coins, die du im aktuellen Monat verdient hast.
              </p>
              <div className="border border-zinc-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">
                        Coins im Monat
                      </th>
                      <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">
                        Provision
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROVISION_STUFEN.map((stufe, i) => {
                      const isCurrent = Math.abs(stats.tier_percent - parseFloat(stufe.percent.replace(',', '.').replace('%', ''))) < 0.01;
                      return (
                        <tr
                          key={i}
                          className={`border-t border-zinc-200 ${isCurrent ? 'bg-zinc-50' : ''}`}
                        >
                          <td className="px-4 py-2.5 text-zinc-700 tabular-nums">
                            {stufe.range}
                          </td>
                          <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${
                            isCurrent ? 'text-zinc-900' : 'text-zinc-700'
                          }`}>
                            {stufe.percent}
                            {isCurrent && (
                              <span className="ml-2 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                                Aktuell
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
