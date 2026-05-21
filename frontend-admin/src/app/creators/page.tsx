'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  adminListCreators,
  adminCreatorsActivitySummary,
  getMe,
  APIError,
  type AdminCreator,
  type CreatorActivitySummary,
} from '@/lib/api';
import Sidebar from '@/components/Sidebar';

function coinsToEuro(coins: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format((coins * 10) / 100);
}

function initials(name: string): string {
  return name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  if (min < 60) return `${min} Min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const min = seconds / 60;
  if (min < 60) return `${Math.round(min)} Min`;
  return `${(min / 60).toFixed(1)}h`;
}

export default function CreatorsPage() {
  const router = useRouter();
  const [creators, setCreators] = useState<AdminCreator[]>([]);
  const [activityMap, setActivityMap] = useState<Record<string, CreatorActivitySummary>>({});
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [res, me, activity] = await Promise.all([
        adminListCreators(),
        getMe().catch(() => null),
        adminCreatorsActivitySummary().catch(() => ({ creators: [] })),
      ]);
      setCreators(res.creators);
      if (me?.display_name) setDisplayName(me.display_name);
      const map: Record<string, CreatorActivitySummary> = {};
      for (const a of activity.creators) map[a.user_id] = a;
      setActivityMap(map);
    } catch (err) {
      if (err instanceof APIError && err.code === 'unauthenticated') {
        router.push('/login');
        return;
      }
      setError('Creator konnten nicht geladen werden.');
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

  const filteredCreators = creators.filter(c => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.display_name.toLowerCase().includes(s) ||
      c.handle.toLowerCase().includes(s) ||
      (c.city && c.city.toLowerCase().includes(s))
    );
  });

  const totalCoins = creators.reduce((sum, c) => sum + c.lifetime_coins, 0);
  const totalRevenue = totalCoins * 10;

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar displayName={displayName} />

      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900 tracking-tight">
            Creator
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Übersicht aller Frauen mit Lifetime-Stats.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!loading && creators.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="bg-white border border-zinc-200 rounded-xl p-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2">
                  Creator gesamt
                </div>
                <div className="font-sans text-3xl font-semibold text-zinc-900 tabular-nums tracking-tight">
                  {creators.length}
                </div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2">
                  Coins gesamt
                </div>
                <div className="font-sans text-3xl font-semibold text-zinc-900 tabular-nums tracking-tight">
                  {totalCoins.toLocaleString('de-DE')}
                </div>
              </div>
              <div className="bg-white border border-zinc-200 rounded-xl p-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2">
                  Umsatz gesamt
                </div>
                <div className="font-sans text-3xl font-semibold text-zinc-900 tabular-nums tracking-tight">
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency', currency: 'EUR',
                  }).format(totalRevenue / 100)}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nach Name, Handle oder Stadt suchen…"
                className="w-full sm:w-80 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none"
              />
            </div>
          </>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
            Creator werden geladen…
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
            <p className="text-sm text-zinc-500">
              {creators.length === 0 ? 'Keine Creator vorhanden.' : 'Keine Treffer für deine Suche.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Creator</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Stadt</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Alter</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Coins</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Nachrichten</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Umsatz</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Online</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Heute</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Antwort-Ø</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCreators.map(creator => (
                  <tr key={creator.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-600 shrink-0">
                          {initials(creator.display_name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900">{creator.display_name}</div>
                          <div className="text-[11px] text-zinc-500">@{creator.handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{creator.city || '—'}</td>
                    <td className="px-4 py-3 text-zinc-700 tabular-nums">{creator.age || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-zinc-900">
                      {creator.lifetime_coins.toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                      {creator.lifetime_messages.toLocaleString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-zinc-900">
                      {coinsToEuro(creator.lifetime_coins)}
                    </td>
                    <td className="px-4 py-3">
                      {activityMap[creator.id]?.is_online_now ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400">Offline</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700 text-xs">
                      {activityMap[creator.id]?.online_today_seconds
                        ? formatDuration(activityMap[creator.id].online_today_seconds)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-700 text-xs">
                      {activityMap[creator.id]?.avg_response_today_seconds
                        ? formatResponseTime(activityMap[creator.id].avg_response_today_seconds!)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {creator.status === 'active' ? (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                          Aktiv
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-600 bg-zinc-100 px-2 py-1 rounded">
                          {creator.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
