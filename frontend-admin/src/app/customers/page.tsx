'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { adminListCustomers, getAccessToken, AdminCustomer } from '@/lib/api';

type SortKey = 'created_at' | 'coins_bought' | 'total_spent_cents' | 'messages_sent';

function formatEuro(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    load();
  }, [router]);

  async function load() {
    try {
      const data = await adminListCustomers();
      setCustomers(data.customers);
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let list = customers;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        c.email.toLowerCase().includes(s) ||
        c.display_name.toLowerCase().includes(s)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortKey === 'created_at') return b.created_at.localeCompare(a.created_at);
      return (b[sortKey] as number) - (a[sortKey] as number);
    });
    return list;
  }, [customers, search, sortKey]);

  const totalSpent = customers.reduce((s, c) => s + c.total_spent_cents, 0);
  const totalCoins = customers.reduce((s, c) => s + c.coins_bought, 0);
  const totalMessages = customers.reduce((s, c) => s + c.messages_sent, 0);

  return (
    <div className="flex min-h-dvh bg-zinc-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
          <div className="mb-8">
            <h1 className="font-display text-3xl lg:text-4xl font-semibold text-zinc-900">Kunden</h1>
            <p className="text-zinc-500 mt-1 text-sm">Übersicht aller registrierten Kunden mit Lifetime-Stats.</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Aggregate */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AggregateCard label="Kunden" value={customers.length.toString()} />
            <AggregateCard label="Umsatz gesamt" value={formatEuro(totalSpent)} />
            <AggregateCard label="Coins verkauft" value={totalCoins.toLocaleString('de-DE')} />
            <AggregateCard label="Nachrichten" value={totalMessages.toLocaleString('de-DE')} />
          </div>

          {/* Suche + Sortierung */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nach Email oder Name suchen..."
              className="flex-1 px-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="px-4 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <option value="created_at">Neueste zuerst</option>
              <option value="total_spent_cents">Höchster Umsatz</option>
              <option value="coins_bought">Meiste Coins</option>
              <option value="messages_sent">Meiste Nachrichten</option>
            </select>
          </div>

          {/* Tabelle */}
          {loading ? (
            <div className="text-sm text-zinc-500">Lade Kunden...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-zinc-500">
              {search ? 'Keine Kunden gefunden.' : 'Noch keine Kunden registriert.'}
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Kunde</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Registriert</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Coins</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Umsatz</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Käufe</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-600 uppercase text-[10px] tracking-[0.12em]">Nachrichten</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filtered.map(c => (
                      <tr key={c.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-900">{c.display_name || '(kein Name)'}</div>
                          <div className="text-zinc-500 text-xs">{c.email}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-700">{formatDate(c.created_at)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-900">{c.coins_bought.toLocaleString('de-DE')}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-zinc-900">{formatEuro(c.total_spent_cents)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{c.purchase_count}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{c.messages_sent}</td>
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
