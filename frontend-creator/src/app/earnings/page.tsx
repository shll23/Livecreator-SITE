'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  listMyPayouts,
  getCreatorStats,
  getMe,
  APIError,
  type Payout,
  type CreatorStats,
} from '@/lib/api';
import Sidebar from '@/components/Sidebar';

// ============================================================================
// Helpers
// ============================================================================
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function nextPayoutDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ============================================================================
// EARNINGS PAGE
// ============================================================================
export default function EarningsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [statsRes, payoutsRes, me] = await Promise.all([
        getCreatorStats(),
        listMyPayouts(),
        getMe().catch(() => null),
      ]);
      setStats(statsRes);
      setPayouts(payoutsRes.payouts);
      if (me?.display_name) setDisplayName(me.display_name);
    } catch (err) {
      if (err instanceof APIError && err.code === 'unauthenticated') {
        router.push('/login');
        return;
      }
      setError('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    loadAll();
  }, [router, loadAll]);

  // Aktueller Monat aus stats (laufend, noch keine Auszahlung)
  const now = new Date();
  const currentMonthName = MONTH_NAMES[now.getMonth()];
  const currentYear = now.getFullYear();

  // Rechnung herunterladen (POST mit auth, dann blob download)
  async function downloadInvoice(payoutId: string) {
    const token = getAccessToken();
    if (!token) return;
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    try {
      const res = await fetch(`${base}/api/creator/payouts/${payoutId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError('Rechnung konnte nicht geladen werden.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rechnung-${payoutId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download fehlgeschlagen.');
    }
  }

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar displayName={displayName} />

      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900 tracking-tight">
            Verdienst
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Übersicht deiner Einnahmen und Auszahlungen.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
            Wird geladen…
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!loading && stats && (
          <>
            {/* === Aktueller Monat (laufend) === */}
            <section className="bg-zinc-900 text-white rounded-2xl p-6 sm:p-8 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-2">
                    Aktueller Monat · {currentMonthName} {currentYear}
                  </div>
                  <div className="font-sans text-5xl sm:text-6xl font-semibold tabular-nums tracking-tight">
                    {formatEuro(stats.month.cents)}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm text-zinc-300">
                    <span className="tabular-nums">
                      {stats.month.coins.toLocaleString('de-DE')} Coins
                    </span>
                    <span className="text-zinc-500">·</span>
                    <span className="tabular-nums">
                      {stats.month.messages.toLocaleString('de-DE')} Nachrichten
                    </span>
                    <span className="text-zinc-500">·</span>
                    <span className="tabular-nums">
                      {stats.tier_percent.toString().replace('.', ',')}% Provision
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-1">
                    Auszahlung am
                  </div>
                  <div className="text-base font-semibold">{nextPayoutDate()}</div>
                </div>
              </div>
            </section>

            {/* === Auszahlungs-Historie === */}
            <section className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200">
                <h2 className="font-semibold text-zinc-900">Auszahlungs-Historie</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Vergangene Auszahlungen mit Rechnungen.
                </p>
              </div>

              {payouts.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-zinc-300 mb-3">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <p className="text-sm text-zinc-500">
                    Noch keine Auszahlungen.
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Deine erste Auszahlung erfolgt am 01. des nächsten Monats.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {payouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="px-5 py-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors"
                    >
                      {/* Linkes Icon */}
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </div>

                      {/* Zeitraum + Details */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-zinc-900 text-sm">
                          {MONTH_NAMES[payout.period_month - 1]} {payout.period_year}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="tabular-nums">
                            {payout.coins_earned.toLocaleString('de-DE')} Coins
                          </span>
                          <span>·</span>
                          <span className="tabular-nums">
                            {payout.messages_count.toLocaleString('de-DE')} Nachrichten
                          </span>
                          {payout.tier_percent !== null && (
                            <>
                              <span>·</span>
                              <span className="tabular-nums">
                                {payout.tier_percent.toString().replace('.', ',')}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Betrag + Datum */}
                      <div className="text-right shrink-0">
                        <div className="font-sans text-lg font-semibold text-zinc-900 tabular-nums">
                          {formatEuro(payout.amount_cents)}
                        </div>
                        <div className="text-[11px] text-zinc-500 tabular-nums">
                          Ausgezahlt am {formatDate(payout.paid_at)}
                        </div>
                      </div>

                      {/* Status + Rechnung */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {payout.status === 'paid' ? (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            Ausgezahlt
                          </span>
                        ) : payout.status === 'pending' ? (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                            Ausstehend
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-600 bg-zinc-100 px-2 py-1 rounded">
                            Storniert
                          </span>
                        )}

                        {payout.has_invoice ? (
                          <button
                            onClick={() => downloadInvoice(payout.id)}
                            className="text-xs text-zinc-700 hover:text-zinc-900 font-medium flex items-center gap-1 underline underline-offset-2"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Rechnung
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-400">
                            Rechnung folgt
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* === Info-Box === */}
            <div className="mt-6 bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-600 leading-relaxed">
              <strong className="text-zinc-900">Wie funktionieren Auszahlungen?</strong>
              <br />
              Auszahlungen erfolgen monatlich am 01. für den Vormonat. Du bekommst hier automatisch eine Übersicht und die zugehörige Rechnung als PDF. Bei Fragen wende dich an die Plattform-Verwaltung.
            </div>
          </>
        )}
      </main>
    </div>
  );
}
