'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { adminListPurchases, getAccessToken, AdminPurchase } from '@/lib/api';

function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  };
  const labels: Record<string, string> = {
    completed: 'Erfolgreich',
    pending: 'Ausstehend',
    failed: 'Fehlgeschlagen',
    cancelled: 'Abgebrochen',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-medium uppercase tracking-wider ${styles[status] || styles.cancelled}`}>
      {labels[status] || status}
    </span>
  );
}

export default function PurchasesPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<AdminPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    load();
  }, [router]);

  async function load() {
    try {
      const data = await adminListPurchases();
      setPurchases(data.purchases);
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return purchases;
    return purchases.filter(p => p.status === statusFilter);
  }, [purchases, statusFilter]);

  const totalRevenue = purchases.filter(p => p.status === 'completed').reduce((s, p) => s + p.price_cents, 0);
  const completedCount = purchases.filter(p => p.status === 'completed').length;
  const pendingCount = purchases.filter(p => p.status === 'pending').length;
  const failedCount = purchases.filter(p => p.status === 'failed').length;

  return (
    <div className="flex min-h-dvh bg-zinc-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
          <div className="mb-8">
            <h1 className="font-display text-3xl lg:text-4xl font-semibold text-zinc-900">Coin-Käufe</h1>
            <p className="text-zinc-500 mt-1 text-sm">Log aller Coin-Käufe mit Status und Zahlungsdetails.</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Aggregate */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AggregateCard label="Umsatz" value={formatEuro(totalRevenue)} />
            <AggregateCard label="Erfolgreich" value={completedCount.toString()} />
            <AggregateCard label="Ausstehend" value={pendingCount.toString()} />
            <AggregateCard label="Fehlgeschlagen" value={failedCount.toString()} />
          </div>

          {/* Filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Alle</FilterButton>
            <FilterButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>Erfolgreich</FilterButton>
            <FilterButton active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')}>Ausstehend</FilterButton>
            <FilterButton active={statusFilter === 'failed'} onClick={() => setStatusFilter('failed')}>Fehlgeschlagen</FilterButton>
          </div>

          {/* Tabelle */}
          {loading ? (
            <div className="text-sm text-zinc-500">Lade Käufe...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-zinc-500">
              Keine Käufe in dieser Kategorie.
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Zeit</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Kunde</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Coins</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Betrag</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Provider</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filtered.map(p => (
                      <tr key={p.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 text-zinc-700 tabular-nums whitespace-nowrap">{formatDateTime(p.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="text-zinc-900 text-xs">{p.email}</div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-900">{p.coins.toLocaleString('de-DE')}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-zinc-900">{formatEuro(p.price_cents)}</td>
                        <td className="px-4 py-3 text-zinc-700 text-xs">{p.provider}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AggregateCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold mb-1">{label}</div>
      <div className="font-sans text-xl tabular-nums text-zinc-900 font-semibold">{value}</div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
      }`}
    >
      {children}
    </button>
  );
}
