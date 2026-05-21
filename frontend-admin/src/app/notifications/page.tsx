'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import {
  getAccessToken,
  adminGetAudienceCounts,
  adminBroadcastPush,
  type AudienceKey,
  type AudienceCounts,
  APIError,
} from '@/lib/api';

interface AudienceOption {
  key: AudienceKey;
  label: string;
  description: string;
}

const AUDIENCES: AudienceOption[] = [
  {
    key: 'all_customers',
    label: 'Alle Kunden',
    description: 'Broadcast an jeden registrierten Kunden',
  },
  {
    key: 'paying_customers',
    label: 'Zahlende Kunden',
    description: 'Hat mindestens einen Coin-Kauf getätigt',
  },
  {
    key: 'new_customers_7d',
    label: 'Neue Kunden (7 Tage)',
    description: 'In den letzten 7 Tagen registriert',
  },
  {
    key: 'inactive_customers',
    label: 'Inaktive Kunden',
    description: 'Noch keinen Coin-Kauf getätigt',
  },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [counts, setCounts] = useState<AudienceCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AudienceKey>('all_customers');
  const [clickURL, setClickURL] = useState('/');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminGetAudienceCounts();
      setCounts(res.counts);
    } catch (err) {
      if (err instanceof APIError && err.code === 'unauthenticated') {
        router.push('/login');
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    load();
  }, [router, load]);

  function openConfirm() {
    setError(null);
    setResult(null);
    if (!title.trim() || !body.trim()) {
      setError('Title und Body sind Pflicht.');
      return;
    }
    if (title.length > 100) {
      setError('Title max. 100 Zeichen.');
      return;
    }
    if (body.length > 300) {
      setError('Body max. 300 Zeichen.');
      return;
    }
    setConfirmOpen(true);
  }

  async function send() {
    setConfirmOpen(false);
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await adminBroadcastPush({
        title: title.trim(),
        body: body.trim(),
        audience,
        click_url: clickURL.trim() || '/',
      });
      setResult(`✓ Push an ${res.recipients} Empfänger gesendet`);
      setTitle('');
      setBody('');
    } catch (err: any) {
      setError(err?.code || err?.message || 'Fehler beim Senden');
    } finally {
      setSending(false);
    }
  }

  const selectedCount = counts ? counts[audience] : 0;

  return (
    <div className="flex min-h-dvh bg-zinc-50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-8 lg:py-10">
          <div className="mb-8">
            <h1 className="font-display text-3xl lg:text-4xl font-semibold text-zinc-900">Push-Benachrichtigungen</h1>
            <p className="text-zinc-500 mt-1 text-sm">Sende Marketing-Push an deine Kunden.</p>
          </div>

          {loading ? (
            <div className="text-sm text-zinc-500">Lade Empfänger-Zahlen...</div>
          ) : (
            <div className="space-y-6">
              {/* Audience */}
              <section className="bg-white border border-zinc-200 rounded-xl p-5">
                <h2 className="text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-4">Empfänger</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AUDIENCES.map(opt => {
                    const n = counts ? counts[opt.key] : 0;
                    const isSel = audience === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAudience(opt.key)}
                        className={`text-left px-4 py-3 rounded-lg border transition ${
                          isSel
                            ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900'
                            : 'border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="font-semibold text-sm text-zinc-900">{opt.label}</div>
                          <div className="text-sm font-medium tabular-nums text-zinc-600">{n}</div>
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">{opt.description}</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Compose */}
              <section className="bg-white border border-zinc-200 rounded-xl p-5">
                <h2 className="text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-4">Nachricht</h2>

                <label className="block mb-4">
                  <div className="text-xs font-medium text-zinc-700 mb-1.5">Title <span className="text-zinc-400">({title.length}/100)</span></div>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value.slice(0, 100))}
                    placeholder="z.B. 💝 Heute 20% extra Coins"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </label>

                <label className="block mb-4">
                  <div className="text-xs font-medium text-zinc-700 mb-1.5">Body <span className="text-zinc-400">({body.length}/300)</span></div>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value.slice(0, 300))}
                    placeholder="z.B. Nur heute: 100 Bonus-Coins bei jedem Kauf ab 24,99€"
                    rows={3}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none"
                  />
                </label>

                <label className="block mb-4">
                  <div className="text-xs font-medium text-zinc-700 mb-1.5">Klick-Ziel-URL</div>
                  <input
                    type="text"
                    value={clickURL}
                    onChange={e => setClickURL(e.target.value)}
                    placeholder="/explore"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                  <div className="text-[11px] text-zinc-500 mt-1">Wohin der Nutzer kommt wenn er auf die Push tippt (Standard: /)</div>
                </label>

                {/* Preview */}
                {(title || body) && (
                  <div className="mt-4 mb-4 p-3 bg-zinc-100 border border-zinc-200 rounded-lg">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">Vorschau</div>
                    <div className="bg-white rounded-md p-3 shadow-sm">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-md bg-pink-500 flex-shrink-0 flex items-center justify-center text-white">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-zinc-900 truncate">{title || 'Title'}</div>
                          <div className="text-xs text-zinc-600 line-clamp-2 mt-0.5">{body || 'Body...'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">{error}</div>}
                {result && <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-700">{result}</div>}

                <button
                  onClick={openConfirm}
                  disabled={sending || !title.trim() || !body.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-zinc-900 text-white rounded-md text-sm font-semibold hover:bg-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Wird gesendet...' : `An ${selectedCount} Empfänger senden`}
                </button>
              </section>
            </div>
          )}
        </div>

        {/* Confirm-Modal */}
        {confirmOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">Push wirklich senden?</h3>
              <p className="text-sm text-zinc-600 mb-1">
                An <strong>{selectedCount}</strong> Empfänger ({AUDIENCES.find(a => a.key === audience)?.label}).
              </p>
              <p className="text-xs text-zinc-500 mb-5">
                Push kann nach dem Senden nicht zurückgenommen werden.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition"
                >
                  Abbrechen
                </button>
                <button
                  onClick={send}
                  className="px-4 py-2 text-sm font-semibold bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition"
                >
                  Ja, senden
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
