'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getWallet,
  getPackages,
  startPurchase,
  getAccessToken,
  formatCents,
  type CoinPackage,
} from '@/lib/api';
import AppHeader from '@/components/AppHeader';

// ============================================================================
// WALLET-PAGE — Schwarz/Weiß seriös, Standard-Sans-Zahlen, ohne Tier-Labels
// ============================================================================

const POPULAR_SORT_ORDER = 2; // 2. Paket = "Beliebt"

export default function WalletPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    Promise.all([getWallet(), getPackages()])
      .then(([w, p]) => {
        setBalance(w.balance_coins);
        setPackages(p.packages);
      })
      .catch((err) => {
        console.error('Wallet load error:', err);
        setError('Fehler beim Laden des Wallets.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handlePurchase(pkg: CoinPackage) {
    setPurchasing(pkg.id);
    setError(null);
    try {
      const res = await startPurchase(pkg.id);
      if (res.redirect_url) {
        window.open(res.redirect_url, '_blank');
      }
    } catch (err: any) {
      setError(err?.code || 'Kauf konnte nicht gestartet werden.');
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-zinc-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 sm:pt-8 pb-8">
          {/* ===== HEADLINE ===== */}
          <div className="mb-5 sm:mb-7">
            <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-zinc-900 mb-1">
              Dein Guthaben
            </h1>
            <p className="text-sm text-zinc-500">Coins sind die Währung für Nachrichten.</p>
          </div>

          {/* ===== GUTHABEN-KARTE ===== */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-5 sm:p-7 mb-6 sm:mb-8 shadow-lg">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-1">
                  Aktuelles Guthaben
                </div>
                <div className="flex items-baseline gap-2">
                  {/* WICHTIG: font-sans (Inter) statt font-display (Fraunces) für Zahlen */}
                  <span className="font-sans text-4xl sm:text-5xl font-bold text-white tabular-nums">
                    {loading ? '…' : balance ?? 0}
                  </span>
                  <span className="text-base text-zinc-400 font-medium">Coins</span>
                </div>
              </div>

              <div className="shrink-0">
                <svg width="64" height="64" viewBox="0 0 24 24" className="drop-shadow-lg">
                  <defs>
                    <linearGradient id="bigCoinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFE082" />
                      <stop offset="50%" stopColor="#FFC107" />
                      <stop offset="100%" stopColor="#F9A825" />
                    </linearGradient>
                    <linearGradient id="bigCoinInner" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#FFD54F" />
                      <stop offset="100%" stopColor="#FFA000" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="11" fill="url(#bigCoinGradient)" />
                  <circle cx="12" cy="12" r="8.5" fill="url(#bigCoinInner)" />
                  <ellipse cx="9" cy="8" rx="3" ry="2" fill="#FFF8E1" opacity="0.5" />
                  <text x="12" y="16" fontSize="11" fontWeight="900" textAnchor="middle" fill="#8B4513" style={{ letterSpacing: '-0.5px' }}>€</text>
                </svg>
              </div>
            </div>
          </div>

          {/* ===== ERROR ===== */}
          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
              {error}
            </div>
          )}

          {/* ===== HEADLINE PAKETE ===== */}
          <div className="mb-4">
            <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 mb-1">
              Coins kaufen
            </h2>
            <p className="text-sm text-zinc-500">Einmalig zahlen. Kein Abo. Jederzeit verwendbar.</p>
          </div>

          {/* ===== PAKETE-GRID ===== */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 bg-zinc-200/60 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
              {packages.map((pkg, idx) => {
                const isPopular = (idx + 1) === POPULAR_SORT_ORDER;

                return (
                  <div
                    key={pkg.id}
                    className={`relative bg-white rounded-2xl border transition-all ${
                      isPopular
                        ? 'border-zinc-900 shadow-lg ring-1 ring-zinc-900/5'
                        : 'border-zinc-200 hover:border-zinc-300 hover:shadow-md'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <span className="bg-brand-600 text-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full shadow-pink">
                          ★ Beliebt
                        </span>
                      </div>
                    )}

                    <div className="p-5 sm:p-6">
                      {/* Münze rechts oben, KEIN Tier-Label mehr */}
                      <div className="flex justify-end mb-2">
                        <svg width="22" height="22" viewBox="0 0 24 24">
                          <defs>
                            <linearGradient id={`coin-${pkg.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#FFE082" />
                              <stop offset="50%" stopColor="#FFC107" />
                              <stop offset="100%" stopColor="#F9A825" />
                            </linearGradient>
                          </defs>
                          <circle cx="12" cy="12" r="11" fill={`url(#coin-${pkg.id})`} />
                          <text x="12" y="16" fontSize="11" fontWeight="900" textAnchor="middle" fill="#8B4513">€</text>
                        </svg>
                      </div>

                      {/* Coins-Zahl in Sans-Font (NICHT mehr font-display) */}
                      <div className="flex items-baseline gap-1.5 mb-3">
                        <span className="font-sans text-4xl sm:text-5xl font-bold text-zinc-900 tabular-nums tracking-tight">
                          {pkg.coins}
                        </span>
                        <span className="text-sm text-zinc-500 font-medium">Coins</span>
                      </div>

                      {/* Preis groß, KEIN ct/Coin Hinweis */}
                      <div className="mb-4">
                        <span className="font-sans text-xl font-semibold text-zinc-900">
                          {formatCents(pkg.price_cents, pkg.currency)}
                        </span>
                      </div>

                      <button
                        onClick={() => handlePurchase(pkg)}
                        disabled={purchasing === pkg.id}
                        className={`w-full py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                          isPopular
                            ? 'bg-zinc-900 hover:bg-zinc-800 text-white'
                            : 'bg-white border border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white'
                        }`}
                      >
                        {purchasing === pkg.id ? (
                          <span className="inline-flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Wird geöffnet…
                          </span>
                        ) : (
                          'Jetzt kaufen'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== TRUST-SEKTION ===== */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 mb-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-4">
              Deine Sicherheit
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-sm text-zinc-900 mb-0.5">100% Anonym</div>
                  <div className="text-xs text-zinc-600 leading-relaxed">
                    Auf deiner Abrechnung erscheint <span className="font-medium">niemals</span> verliebdich.com.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-sm text-zinc-900 mb-0.5">Einmalig · Kein Abo</div>
                  <div className="text-xs text-zinc-600 leading-relaxed">
                    Du zahlst nur was du kaufst. Keine versteckten Kosten.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-sm text-zinc-900 mb-0.5">PCI DSS zertifiziert</div>
                  <div className="text-xs text-zinc-600 leading-relaxed">
                    256-Bit SSL-Verschlüsselung. Höchster Bank-Standard.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-sm text-zinc-900 mb-0.5">VISA · Mastercard · PayPal</div>
                  <div className="text-xs text-zinc-600 leading-relaxed">
                    Alle gängigen Zahlungsmittel akzeptiert.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 text-center leading-relaxed px-4">
            Mit deinem Kauf akzeptierst du unsere <Link href="/agb" className="underline hover:text-zinc-600">AGB</Link>.
            Coins sind nicht erstattbar und nicht in echtes Geld umtauschbar.
            Du musst mindestens 18 Jahre alt sein.
          </p>
        </div>
      </main>
    </>
  );
}
