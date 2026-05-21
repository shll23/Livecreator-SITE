'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAccessToken, logout } from '@/lib/api';
import PushPermissionButton from '@/components/PushPermissionButton';

// ============================================================================
// Einstellungs-Seite
//
// Push-Benachrichtigungen, Sicherheit, Logout.
// Fuer den Customer-Bereich (verliebdich.com).
// ============================================================================
export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [router]);

  async function handleLogout() {
    try { await logout(); } catch {}
    router.push('/login');
  }

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="text-sm text-zinc-500">Lädt...</div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-zinc-50 pb-32">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/explore"
            aria-label="Zurück"
            className="w-9 h-9 rounded-full bg-white border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-zinc-900">Einstellungen</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Benachrichtigungen und Konto.</p>
          </div>
        </div>

        {/* Push-Benachrichtigungen */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-5 mb-4">
          <h2 className="text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-3">
            Benachrichtigungen
          </h2>
          <p className="text-sm text-zinc-700 mb-4">
            Werde sofort benachrichtigt, wenn dir jemand antwortet — auch wenn die App geschlossen ist.
          </p>
          <PushPermissionButton />
        </section>

        {/* Konto-Aktionen */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-5">
          <h2 className="text-xs uppercase tracking-[0.18em] text-zinc-500 font-semibold mb-3">
            Konto
          </h2>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <div>
                <div className="font-medium text-sm text-red-700">Abmelden</div>
                <div className="text-xs text-red-500">Sicher ausloggen</div>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-300">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </section>
      </div>
    </main>
  );
}
