'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  getWallet,
  getPackages,
  getPurchases,
  startPurchase,
  formatCents,
  CoinPackage,
  APIError,
} from '@/lib/api';
import { Header } from '@/components/Header';

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    try {
      const [w, p, pur] = await Promise.all([
        getWallet(),
        getPackages(),
        getPurchases(),
      ]);
      setBalance(w.balance_coins);
      setPackages(p.packages);
      setPurchases(pur.purchases);
    } catch (err) {
      if (err instanceof APIError && err.status === 401) router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(pkg: CoinPackage) {
    setPurchasingId(pkg.id);
    try {
      const resp = await startPurchase(pkg.id);
      // Mock-Provider: öffne in neuem Tab, danach refresh
      window.open(resp.redirect_url, '_blank', 'noopener,noreferrer');
      // Nach kurzer Pause neu laden — der Mock-Endpoint completet sofort
      setTimeout(() => {
        loadData();
        setPurchasingId(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      alert('Kauf konnte nicht gestartet werden.');
      setPurchasingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-mesh">
      <Header />

      <main className="mx-auto max-w-5xl p-4 md:p-8">
        {/* Balance Hero */}
        <section className="mb-10 animate-fade-up">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-8 py-12 text-white shadow-pink-lg md:px-12">
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-brand-300/30 blur-3xl"></div>

            <div className="relative">
              <div className="text-sm font-medium uppercase tracking-wider text-white/70">
                Aktuelles Guthaben
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-display text-7xl font-bold tracking-tight md:text-8xl">
                  {balance ?? '…'}
                </span>
                <span className="text-xl font-semibold text-white/80">Coins</span>
              </div>
              <p className="mt-3 text-sm text-white/80">
                Kaufe Coins, um Creators zu schreiben und exklusive Inhalte freizuschalten.
              </p>
            </div>
          </div>
        </section>

        {/* Coin Packages */}
        <section className="mb-12">
          <h2 className="mb-6 font-display text-2xl font-bold tracking-tight">Coins kaufen</h2>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-white border border-zinc-200 shimmer"></div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {packages.map((pkg, i) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  highlight={i === 1}
                  loading={purchasingId === pkg.id}
                  onBuy={() => handleBuy(pkg)}
                  delay={i * 60}
                />
              ))}
            </div>
          )}
        </section>

        {/* History */}
        {!loading && purchases.length > 0 && (
          <section className="animate-fade-up">
            <h2 className="mb-4 font-display text-xl font-bold tracking-tight">Käufe</h2>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Paket</th>
                    <th className="px-4 py-3 text-right font-medium">Coins</th>
                    <th className="px-4 py-3 text-right font-medium">Preis</th>
                    <th className="px-4 py-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium">{p.package_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.coins}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                        {formatCents(p.price_cents, p.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function PackageCard({
  pkg,
  highlight,
  loading,
  onBuy,
  delay,
}: {
  pkg: CoinPackage;
  highlight: boolean;
  loading: boolean;
  onBuy: () => void;
  delay: number;
}) {
  const valuePerCoin = pkg.price_cents / pkg.coins; // cents per coin
  const baseValue = 999 / 100; // Starter: 9,99€ für 100 = 0.0999 €/coin
  const bonus = Math.round((1 - valuePerCoin / 9.99) * 100); // bonus % vs starter

  return (
    <div
      className={[
        'animate-fade-up relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:-translate-y-1',
        highlight
          ? 'border-brand-300 shadow-pink ring-1 ring-brand-200'
          : 'border-zinc-200 hover:shadow-lg hover:border-zinc-300',
      ].join(' ')}
      style={{ animationDelay: `${delay}ms` }}
    >
      {highlight && (
        <div className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
          ★ Beliebt
        </div>
      )}

      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {pkg.name}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-bold tracking-tight">{pkg.coins}</span>
        <span className="text-sm font-medium text-zinc-500">Coins</span>
      </div>

      {bonus > 0 && (
        <div className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          +{bonus}% Bonus
        </div>
      )}

      <div className="my-5 flex-1"></div>

      <div className="mb-3 font-display text-2xl font-bold tracking-tight">
        {formatCents(pkg.price_cents, pkg.currency)}
      </div>

      <button
        onClick={onBuy}
        disabled={loading}
        className={[
          'w-full rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50',
          highlight
            ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-pink hover:from-brand-600 hover:to-brand-700'
            : 'bg-zinc-900 text-white hover:bg-zinc-700',
        ].join(' ')}
      >
        {loading ? 'Lädt…' : 'Jetzt kaufen'}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: { label: 'Erhalten', cls: 'bg-emerald-50 text-emerald-700' },
    pending:   { label: 'Ausstehend', cls: 'bg-amber-50 text-amber-700' },
    failed:    { label: 'Fehlgeschlagen', cls: 'bg-red-50 text-red-700' },
    refunded:  { label: 'Erstattet', cls: 'bg-zinc-100 text-zinc-700' },
    chargeback: { label: 'Chargeback', cls: 'bg-red-50 text-red-700' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-zinc-100 text-zinc-700' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}
