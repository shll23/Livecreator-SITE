'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  adminListAllPayouts,
  adminListCreators,
  adminGetMonthlyEarnings,
  adminCreatePayout,
  adminUploadInvoice,
  getMe,
  APIError,
  type AdminPayout,
  type AdminCreator,
  type MonthlyEarnings,
} from '@/lib/api';
import Sidebar from '@/components/Sidebar';

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
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function PayoutsPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [creators, setCreators] = useState<AdminCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create-Modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Invoice-Upload
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [payoutsRes, creatorsRes, me] = await Promise.all([
        adminListAllPayouts(),
        adminListCreators(),
        getMe().catch(() => null),
      ]);
      setPayouts(payoutsRes.payouts);
      setCreators(creatorsRes.creators);
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

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  }

  // Invoice-Upload-Flow
  async function handleUploadInvoice(payoutId: string, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setError('Datei zu groß (max 10 MB).');
      return;
    }
    setUploadingFor(payoutId);
    setError(null);
    try {
      await adminUploadInvoice(payoutId, file);
      showSuccess('Rechnung hochgeladen.');
      await loadAll();
    } catch {
      setError('Upload fehlgeschlagen.');
    } finally {
      setUploadingFor(null);
    }
  }

  function triggerUpload(payoutId: string) {
    const input = invoiceInputRef.current;
    if (!input) return;
    input.dataset.payoutId = payoutId;
    input.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const payoutId = e.target.dataset.payoutId;
    e.target.value = '';
    if (!file || !payoutId) return;
    handleUploadInvoice(payoutId, file);
  }

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar displayName={displayName} />

      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900 tracking-tight">
              Auszahlungen
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Monatliche Auszahlungen an Creator. Lade Rechnungen hoch.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-lg flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Neue Auszahlung
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-emerald-800">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
            Wird geladen…
          </div>
        ) : payouts.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
            <p className="text-sm text-zinc-500">Noch keine Auszahlungen erstellt.</p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Creator</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Monat</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Coins</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Nachr.</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Betrag</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Datum</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Rechnung</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(payout => (
                  <tr key={payout.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3 font-semibold text-zinc-900">
                      {payout.creator.display_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {MONTH_NAMES[payout.period_month - 1]} {payout.period_year}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                      {payout.coins_earned.toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                      {payout.messages_count.toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-900">
                      {formatEuro(payout.amount_cents)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs tabular-nums">
                      {formatDate(payout.paid_at)}
                    </td>
                    <td className="px-4 py-3">
                      {payout.has_invoice ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 text-xs">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Hochgeladen
                        </div>
                      ) : (
                        <button
                          onClick={() => triggerUpload(payout.id)}
                          disabled={uploadingFor === payout.id}
                          className="px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded border border-zinc-300 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {uploadingFor === payout.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                              Lädt…
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              Hochladen
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Hidden Upload-Input */}
        <input
          ref={invoiceInputRef}
          type="file"
          accept="application/pdf"
          onChange={onFileSelected}
          className="hidden"
        />
      </main>

      {/* Create-Payout-Modal */}
      {showCreateModal && (
        <CreatePayoutModal
          creators={creators}
          onClose={() => setShowCreateModal(false)}
          onCreated={async () => {
            setShowCreateModal(false);
            showSuccess('Auszahlung erstellt.');
            await loadAll();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Create-Payout-Modal — eigener Component
// ============================================================================
function CreatePayoutModal({
  creators, onClose, onCreated,
}: {
  creators: AdminCreator[];
  onClose: () => void;
  onCreated: () => void;
}) {
  // Default: vorheriger Monat
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [creatorId, setCreatorId] = useState('');
  const [year, setYear] = useState(prevYear);
  const [month, setMonth] = useState(prevMonth);

  const [earnings, setEarnings] = useState<MonthlyEarnings | null>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lade Earnings wenn Creator+Monat ausgewählt
  useEffect(() => {
    if (!creatorId) {
      setEarnings(null);
      return;
    }
    setLoadingEarnings(true);
    adminGetMonthlyEarnings(creatorId, year, month)
      .then(setEarnings)
      .catch(() => setEarnings(null))
      .finally(() => setLoadingEarnings(false));
  }, [creatorId, year, month]);

  async function handleCreate() {
    if (!creatorId || !earnings) return;
    if (earnings.existing_payout_id) {
      setError('Für diesen Monat existiert bereits eine Auszahlung.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const creator = creators.find(c => c.id === creatorId);
      await adminCreatePayout({
        creator_id: creatorId,
        year, month,
        coins_earned: earnings.coins_earned,
        messages_count: earnings.messages_count,
        amount_cents: earnings.commission_cents,
        tier_percent: 0, // TODO: aus Stats holen falls nötig
        notes: `Auszahlung für ${creator?.display_name || ''}`,
      });
      onCreated();
    } catch (err) {
      if (err instanceof APIError && err.code === 'payout_already_exists') {
        setError('Für diesen Monat existiert bereits eine Auszahlung.');
      } else {
        setError('Auszahlung konnte nicht erstellt werden.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Jahre für Dropdown
  const years: number[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) years.push(y);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-semibold text-zinc-900 mb-1">
          Neue Auszahlung
        </h2>
        <p className="text-sm text-zinc-500 mb-5">
          Wähle Creator und Monat. Beträge werden automatisch berechnet.
        </p>

        {/* Creator-Auswahl */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Creator</label>
            <select
              value={creatorId}
              onChange={(e) => setCreatorId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none"
            >
              <option value="">— wähle Creator —</option>
              {creators.map(c => (
                <option key={c.id} value={c.id}>{c.display_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Monat</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none"
              >
                {MONTH_NAMES.map((n, i) => (
                  <option key={i+1} value={i+1}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Jahr</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none tabular-nums"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Berechnete Werte */}
          {loadingEarnings && (
            <div className="text-sm text-zinc-500">Wird geladen…</div>
          )}
          {earnings && !loadingEarnings && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
              {earnings.existing_payout_id ? (
                <div className="text-sm text-amber-700">
                  ⚠ Für diesen Monat existiert bereits eine Auszahlung.
                </div>
              ) : earnings.coins_earned === 0 ? (
                <div className="text-sm text-zinc-500">
                  Keine Aktivität in diesem Monat.
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Coins verdient</span>
                    <span className="font-semibold tabular-nums">{earnings.coins_earned.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Nachrichten</span>
                    <span className="font-semibold tabular-nums">{earnings.messages_count.toLocaleString('de-DE')}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 flex justify-between">
                    <span className="text-zinc-700 font-medium">Auszuzahlen</span>
                    <span className="font-sans text-lg font-semibold text-zinc-900 tabular-nums">
                      {formatEuro(earnings.commission_cents)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-700">{error}</div>
          )}

          {/* Aktionen */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-lg text-sm font-medium"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={!creatorId || !earnings || earnings.coins_earned === 0 || !!earnings.existing_payout_id || submitting}
              className="flex-1 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? 'Wird erstellt…' : 'Erstellen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
