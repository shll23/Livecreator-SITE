'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getWallet,
  getPackages,
  getPurchases,
  startPurchase,
  formatCents,
  getAccessToken,
  APIError,
  type CoinPackage,
} from '@/lib/api';
import AppHeader from '@/components/AppHeader';

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    refresh();
    // Refresh wenn der User vom Mock-Confirm-Tab zurückkommt
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [router]);

  async function refresh() {
    try {
      const [walletRes, pkgRes, purchasesRes] = await Promise.all([
        getWallet(),
        getPackages(),
        getPurchases().catch(() => ({ purchases: [] })),
      ]);
      setBalance(walletRes.balance_coins);
      setPackages(pkgRes.packages);
      setPurchases(purchasesRes.purchases);
    } catch (err) {
      if (err instanceof APIError && err.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(pkgId: string) {
    setBuying(pkgId);
    setError(null);
    try {
      const res = await startPurchase(pkgId);
      // Mock-Confirm-Tab öffnen
      window.open(res.redirect_url, '_blank');
      // Liste aktualisieren (pending Eintrag)
      refresh();
    } catch (err) {
      if (err instanceof APIError) {
        setError(`Fehler: ${err.code}`);
      } else {
        setError('Verbindung fehlgeschlagen');
      }
    } finally {
      setBuying(null);
    }
  }

  // "Beliebt"-Paket: Mittel-Tier (500 Coins / Standard)
  function isPopular(pkg: CoinPackage) {
    return pkg.coins === 500;
  }

  // Bonus-Berechnung relativ zum Starter-Pack (100 Coins / 9.99€)
  function getBonus(pkg: CoinPackage): number | null {
    if (pkg.coins === 100) return null;
    const basePricePerCoin = 9.99 / 100; // Starter-Referenz
    const fairValue = pkg.coins * basePricePerCoin * 100;
    const bonus = Math.round(((fairValue - pkg.price_cents) / pkg.price_cents) * 100);
    return bonus > 0 ? bonus : null;
  }

  return (
    <div className="min-h-screen bg-soft-gradient">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* GUTHABEN-KARTE — kompakt */}
        <section className="bg-gradient-to-br from-brand-500 to-brand-700 text-white rounded-2xl p-5 sm:p-6 shadow-pink-lg mb-6 sm:mb-8">
          <div className="text-[10px] sm:text-xs uppercase tracking-[0.2em] opacity-80 mb-1.5">
            Dein Guthaben
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-4xl sm:text-5xl font-semibold leading-none">
              {loading ? '…' : balance}
            </span>
            <span className="text-base sm:text-lg opacity-90">Coins</span>
          </div>
          <div className="text-xs sm:text-sm opacity-85 mt-2">
            Nutze Coins, um Nachrichten zu senden, Küsse zu verschicken und private Bilder freizuschalten.
          </div>
        </section>

        {/* COIN-PAKETE */}
        <section className="mb-8 sm:mb-12">
          <h2 className="font-display text-xl sm:text-2xl font-semibold mb-4 sm:mb-5">
            Coins kaufen
          </h2>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-[4/5] bg-zinc-200/60 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {packages.map((pkg) => {
                const popular = isPopular(pkg);
                const bonus = getBonus(pkg);
                return (
                  <div
                    key={pkg.id}
                    className={`
                      relative bg-white rounded-xl p-3.5 sm:p-4 border transition-all
                      ${popular ? 'border-brand-300 shadow-pink-lg' : 'border-zinc-200 hover:border-zinc-300'}
                    `}
                  >
                    {popular && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap">
                        ★ Beliebt
                      </div>
                    )}
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
                      {pkg.name}
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="font-display text-2xl sm:text-3xl font-semibold text-zinc-900 leading-none">
                        {pkg.coins}
                      </span>
                      <span className="text-xs text-zinc-500">Coins</span>
                    </div>
                    {bonus && (
                      <div className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded inline-block mb-2">
                        +{bonus}% Bonus
                      </div>
                    )}
                    <div className="text-sm sm:text-base font-semibold text-zinc-900 mb-3 mt-1">
                      {formatCents(pkg.price_cents, pkg.currency)}
                    </div>
                    <button
                      onClick={() => handleBuy(pkg.id)}
                      disabled={buying === pkg.id}
                      className={`
                        w-full text-xs sm:text-sm font-semibold py-2 rounded-full transition-all
                        ${popular
                          ? 'bg-brand-600 text-white hover:bg-brand-700'
                          : 'bg-zinc-900 text-white hover:bg-zinc-800'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {buying === pkg.id ? '…' : 'Kaufen'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* KÄUFE-HISTORIE */}
        {purchases.length > 0 && (
          <section>
            <h2 className="font-display text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              Käufe
            </h2>
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="hidden sm:grid grid-cols-4 gap-4 px-4 py-2.5 border-b border-zinc-100 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                <div>Paket</div>
                <div>Coins</div>
                <div>Preis</div>
                <div className="text-right">Status</div>
              </div>
              {purchases.map((p, i) => (
                <div
                  key={p.id || i}
                  className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-4 px-4 py-3 border-b border-zinc-50 last:border-b-0 text-sm items-center"
                >
                  <div className="font-medium text-zinc-900">{p.package_name || p.name || '—'}</div>
                  <div className="text-zinc-700">{p.coins}</div>
                  <div className="text-zinc-700 hidden sm:block">{formatCents(p.price_cents, p.currency)}</div>
                  <div className="text-right">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      p.status === 'completed' ? 'bg-green-50 text-green-700' :
                      p.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {p.status === 'completed' ? 'Erhalten' :
                       p.status === 'pending' ? 'Ausstehend' : p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
