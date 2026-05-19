'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================================================
// DEMO-DATEN
// ============================================================================

const FRAUEN = [
  { id: 'lara', name: 'Lara', age: 24, city: 'Berlin', image: '/profiles/frau-1-lara/02.jpg', online: true, mood: 'Diskret' },
  { id: 'valentina', name: 'Valentina', age: 25, city: 'München', image: '/profiles/frau-2-valentina/01-haupt.jpg', online: true, mood: 'Direkt' },
  { id: 'mia', name: 'Mia', age: 23, city: 'Hamburg', image: '/profiles/frau-3-mia/01-haupt.jpg', online: true, mood: 'Cool' },
  { id: 'sophia', name: 'Sophia', age: 26, city: 'Frankfurt', image: '/profiles/frau-4-sophia/01-haupt.png', online: true, mood: 'Sportlich' },
  { id: 'elena', name: 'Elena', age: 29, city: 'Düsseldorf', image: '/profiles/frau-5-elena/01-haupt.jpg', online: false, mood: 'Reif' },
  { id: 'sarah', name: 'Sarah', age: 31, city: 'Köln', image: '/profiles/frau-6-sarah/01-haupt.jpg', online: true, mood: 'Sophisticated' },
];

// ============================================================================
// LOGO
// ============================================================================

function Logo() {
  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2 group">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-600" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span className="font-display text-lg sm:text-2xl font-semibold tracking-tight text-zinc-900">verliebdich</span>
    </span>
  );
}

// ============================================================================
// REGISTER MODAL — popup bei Profil-Klick
// ============================================================================

function RegisterModal({ frau, onClose }: { frau: typeof FRAUEN[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-4 animate-fade-up">
      <div className="max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src={frau.image} alt={frau.name} className="w-full h-full object-cover" />
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
            <div className="text-xs uppercase tracking-widest opacity-80">{frau.city} · {frau.age}</div>
            <div className="font-display text-2xl sm:text-3xl font-semibold">{frau.name}</div>
          </div>
        </div>

        <div className="p-6 sm:p-8 text-center">
          <h3 className="font-display text-lg sm:text-2xl font-semibold mb-2 leading-tight">
            Registriere dich kostenlos, um <span className="italic text-brand-600">{frau.name}'s</span> Profil zu sehen.
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

// ============================================================================
// EXPLORE PAGE
// ============================================================================

export default function ExplorePage() {
  const [selectedFrau, setSelectedFrau] = useState<typeof FRAUEN[0] | null>(null);
  const [filterCity, setFilterCity] = useState<string>('Alle');

  const cities = ['Alle', ...Array.from(new Set(FRAUEN.map((f) => f.city)))];
  const filtered = filterCity === 'Alle' ? FRAUEN : FRAUEN.filter((f) => f.city === filterCity);
  const onlineCount = FRAUEN.filter((f) => f.online).length;

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 py-3">
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

      <main className="bg-soft-gradient min-h-screen">
        {/* Header-Sektion */}
        <section className="pt-6 sm:pt-12 pb-5 sm:pb-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-green-700 font-semibold text-[10px] sm:text-xs tracking-[0.2em] uppercase">
                {onlineCount} Frauen jetzt online
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-5xl md:text-6xl font-semibold leading-tight tracking-tight mb-2.5 sm:mb-5">
              Alle Profile <span className="italic text-brand-600">entdecken</span>
            </h1>
            <p className="text-zinc-600 text-sm sm:text-lg max-w-2xl mb-4 sm:mb-8 leading-relaxed">
              Entdecke echte Frauen in deiner Nähe.
            </p>

            {/* Stadt-Filter — kompakter auf Mobile */}
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setFilterCity(city)}
                  className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-full text-[11px] sm:text-sm font-medium transition-all ${
                    filterCity === city
                      ? 'bg-brand-600 text-white shadow-pink'
                      : 'bg-white text-zinc-700 hover:bg-zinc-50 border border-zinc-200/80'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Profil-Grid */}
        <section className="pb-20 sm:pb-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
              {filtered.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFrau(f)}
                  className="group relative text-left"
                >
                  <div className="relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden shadow group-hover:shadow-pink-lg transition-all">
                    <img
                      src={f.image}
                      alt={f.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                      {f.online ? (
                        <span className="flex items-center gap-1 bg-white/95 backdrop-blur text-zinc-900 text-[9px] sm:text-[11px] font-semibold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow">
                          <span className="relative flex h-1 w-1 sm:h-1.5 sm:w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1 w-1 sm:h-1.5 sm:w-1.5 bg-green-500"></span>
                          </span>
                          Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-zinc-100/90 backdrop-blur text-zinc-500 text-[9px] sm:text-[11px] font-medium px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-zinc-400" />
                          Offline
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 text-white">
                      <div className="font-display text-base sm:text-2xl font-semibold leading-tight">{f.name} · {f.age}</div>
                      <div className="text-[9px] sm:text-xs opacity-75 flex items-center gap-0.5 sm:gap-1.5">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="sm:w-2.5 sm:h-2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                        {f.city}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* CTA am Ende */}
            <div className="mt-10 sm:mt-16 text-center">
              <p className="text-zinc-600 text-sm sm:text-base mb-4 sm:mb-6">
                Mehr Profile, Filter & Suche — nach kostenloser Registrierung.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-brand-600 text-white font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-brand-700 transition-all shadow-pink-lg text-sm sm:text-base"
              >
                <span>Jetzt kostenlos registrieren</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Modal bei Klick auf Profil */}
      {selectedFrau && <RegisterModal frau={selectedFrau} onClose={() => setSelectedFrau(null)} />}
    </>
  );
}
