'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listCreators, createConversation, getAccessToken, type Creator } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

function Logo() {
  return (
    <span className="inline-flex items-center gap-1.5 group">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span className="font-display text-base sm:text-xl font-semibold tracking-tight text-zinc-900">verliebdich</span>
    </span>
  );
}

function RegisterModal({ frau, onClose }: { frau: Creator; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-4 animate-fade-up">
      <div className="max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={frau.avatar_url || ''} alt={frau.display_name} className="w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 text-zinc-700 flex items-center justify-center hover:bg-white transition-colors"
            aria-label="Schließen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-5 text-white">
            <div className="font-display text-2xl sm:text-3xl font-semibold">{frau.display_name}</div>
          </div>
        </div>

        <div className="p-6 sm:p-8 text-center">
          <h3 className="font-display text-lg sm:text-2xl font-semibold mb-2 leading-tight">
            Registriere dich kostenlos, um <span className="italic text-brand-600">{frau.display_name}</span> kennenzulernen.
          </h3>
          <p className="text-zinc-600 mb-5 text-sm leading-relaxed">
            Ohne Abo. Ohne versteckte Kosten. In 30 Sekunden startklar.
          </p>
          <Link
            href="/register"
            className="block w-full bg-brand-600 text-white text-sm sm:text-base font-semibold py-3 sm:py-4 rounded-full hover:bg-brand-700 transition-all shadow-pink-lg mb-2"
          >
            Kostenlos registrieren
          </Link>
          <button
            onClick={onClose}
            className="text-zinc-500 text-xs sm:text-sm hover:text-zinc-900 transition-colors"
          >
            Vielleicht später
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrau, setSelectedFrau] = useState<Creator | null>(null);
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setAuthed(!!getAccessToken());

    listCreators()
      .then((res) => setCreators(res.creators))
      .catch((err) => console.error('Fehler beim Laden der Profile:', err))
      .finally(() => setLoading(false));
  }, []);

  async function handleFrauClick(frau: Creator) {
    if (!authed) {
      setSelectedFrau(frau);
      return;
    }

    setStartingChat(frau.user_id);
    try {
      const { id } = await createConversation(frau.user_id);
      router.push(`/inbox/${id}`);
    } catch (err) {
      console.error('Chat-Start fehlgeschlagen:', err);
      setStartingChat(null);
    }
  }

  return (
    <>
      {mounted && authed ? (
        <AppHeader />
      ) : (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 py-2.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Logo />
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login" className="hidden sm:inline-block text-sm font-medium text-zinc-700 hover:text-brand-600 transition-colors">Anmelden</Link>
              <Link href="/register" className="text-xs sm:text-sm font-semibold bg-brand-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full hover:bg-zinc-900 transition-all shadow-pink">Anmelden / Registrieren</Link>
            </div>
          </div>
        </header>
      )}

      <main className="bg-soft-gradient min-h-screen">
        {/* Header-Sektion — kompakter */}
        <section className="pt-6 sm:pt-10 pb-4 sm:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              <span className="text-green-700 font-semibold text-[10px] sm:text-xs tracking-[0.2em] uppercase">
                {creators.length} Frauen online
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight mb-2 sm:mb-4">
              Echte Frauen <span className="italic text-brand-600">entdecken</span>
            </h1>
            <p className="text-zinc-600 text-xs sm:text-base max-w-2xl leading-relaxed">
              Diskret, persönlich, ohne Bots.
            </p>
          </div>
        </section>

        {/* Profil-Grid */}
        <section className="pb-10 sm:pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[3/4] bg-zinc-200/60 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : creators.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                Keine Profile verfügbar.
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
                {creators.map((f) => (
                  <button
                    key={f.user_id}
                    onClick={() => handleFrauClick(f)}
                    disabled={startingChat === f.user_id}
                    className="group relative text-left disabled:opacity-60"
                  >
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm group-hover:shadow-pink transition-all">
                      {f.avatar_url ? (
                        <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full bg-zinc-200" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                      {/* Online-Badge — kleiner, dezenter */}
                      <div className="absolute top-2 left-2">
                        <span className="flex items-center gap-1 bg-white/90 backdrop-blur text-zinc-800 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                          <span className="w-1 h-1 rounded-full bg-green-500"></span>
                          Online
                        </span>
                      </div>

                      {/* Coin-Preis — dezenter */}
                      <div className="absolute top-2 right-2">
                        <span className="bg-white/90 backdrop-blur text-brand-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          {f.message_price_coins} Coins
                        </span>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 text-white">
                        <div className="font-display text-sm sm:text-xl font-semibold leading-tight">{f.display_name}</div>
                        {f.bio && (
                          <div className="text-[10px] sm:text-xs opacity-80 line-clamp-1 mt-0.5">
                            {f.bio.split('.')[0]}
                          </div>
                        )}
                      </div>

                      {startingChat === f.user_id && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center">
                          <div className="w-7 h-7 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {mounted && !authed && (
              <div className="mt-10 sm:mt-14 text-center">
                <p className="text-zinc-600 text-sm mb-4">
                  Mehr Profile & Filter nach kostenloser Registrierung.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 bg-brand-600 text-white font-semibold px-6 sm:px-8 py-3 rounded-full hover:bg-brand-700 transition-all shadow-pink-lg text-sm"
                >
                  <span>Kostenlos registrieren</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedFrau && !authed && <RegisterModal frau={selectedFrau} onClose={() => setSelectedFrau(null)} />}
    </>
  );
}
