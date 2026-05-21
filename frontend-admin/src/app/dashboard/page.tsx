'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { adminPlatformStats, getAccessToken, PlatformStats } from '@/lib/api';

function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function formatNumber(n: number): string {
  return n.toLocaleString('de-DE');
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [router]);

  async function load() {
    try {
      const data = await adminPlatformStats();
      setStats(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh bg-zinc-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl lg:text-4xl font-semibold text-zinc-900">Dashboard</h1>
            <p className="text-zinc-500 mt-1 text-sm">Plattform-Übersicht und Live-Stats.</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && !stats && (
            <div className="text-sm text-zinc-500">Lade Stats...</div>
          )}

          {stats && (
            <>
              {/* HERO: Diesen Monat */}
              <section className="mb-10">
                <h2 className="text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-4">Diesen Monat</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Umsatz"
                    value={formatEuro(stats.revenue_month_cents)}
                    hero
                  />
                  <StatCard
                    label="Coin-Käufe"
                    value={formatNumber(stats.purchases_month)}
                  />
                  <StatCard
                    label="Neue Kunden"
                    value={formatNumber(stats.customers_new_month)}
                  />
                  <StatCard
                    label="Aktive Kunden"
                    value={formatNumber(stats.customers_active_month)}
                    hint={stats.customers_total > 0 ? `${Math.round((stats.customers_active_month / stats.customers_total) * 100)}% von gesamt` : undefined}
                  />
                </div>
              </section>

              {/* GESAMT-STATS */}
              <section className="mb-10">
                <h2 className="text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-4">Gesamt (Lifetime)</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Gesamtumsatz"
                    value={formatEuro(stats.revenue_total_cents)}
                  />
                  <StatCard
                    label="Verkaufte Coins"
                    value={formatNumber(stats.coins_sold_total)}
                  />
                  <StatCard
                    label="Kunden gesamt"
                    value={formatNumber(stats.customers_total)}
                  />
                  <StatCard
                    label="Nachrichten gesamt"
                    value={formatNumber(stats.messages_total)}
                  />
                </div>
              </section>

              {/* AKTIVITÄT */}
              <section className="mb-10">
                <h2 className="text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-4">Aktivität</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatCard
                    label="Nachrichten (Monat)"
                    value={formatNumber(stats.messages_month)}
                  />
                  <StatCard
                    label="Coins (Monat)"
                    value={formatNumber(stats.coins_sold_month)}
                  />
                  <StatCard
                    label="Aktive Creator"
                    value={formatNumber(stats.creators_active)}
                  />
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, hint, hero }: { label: string; value: string; hint?: string; hero?: boolean }) {
  return (
    <div className={`bg-white border border-zinc-200 rounded-xl p-5 ${hero ? 'shadow-sm' : ''}`}>
      <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-semibold mb-2">
        {label}
      </div>
      <div className={`font-sans tabular-nums tracking-tight text-zinc-900 font-semibold ${hero ? 'text-3xl lg:text-4xl' : 'text-2xl'}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-zinc-400 mt-1">{hint}</div>}
    </div>
  );
}
