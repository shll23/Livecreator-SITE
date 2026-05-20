'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getCreatorByHandle, createConversation, getAccessToken, type Creator } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import CoinIcon from '@/components/CoinIcon';

function Logo() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand-600" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span className="font-display text-base sm:text-xl font-semibold tracking-tight text-zinc-900">verliebdich</span>
    </span>
  );
}

export default function ProfilDetailPage() {
  const router = useRouter();
  const params = useParams();
  const handle = params?.handle as string;

  const [profile, setProfile] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(!!getAccessToken());
  }, []);

  useEffect(() => {
    if (!handle) return;
    getCreatorByHandle(handle)
      .then(setProfile)
      .catch(() => setError('Profil nicht gefunden'))
      .finally(() => setLoading(false));
  }, [handle]);

  async function handleStartChat() {
    if (!profile) return;
    if (!authed) {
      router.push('/register');
      return;
    }

    setStartingChat(true);
    try {
      const { id } = await createConversation(profile.user_id);
      router.push(`/inbox/${id}`);
    } catch (err) {
      console.error('Chat-Start fehlgeschlagen:', err);
      setStartingChat(false);
    }
  }

  // ===========================================================================
  // LADE-ZUSTAND
  // ===========================================================================
  if (loading) {
    return (
      <>
        {mounted && authed ? <AppHeader /> : (
          <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 py-2.5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6"><Logo /></div>
          </header>
        )}
        <main className="min-h-screen bg-soft-gradient flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  // ===========================================================================
  // FEHLER-ZUSTAND
  // ===========================================================================
  if (error || !profile) {
    return (
      <>
        {mounted && authed ? <AppHeader /> : (
          <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 py-2.5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6"><Logo /></div>
          </header>
        )}
        <main className="min-h-screen bg-soft-gradient flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">😕</div>
            <h1 className="font-display text-xl font-semibold mb-2">Profil nicht gefunden</h1>
            <p className="text-zinc-600 text-sm mb-5">{error}</p>
            <Link
              href="/explore"
              className="inline-block bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-brand-700 transition-colors"
            >
              Zurück zur Übersicht
            </Link>
          </div>
        </main>
      </>
    );
  }

  // ===========================================================================
  // PROFIL-ANSICHT
  // ===========================================================================
  return (
    <>
      {mounted && authed ? (
        <AppHeader />
      ) : (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 py-2.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center"><Logo /></Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login" className="hidden sm:inline-block text-sm font-medium text-zinc-700 hover:text-brand-600 transition-colors">Anmelden</Link>
              <Link href="/register" className="text-xs sm:text-sm font-semibold bg-brand-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full hover:bg-zinc-900 transition-all shadow-pink">Anmelden / Registrieren</Link>
            </div>
          </div>
        </header>
      )}

      <main className="min-h-screen bg-soft-gradient pb-24 sm:pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          {/* Zurück-Link */}
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-brand-600 transition-colors mb-4"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Zurück zur Übersicht
          </Link>

          {/* PROFIL-CARD */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-pink border border-zinc-100">
            {/* Bild */}
            <div className="relative aspect-[4/5] sm:aspect-[3/2] overflow-hidden bg-zinc-100">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-200" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />

              {/* Online-Badge */}
              <div className="absolute top-3 left-3">
                <span className="flex items-center gap-1.5 bg-white/95 backdrop-blur text-zinc-800 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                  Online
                </span>
              </div>

              {/* Verifiziert-Badge */}
              {profile.is_verified && (
                <div className="absolute top-3 right-3">
                  <span className="flex items-center gap-1 bg-blue-500/95 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L9 5L5 5L5 9L2 12L5 15L5 19L9 19L12 22L15 19L19 19L19 15L22 12L19 9L19 5L15 5L12 2zM10 17L5 12L7 10L10 13L17 6L19 8L10 17z" />
                    </svg>
                    Verifiziert
                  </span>
                </div>
              )}

              {/* Name + Alter + Stadt */}
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight">
                  {profile.display_name}
                  {profile.age && <span className="font-normal opacity-90">, {profile.age}</span>}
                </h1>
                {profile.city && (
                  <div className="flex items-center gap-1.5 mt-1 text-sm opacity-90">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
                    </svg>
                    {profile.city}
                  </div>
                )}
              </div>
            </div>

            {/* Inhalt */}
            <div className="p-5 sm:p-7">
              {/* Bio */}
              {profile.bio && (
                <div className="mb-5">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
                    Über mich
                  </div>
                  <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Coin-Preis Info-Box */}
              <div className="flex items-center gap-3 bg-amber-50/60 border border-amber-200/50 rounded-xl p-3 sm:p-4 mb-5">
                <div className="shrink-0">
                  <CoinIcon size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-900">
                    {profile.message_price_coins} Coins pro Nachricht
                  </div>
                  <div className="text-xs text-zinc-600">
                    Antworten von {profile.display_name} kosten nichts extra.
                  </div>
                </div>
              </div>

              {/* CTA — nur Desktop (Mobile hat Sticky-CTA unten) */}
              <div className="hidden sm:block">
                {authed ? (
                  <button
                    onClick={handleStartChat}
                    disabled={startingChat}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-full transition-all shadow-pink-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {startingChat ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        Nachricht senden
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href="/register"
                    className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-full transition-all shadow-pink-lg"
                  >
                    Kostenlos registrieren um zu schreiben
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE STICKY CTA */}
        <div className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-zinc-200 px-4 py-3 z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
          {authed ? (
            <button
              onClick={handleStartChat}
              disabled={startingChat}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-full transition-all shadow-pink-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {startingChat ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Nachricht senden
                </>
              )}
            </button>
          ) : (
            <Link
              href="/register"
              className="w-full inline-flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-full transition-all shadow-pink-lg"
            >
              Kostenlos registrieren
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
