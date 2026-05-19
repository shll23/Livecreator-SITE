'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================================================
// DEMO-DATEN
// ============================================================================

const CREATORS = [
  { name: 'Lina', age: 24, city: 'Berlin', image: '/creators/creator-5.jpg', online: true, status: 'Hab Lust auf neue Begegnungen heute.', mood: 'Aufgeschlossen' },
  { name: 'Sophia', age: 26, city: 'München', image: '/creators/creator-6.jpg', online: true, status: 'Schreib mich an — ich verrate dir, worauf ich heute stehe.', mood: 'Neugierig' },
  { name: 'Mia', age: 23, city: 'Hamburg', image: '/creators/creator-real-4.jpg', online: true, status: 'Glas Wein in der Hand, Bett im Rücken. Ablenkung gesucht.', mood: 'Entspannt' },
  { name: 'Emma', age: 25, city: 'Köln', image: '/creators/creator-7.jpg', online: false, status: 'Heute Abend ab 21 Uhr wieder erreichbar.', mood: 'Bald zurück' },
  { name: 'Hannah', age: 22, city: 'Frankfurt', image: '/creators/creator-8.jpg', online: true, status: 'Sag was Liebes — ich beiß auch nur wenn du willst.', mood: 'Süß & frech' },
  { name: 'Valentina', age: 27, city: 'Düsseldorf', image: '/creators/creator-3.jpg', online: true, status: 'Direkter Typ? Ich auch. Erzähl mir was Ehrliches.', mood: 'Klartext' },
  { name: 'Nora', age: 24, city: 'Stuttgart', image: '/creators/creator-real-5.jpg', online: false, status: 'Bin morgen wieder da — schick mir trotzdem eine Nachricht.', mood: 'Offline' },
  { name: 'Marie', age: 26, city: 'Leipzig', image: '/creators/creator-2.jpg', online: true, status: 'Lust auf gute Laune und zu viel zu reden? Dann ich.', mood: 'Verspielt' },
];

const PREMIUM_LOCKS = [
  { name: 'Lina', image: '/creators/creator-real-1-blurred.jpg', coins: 5, label: 'Exklusiv für dich' },
  { name: 'Mia', image: '/creators/creator-real-2-blurred.jpg', coins: 10, label: 'Privates Foto' },
  { name: 'Sophia', image: '/creators/creator-real-3-blurred.jpg', coins: 8, label: 'Heute geschossen' },
];

const COIN_PACKAGES = [
  { name: 'Probier', coins: 100, price: '9,99', popular: false },
  { name: 'Genießer', coins: 250, price: '24,99', popular: true },
  { name: 'Liebhaber', coins: 500, price: '49,99', popular: false },
  { name: 'Intensiv', coins: 1000, price: '89,99', popular: false },
];

const FEATURED_PROFILE = {
  name: 'Lina',
  age: 24,
  city: 'Berlin',
  image: '/creators/creator-5.jpg',
  online: true,
  bio: 'Ich rede gern. Ich höre lieber zu. Und ich habe gelernt, dass die spannendsten Gespräche meistens nachts passieren. Mit jemandem, der den Mut hat, mich wirklich kennenzulernen.',
  likes: ['Lange Nächte', 'Klartext', 'Spontaneität', 'Schlagfertige Männer', 'Kribbeln im Bauch', 'Ehrliche Komplimente'],
  looking: ['Kennenlernen', 'Lockeres Dating', 'Offen für ONS', 'Sexting', 'Lange Gespräche', 'Flirten ohne Druck'],
  today: 'Hab Lust auf neue Begegnungen heute.',
};

const FAQ_ITEMS = [
  { q: 'Wie funktioniert verliebdich?', a: 'verliebdich ist eine Plattform für persönliche Gespräche mit echten Frauen. Du wählst, wer dich interessiert, und beginnst eine Unterhaltung. Bezahlt wird nur, was du nutzt — über Coins, die du flexibel auflädst. Kein Abo, keine Bindung.' },
  { q: 'Wer schreibt mir?', a: 'Echte Frauen. Jede Creator auf verliebdich wird vor der Freischaltung persönlich verifiziert. Wer dir schreibt, ist die Person, deren Bild du siehst — mit eigenen Worten, eigenem Tag, eigener Stimmung.' },
  { q: 'Wie laufen Nachrichten ab?', a: 'Eine Nachricht kostet zwischen 7 und 10 Coins — die Creator bestimmt ihren eigenen Preis. Du siehst den Preis immer bevor du schreibst und entscheidest in jedem Moment selbst, wie weit du gehst.' },
  { q: 'Gibt es ein Abo?', a: 'Nein. Bei verliebdich gibt es keine automatischen Verlängerungen, keine versteckten Kosten, keine Vertragsbindung. Jeder Coin-Kauf ist eine einzelne, freiwillige Entscheidung.' },
  { q: 'Was bedeutet "exklusive Inhalte"?', a: 'Manche Bilder und Videos teilen die Frauen nur mit denen, die ein konkretes Interesse zeigen. Diese Inhalte schaltest du mit Coins frei — eine Form der Wertschätzung gegenüber den Creators. Du entscheidest jedes Mal neu.' },
  { q: 'Wie entstehen erste Kontakte?', a: 'Auf verliebdich melden sich oft Creators zuerst — eine Begrüßung, ein erstes Hallo, etwas, das ein Gespräch beginnen lässt. Ab dem Moment, in dem du antwortest, schreibst du direkt mit der jeweiligen Person.' },
  { q: 'Wie diskret ist verliebdich?', a: 'Server in Deutschland, verschlüsselte Verbindungen, neutraler Verwendungszweck auf deinem Kontoauszug. Dein Klarname bleibt verborgen — Creators sehen nur deinen gewählten Nickname. Was hier passiert, bleibt zwischen euch.' },
];

// ============================================================================
// AGE GATE
// ============================================================================

function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/95 backdrop-blur-xl p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl p-6 sm:p-8 shadow-2xl text-center animate-fade-up">
        <div className="relative inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-600 text-white font-display font-extrabold text-base mb-4 shadow-pink-lg">
          <span className="relative" style={{ top: '1px' }}>18+</span>
          <div className="absolute inset-0 rounded-full bg-brand-500 blur-2xl opacity-40 -z-10" />
        </div>

        <h2 className="font-display font-semibold leading-[1.15] mb-3">
          <span className="block text-lg text-zinc-900">Diese Seite ist nur</span>
          <span className="block text-lg italic text-brand-600">für Erwachsene</span>
        </h2>

        <p className="text-zinc-600 mb-5 leading-relaxed text-xs">
          Du musst mindestens 18 Jahre alt sein, um verliebdich zu nutzen.
          Mit dem Bestätigen erklärst du, volljährig zu sein.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className="w-full bg-zinc-900 text-white text-sm font-semibold py-3 rounded-full hover:bg-brand-600 transition-all"
          >
            Ich bin 18 oder älter — eintreten
          </button>
          <a
            href="https://www.google.com"
            className="w-full text-zinc-500 font-medium py-1.5 hover:text-zinc-900 transition-colors text-xs"
          >
            Ich bin jünger — verlassen
          </a>
        </div>

        <p className="mt-4 text-[10px] text-zinc-400">
          Deine Daten sind sicher · DSGVO-konform · Made in 🇩🇪
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// HEADER — kompakter, weniger Padding
// ============================================================================

function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 py-2' : 'bg-transparent py-2.5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 group">
          <div className="w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-display font-semibold text-xs sm:text-lg group-hover:scale-110 transition-transform">v</div>
          <span className="font-display text-base sm:text-2xl font-semibold tracking-tight">verliebdich</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-700">
          <a href="#live" className="hover:text-brand-600 transition-colors flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </a>
          <a href="#top" className="hover:text-brand-600 transition-colors">Begegnungen</a>
          <a href="#preise" className="hover:text-brand-600 transition-colors">Mitgliedschaft</a>
          <a href="#faq" className="hover:text-brand-600 transition-colors">Fragen</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/login" className="hidden sm:inline-block text-sm font-medium text-zinc-700 hover:text-brand-600 transition-colors">Anmelden</Link>
          <Link href="/register" className="text-[11px] sm:text-sm font-semibold bg-brand-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full hover:bg-zinc-900 transition-all shadow-pink">Jetzt starten</Link>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// HERO — kompakt, kein min-h-screen mehr
// ============================================================================

function Hero({ onCityFound }: { onCityFound: (city: string) => void }) {
  const [onlineCount, setOnlineCount] = useState(237);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [city, setCity] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => prev + (Math.random() > 0.5 ? 1 : -1));
    }, 4000);
    const timer = setTimeout(() => setBubbleVisible(true), 1500);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, []);

  const handleCitySubmit = () => {
    if (city.trim().length > 1) onCityFound(city.trim());
  };

  return (
    <section className="relative overflow-hidden pt-14 sm:pt-24 pb-6 sm:pb-16 bg-soft-gradient">
      <div className="absolute top-[20%] -left-20 sm:-left-32 w-[280px] sm:w-[480px] h-[320px] sm:h-[520px] bg-brand-300/25 rounded-[50%] blur-3xl pointer-events-none rotate-12" />
      <div className="absolute bottom-[10%] right-[-15%] w-[380px] sm:w-[640px] h-[340px] sm:h-[540px] bg-brand-400/20 rounded-[60%] blur-3xl pointer-events-none -rotate-6" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-12 gap-5 sm:gap-10 items-center w-full">
        <div className="md:col-span-6 lg:col-span-6 animate-fade-up">
          {/* Online-Badge */}
          <div className="inline-flex items-center gap-1.5 sm:gap-3 mb-3 sm:mb-7 bg-white/70 backdrop-blur rounded-full pl-2 sm:pl-3 pr-3 sm:pr-5 py-1 sm:py-2 border border-brand-200/60">
            <span className="relative flex h-1.5 w-1.5 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 bg-green-500"></span>
            </span>
            <span className="text-zinc-800 text-[11px] sm:text-sm font-medium">
              <span className="font-display text-brand-700 font-bold tabular-nums">{onlineCount}</span> Frauen online
            </span>
          </div>

          {/* HEADLINE — kompakt, 24px Mobile */}
          <h1 className="font-display font-semibold leading-[1] tracking-tight text-zinc-900">
            <span className="block text-2xl sm:text-5xl md:text-6xl lg:text-7xl">Sie <span className="italic text-brand-600/90 font-medium">wartet</span></span>
            <span className="block text-2xl sm:text-5xl md:text-6xl lg:text-7xl mt-0.5">auf dich.</span>
          </h1>

          <p className="mt-3 sm:mt-7 text-xs sm:text-base md:text-lg text-zinc-700 max-w-lg leading-relaxed">
            Schreib jetzt mit einer der <strong className="text-brand-700">{onlineCount} Frauen</strong>, die gerade online sind. <span className="font-medium">Diskret. Direkt. Echt.</span>
          </p>

          {/* Stadt-Input — kompakter */}
          <div className="mt-4 sm:mt-8">
            <label className="block text-[9px] sm:text-xs font-medium tracking-[0.2em] uppercase text-brand-600 mb-1.5 sm:mb-3">
              Wer ist in deiner Nähe?
            </label>
            <div className="flex flex-col gap-1.5 max-w-md bg-white rounded-xl sm:rounded-2xl p-1 sm:p-2 shadow-[0_4px_24px_-8px_rgba(236,72,153,0.15)] border border-zinc-200/80">
              <div className="flex items-center gap-1.5 flex-1 px-2.5 sm:px-4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-zinc-400 flex-shrink-0">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" fill="currentColor" />
                </svg>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCitySubmit()}
                  placeholder="Deine Stadt"
                  className="flex-1 py-2 sm:py-3 text-xs sm:text-base bg-transparent text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                />
              </div>
              <button
                onClick={handleCitySubmit}
                className="bg-brand-600 text-white text-xs sm:text-base font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl hover:bg-brand-700 transition-all whitespace-nowrap"
              >
                Frauen in deiner Nähe finden
              </button>
            </div>
          </div>

          {/* Trust-Line — kompakter */}
          <div className="mt-3 sm:mt-8 flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-1 text-[10px] sm:text-sm text-zinc-500">
            <span className="flex items-center gap-1"><span className="text-brand-600">·</span> Kein Abo</span>
            <span className="flex items-center gap-1"><span className="text-brand-600">·</span> 100% diskret</span>
            <span className="flex items-center gap-1"><span className="text-brand-600">·</span> 18+ verifiziert</span>
          </div>
        </div>

        {/* Hero-Bild — DEUTLICH kompakter auf Mobile */}
        <div className="md:col-span-6 lg:col-span-6 relative animate-fade-up mt-3 sm:mt-0" style={{ animationDelay: '200ms' }}>
          <div className="relative aspect-[4/5] w-full max-w-[240px] sm:max-w-[480px] mx-auto">
            <div className="absolute inset-0 rounded-xl sm:rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)]">
              <img src="/creators/creator-5.jpg" alt="Lina" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <div className="absolute top-2.5 right-2.5 sm:top-6 sm:right-6 flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full shadow-lg">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500"></span>
                </span>
                <span className="text-[9px] sm:text-xs font-semibold text-zinc-900">Online</span>
              </div>

              <div className="absolute bottom-3 sm:bottom-8 left-3 sm:left-8 right-3 sm:right-8 text-white">
                <div className="text-[8px] sm:text-xs font-medium tracking-[0.2em] uppercase opacity-80 mb-0.5 sm:mb-2">Berlin · 24</div>
                <div className="font-display text-lg sm:text-4xl font-semibold mb-1 sm:mb-3">Lina</div>
                <p className="text-[10px] sm:text-sm italic leading-snug opacity-95 line-clamp-2">"Hab Lust auf neue Begegnungen heute."</p>
              </div>
            </div>

            {/* Floating Message — nur Desktop */}
            <div className={`hidden sm:block absolute -bottom-8 right-4 md:-right-4 bg-white/85 backdrop-blur-xl rounded-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.18)] px-4 py-3 max-w-[230px] border border-white/60 transition-all duration-700 ${bubbleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="flex items-start gap-2.5">
                <img src="/creators/creator-5.jpg" alt="" className="w-7 h-7 rounded-full object-cover" />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-zinc-900">Lina</span>
                    <span className="text-[10px] text-zinc-500">jetzt</span>
                  </div>
                  <div className="text-sm text-zinc-700">"Hey... du gefällst mir 💋"</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// LIVE STRIP — Cards 50% kleiner, 2-Spalten auf Mobile
// ============================================================================

function LiveStrip() {
  const onlineCreators = CREATORS.filter((c) => c.online);

  return (
    <section id="live" className="py-8 sm:py-16 md:py-20 bg-white border-y border-zinc-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-4 sm:mb-8 gap-3">
          <div>
            <div className="flex items-center gap-1.5 sm:gap-3 mb-1.5 sm:mb-3">
              <span className="relative flex h-1.5 w-1.5 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 bg-green-500"></span>
              </span>
              <span className="text-green-700 font-semibold text-[9px] sm:text-xs tracking-[0.2em] uppercase">Jetzt Live</span>
            </div>
            <h2 className="font-display text-base sm:text-3xl md:text-4xl font-semibold leading-tight">
              <span className="text-brand-600">{onlineCreators.length}</span> Frauen warten <span className="italic">jetzt</span>
            </h2>
          </div>
          <Link href="/explore" className="text-[11px] sm:text-sm text-zinc-500 hover:text-brand-600 transition-colors font-medium whitespace-nowrap mb-0.5">
            Alle →
          </Link>
        </div>

        {/* Cards — drastisch schmaler auf Mobile */}
        <div
          className="flex gap-2 sm:gap-4 overflow-x-auto pb-3 -mx-4 sm:-mx-6 px-4 sm:px-6 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            div::-webkit-scrollbar { display: none; }
          `}</style>
          {CREATORS.map((c) => (
            <Link key={c.name} href="/register" className="group flex-shrink-0 w-[150px] sm:w-[300px] snap-start relative">
              <div className="relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden shadow group-hover:shadow-pink-lg transition-all">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                <div className="absolute top-1.5 sm:top-3 left-1.5 sm:left-3">
                  {c.online ? (
                    <span className="flex items-center gap-1 bg-white/95 backdrop-blur text-zinc-900 text-[9px] sm:text-[11px] font-semibold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow">
                      <span className="relative flex h-1 w-1 sm:h-2 sm:w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1 w-1 sm:h-2 sm:w-2 bg-green-500"></span>
                      </span>
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-zinc-100/90 backdrop-blur text-zinc-500 text-[9px] sm:text-[11px] font-medium px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                      <span className="w-0.5 h-0.5 sm:w-1.5 sm:h-1.5 rounded-full bg-zinc-400" />
                      Offline
                    </span>
                  )}
                </div>

                {c.online && (
                  <div className="hidden sm:block absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                    <div className="bg-white rounded-2xl rounded-tr-md shadow-xl px-3 py-2 max-w-[180px]">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                        <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Tippt gerade</span>
                      </div>
                      <div className="text-xs text-zinc-700 italic leading-snug">"Hey... 💋"</div>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-5 text-white">
                  <div className="font-display text-sm sm:text-2xl font-semibold mb-0">{c.name} · {c.age}</div>
                  <div className="text-[9px] sm:text-xs opacity-75 mb-1 sm:mb-3 flex items-center gap-0.5 sm:gap-1.5">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="sm:w-2.5 sm:h-2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                    {c.city}
                  </div>
                  <p className="hidden sm:block text-xs sm:text-sm leading-snug italic opacity-95 mb-2 sm:mb-3 line-clamp-2">"{c.status}"</p>
                  <div className="inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-medium tracking-wider uppercase bg-white/15 backdrop-blur px-1.5 sm:px-2 py-0.5 rounded-full">
                    {c.mood}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PREMIUM LOCKS — 2 Spalten auf Mobile, kompakter
// ============================================================================

function PremiumLocks() {
  return (
    <section className="py-10 sm:py-24 md:py-32 bg-zinc-900 text-white relative overflow-hidden">
      <div className="absolute top-[15%] left-[20%] w-[260px] sm:w-[420px] h-[300px] sm:h-[480px] bg-brand-600/25 rounded-[55%] blur-3xl pointer-events-none rotate-12" />
      <div className="absolute bottom-[10%] right-[15%] w-[240px] sm:w-[380px] h-[260px] sm:h-[420px] bg-brand-700/20 rounded-[45%] blur-3xl pointer-events-none -rotate-6" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-16">
          <div className="text-brand-400 font-medium text-[9px] sm:text-xs tracking-[0.3em] uppercase mb-2 sm:mb-6">Exklusiv</div>
          <h2 className="font-display text-lg sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
            Was sie nur dir <span className="italic text-brand-400">privat zeigt</span>
          </h2>
          <p className="mt-2 sm:mt-6 text-zinc-300 leading-relaxed text-xs sm:text-lg">
            Schalt frei, was dich neugierig macht.
          </p>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-6 max-w-5xl mx-auto">
          {PREMIUM_LOCKS.map((lock, i) => (
            <div key={i} className="group relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
              <img src={lock.image} alt="Locked" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/40" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-md rounded-full w-9 h-9 sm:w-16 sm:h-16 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white sm:w-[26px] sm:h-[26px]">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-6">
                <div className="text-[7px] sm:text-[10px] font-bold tracking-[0.15em] uppercase text-brand-400 mb-0.5 sm:mb-1 line-clamp-1">{lock.label}</div>
                <div className="font-display text-xs sm:text-2xl font-semibold mb-1 sm:mb-2">Von {lock.name}</div>
                <Link href="/register" className="inline-block bg-white/10 backdrop-blur-md text-white font-semibold text-[8px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-2 rounded-full border border-white/20 hover:bg-white/20 transition-all whitespace-nowrap">
                  🔓 {lock.coins} Coins
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center mt-5 sm:mt-12 text-zinc-400 text-[11px] sm:text-sm">
          Diskret & Ohne Verpflichtung.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// PROFILE SHOWCASE — kompakter, weniger Padding
// ============================================================================

function ProfileShowcase() {
  return (
    <section className="py-10 sm:py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-16">
          <div className="text-brand-600 font-medium text-[9px] sm:text-xs tracking-[0.3em] uppercase mb-2 sm:mb-6">Profile</div>
          <h2 className="font-display text-lg sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
            Lern sie erst kennen, <span className="italic text-brand-600">dann schreib</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-12 gap-4 sm:gap-8 md:gap-12 items-start md:items-center max-w-6xl mx-auto">
          {/* Bild — kompakter */}
          <div className="md:col-span-5 lg:col-span-5">
            <div className="relative aspect-[4/5] rounded-xl sm:rounded-3xl overflow-hidden shadow-xl max-w-[200px] sm:max-w-none mx-auto">
              <img src={FEATURED_PROFILE.image} alt={FEATURED_PROFILE.name} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full shadow-lg">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500"></span>
                </span>
                <span className="text-[9px] sm:text-xs font-semibold text-zinc-900">Online</span>
              </div>
            </div>
          </div>

          {/* Profil-Details — kompakter */}
          <div className="md:col-span-7 lg:col-span-7">
            <div className="mb-3 sm:mb-8">
              <div className="font-display text-xl sm:text-5xl font-semibold mb-0.5 sm:mb-2">{FEATURED_PROFILE.name} · {FEATURED_PROFILE.age}</div>
              <div className="text-xs sm:text-base text-zinc-500 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="sm:w-3.5 sm:h-3.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                {FEATURED_PROFILE.city}
              </div>
            </div>

            <div className="mb-3 sm:mb-8">
              <div className="text-[9px] sm:text-xs font-medium tracking-[0.2em] uppercase text-brand-600 mb-1.5 sm:mb-3">Über mich</div>
              <p className="text-xs sm:text-lg text-zinc-700 leading-relaxed italic">"{FEATURED_PROFILE.bio}"</p>
            </div>

            <div className="mb-3 sm:mb-8">
              <div className="text-[9px] sm:text-xs font-medium tracking-[0.2em] uppercase text-brand-600 mb-1.5 sm:mb-3">Worauf ich stehe</div>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {FEATURED_PROFILE.likes.map((like) => (
                  <span key={like} className="px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full bg-zinc-100 text-zinc-800 text-[10px] sm:text-sm font-medium">
                    {like}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3 sm:mb-8">
              <div className="text-[9px] sm:text-xs font-medium tracking-[0.2em] uppercase text-brand-600 mb-1.5 sm:mb-3">Was ich suche</div>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {FEATURED_PROFILE.looking.map((item) => (
                  <span key={item} className="px-2 sm:px-3 py-0.5 sm:py-1.5 rounded-full bg-brand-50 border border-brand-200/60 text-brand-700 text-[10px] sm:text-sm font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4 sm:mb-10 p-3 sm:p-5 rounded-lg sm:rounded-2xl bg-gradient-to-br from-brand-50/60 to-transparent border border-brand-100/60">
              <div className="text-[9px] sm:text-xs font-medium tracking-[0.2em] uppercase text-brand-600 mb-1 sm:mb-2">Heute</div>
              <p className="text-xs sm:text-base text-zinc-800 italic">"{FEATURED_PROFILE.today}"</p>
            </div>

            <Link href="/explore" className="group inline-flex items-center gap-1.5 sm:gap-3 text-xs sm:text-base text-zinc-900 font-semibold hover:text-brand-600 transition-colors">
              <span>Mehr Profile entdecken</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform sm:w-[18px] sm:h-[18px]">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// COIN PAKETE — 2 Spalten Mobile, kompakter
// ============================================================================

function CoinPackages() {
  return (
    <section id="preise" className="py-10 sm:py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-brand-50/30 to-white pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[240px] sm:w-[400px] h-[240px] sm:h-[400px] bg-brand-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-20">
          <div className="text-brand-600 font-medium text-[9px] sm:text-xs tracking-[0.3em] uppercase mb-2 sm:mb-6">Mitgliedschaft</div>
          <h2 className="font-display text-lg sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
            Du zahlst nur, <span className="italic text-brand-600">was du gibst</span>
          </h2>
          <p className="mt-2 sm:mt-6 text-xs sm:text-lg text-zinc-600 leading-relaxed">
            Du behältst jederzeit die volle Kontrolle.
          </p>
        </div>

        {/* Packages — 2 Cols Mobile, kompakter */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-7 max-w-6xl mx-auto">
          {COIN_PACKAGES.map((pkg) => (
            <div
              key={pkg.name}
              className={`relative rounded-xl sm:rounded-[2rem] p-3 sm:p-10 transition-all duration-500 ${
                pkg.popular
                  ? 'bg-gradient-to-br from-zinc-900 to-zinc-800 text-white shadow-[0_20px_60px_-15px_rgba(236,72,153,0.25)] md:scale-[1.03]'
                  : 'bg-white border border-zinc-200/80 hover:border-brand-200 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)]'
              }`}
            >
              {pkg.popular && (
                <div className="absolute inset-0 rounded-xl sm:rounded-[2rem] bg-gradient-to-br from-brand-500/5 to-transparent pointer-events-none" />
              )}

              {pkg.popular && (
                <div className="absolute -top-2 sm:-top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[7px] sm:text-[10px] font-semibold tracking-[0.1em] sm:tracking-[0.2em] uppercase px-2 sm:px-3.5 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                  Empfohlen
                </div>
              )}

              <div className="relative">
                <div className={`text-[8px] sm:text-xs font-medium tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-2 sm:mb-5 ${pkg.popular ? 'text-brand-300' : 'text-brand-600'}`}>
                  {pkg.name}
                </div>

                <div className="flex items-baseline gap-0.5 mb-0.5">
                  <span className="font-display text-xl sm:text-5xl font-semibold">{pkg.price}</span>
                  <span className={`text-xs sm:text-lg ${pkg.popular ? 'text-zinc-400' : 'text-zinc-500'}`}>€</span>
                </div>

                <div className={`font-display text-xs sm:text-2xl font-medium mt-2 sm:mt-6 ${pkg.popular ? 'text-zinc-100' : 'text-zinc-800'}`}>
                  {pkg.coins} <span className={`text-[10px] sm:text-base font-sans ${pkg.popular ? 'text-zinc-400' : 'text-zinc-500'}`}>Coins</span>
                </div>

                <Link
                  href="/wallet"
                  className={`block text-center text-[10px] sm:text-base font-semibold py-1.5 sm:py-4 mt-3 sm:mt-10 rounded-full transition-all ${
                    pkg.popular
                      ? 'bg-white text-zinc-900 hover:bg-brand-600 hover:text-white'
                      : 'bg-zinc-900 text-white hover:bg-brand-600'
                  }`}
                >
                  Auswählen
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center mt-5 sm:mt-14 text-[10px] sm:text-sm text-zinc-500 leading-relaxed">
          Alle Preise inkl. MwSt. · SEPA · Kreditkarte · Sofortüberweisung · Paysafecard<br className="sm:hidden" />
          <span className="hidden sm:inline"> · </span>
          <strong className="text-zinc-700">Diskreter Verwendungszweck</strong>
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ — kompakter
// ============================================================================

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-10 sm:py-24 md:py-32 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-14">
          <div className="text-brand-600 font-medium text-[9px] sm:text-xs tracking-[0.3em] uppercase mb-2 sm:mb-5">Fragen</div>
          <h2 className="font-display text-lg sm:text-4xl md:text-5xl font-semibold leading-tight">
            Bevor du loslegst — <span className="italic text-brand-600">vielleicht das</span>
          </h2>
        </div>

        <div className="space-y-0">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="border-t border-zinc-200/60 last:border-b">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className={`w-full py-3 sm:py-7 flex items-center justify-between gap-3 sm:gap-6 text-left group transition-all ${
                    isOpen ? 'translate-x-1' : 'hover:translate-x-1'
                  }`}
                >
                  <span className={`font-display text-xs sm:text-lg md:text-xl transition-all ${
                    isOpen ? 'text-brand-600 font-semibold' : 'text-zinc-900 font-medium group-hover:text-brand-600'
                  }`}>
                    {item.q}
                  </span>
                  <span
                    className={`w-5 h-5 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                      isOpen
                        ? 'rotate-45 bg-brand-600 border-brand-600 text-white shadow-[0_0_20px_-5px_rgba(236,72,153,0.5)]'
                        : 'border-zinc-300/80 text-zinc-500 group-hover:border-brand-400 group-hover:text-brand-600'
                    }`}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" className="sm:w-[11px] sm:h-[11px]">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                <div className={`grid transition-all duration-500 ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-3 sm:pb-7' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="text-zinc-600 leading-relaxed text-xs sm:text-base max-w-2xl">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA — kompakt
// ============================================================================

function FinalCTA() {
  return (
    <section id="final-cta" className="py-10 sm:py-24 md:py-32 bg-soft-gradient relative overflow-hidden">
      <div className="absolute top-[10%] left-[15%] w-[280px] sm:w-[520px] h-[260px] sm:h-[460px] bg-brand-300/30 rounded-[60%] blur-3xl pointer-events-none rotate-12" />
      <div className="absolute bottom-[15%] right-[10%] w-[260px] sm:w-[480px] h-[300px] sm:h-[540px] bg-brand-400/20 rounded-[50%] blur-3xl pointer-events-none -rotate-6" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-1.5 sm:gap-3 mb-3 sm:mb-8 bg-white/70 backdrop-blur rounded-full pl-2 sm:pl-3 pr-3 sm:pr-5 py-1 sm:py-2 border border-brand-200/60">
          <span className="relative flex h-1.5 w-1.5 sm:h-2.5 sm:w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 bg-green-500"></span>
          </span>
          <span className="text-zinc-800 text-[10px] sm:text-sm font-medium">Live · 237 Frauen warten</span>
        </div>

        <h2 className="font-display text-2xl sm:text-5xl md:text-7xl lg:text-8xl font-semibold leading-[1] tracking-tight mb-3 sm:mb-8">
          Sie wartet. <span className="italic text-brand-600 text-xl sm:text-4xl md:text-6xl lg:text-7xl font-medium">Du auch?</span>
        </h2>

        <p className="text-xs sm:text-xl md:text-2xl text-zinc-700 max-w-2xl mx-auto leading-relaxed mb-5 sm:mb-12">
          Registrieren in 30 Sekunden. <strong>Kostenlos starten.</strong>
        </p>

        <Link href="/register" className="group inline-flex items-center gap-1.5 sm:gap-3 bg-brand-600 text-white font-bold px-5 sm:px-12 py-2.5 sm:py-6 rounded-full hover:bg-brand-700 transition-all duration-300 text-xs sm:text-xl shadow-pink-lg hover:scale-105">
          <span>Jetzt schreiben</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform sm:w-[22px] sm:h-[22px]">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="mt-4 sm:mt-10 flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-8 gap-y-1.5 sm:gap-y-3 text-[10px] sm:text-sm text-zinc-500">
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-brand-500 sm:w-3.5 sm:h-3.5">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Kostenlos
          </span>
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-brand-500 sm:w-3.5 sm:h-3.5">
              <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Diskret
          </span>
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-brand-500 sm:w-3.5 sm:h-3.5">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            18+ verifiziert
          </span>
          <span className="flex items-center gap-1">🇩🇪 Made in Germany</span>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FOOTER — kompakter
// ============================================================================

function Footer() {
  return (
    <>
      <div className="h-10 sm:h-24 bg-gradient-to-b from-transparent via-zinc-100/40 to-zinc-950 pointer-events-none -mb-1" />

      <footer id="footer" className="bg-zinc-950 text-zinc-400 py-8 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-8 mb-6 sm:mb-16 pb-6 sm:pb-16 border-b border-zinc-800/60">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-brand-400 sm:w-[22px] sm:h-[22px]">
                  <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-white font-semibold text-[11px] sm:text-sm mb-0">DSGVO-konform</div>
                <div className="text-[9px] sm:text-xs text-zinc-500">Server in DE</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-brand-400 sm:w-[22px] sm:h-[22px]">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <div className="text-white font-semibold text-[11px] sm:text-sm mb-0">SSL-verschlüsselt</div>
                <div className="text-[9px] sm:text-xs text-zinc-500">Ende-zu-Ende</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-400 font-display font-bold text-[11px] sm:text-base">18+</span>
              </div>
              <div>
                <div className="text-white font-semibold text-[11px] sm:text-sm mb-0">Verifiziert</div>
                <div className="text-[9px] sm:text-xs text-zinc-500">Alle Creators</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-brand-400 sm:w-[22px] sm:h-[22px]">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div className="text-white font-semibold text-[11px] sm:text-sm mb-0">24/7 Support</div>
                <div className="text-[9px] sm:text-xs text-zinc-500">Deutsch</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-6 mb-4 sm:mb-10">
            <Link href="/" className="flex items-center gap-1.5">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-display font-semibold text-xs sm:text-sm">v</div>
              <span className="font-display text-base sm:text-xl font-semibold text-white">verliebdich</span>
            </Link>

            <div className="flex flex-wrap gap-x-3 sm:gap-x-6 gap-y-1 text-[10px] sm:text-sm">
              <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
              <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
              <Link href="/agb" className="hover:text-white transition-colors">AGB</Link>
              <Link href="/widerruf" className="hover:text-white transition-colors">Widerruf</Link>
              <a href="mailto:support@verliebdich.com" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>

          <div className="pt-4 sm:pt-8 border-t border-zinc-800/60 text-[9px] sm:text-xs text-zinc-400 leading-relaxed">
            © 2026 verliebdich · Alle Rechte vorbehalten · Ein Service der verliebdich UG (i.G.), Deutschland
          </div>
        </div>
      </footer>
    </>
  );
}

// ============================================================================
// STICKY CTA
// ============================================================================

function StickyCTA() {
  const [visible, setVisible] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };
    window.addEventListener('scroll', onScroll);

    const targets = ['final-cta', 'footer'].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return () => window.removeEventListener('scroll', onScroll);

    const observer = new IntersectionObserver(
      (entries) => {
        const anyInView = entries.some((e) => e.isIntersecting);
        setShouldHide(anyInView);
      },
      { threshold: 0.1 }
    );

    targets.forEach((t) => observer.observe(t));

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const shown = visible && !shouldHide;

  return (
    <div
      className={`fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-40 transition-all duration-500 ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
    >
      <Link
        href="/register"
        className="group inline-flex items-center gap-1.5 sm:gap-2.5 bg-white/85 backdrop-blur-xl text-zinc-900 font-medium px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-full shadow-[0_8px_30px_-8px_rgba(0,0,0,0.15)] border border-zinc-200/60 hover:bg-brand-600 hover:text-white hover:border-brand-600 transition-all"
      >
        <div className="flex -space-x-1.5 sm:-space-x-2">
          <img src="/creators/creator-5.jpg" alt="" className="w-4 h-4 sm:w-6 sm:h-6 rounded-full border-2 border-white object-cover" />
          <img src="/creators/creator-6.jpg" alt="" className="w-4 h-4 sm:w-6 sm:h-6 rounded-full border-2 border-white object-cover" />
          <img src="/creators/creator-8.jpg" alt="" className="w-4 h-4 sm:w-6 sm:h-6 rounded-full border-2 border-white object-cover" />
        </div>
        <span className="text-[11px] sm:text-sm">Schreiben</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-0.5 transition-transform sm:w-3.5 sm:h-3.5">
          <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

// ============================================================================
// EXIT INTENT
// ============================================================================

function ExitIntent() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const alreadyShown = sessionStorage.getItem('verliebdich_exit_shown');
    if (alreadyShown) {
      setDismissed(true);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !show && !dismissed) {
        setShow(true);
        sessionStorage.setItem('verliebdich_exit_shown', '1');
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 5000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [show, dismissed]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-4 animate-fade-up">
      <div className="max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img src="/creators/creator-5.jpg" alt="Lina" className="w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
          <button
            onClick={() => setShow(false)}
            className="absolute top-3 right-3 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/95 text-zinc-700 flex items-center justify-center hover:bg-white transition-colors"
            aria-label="Schließen"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="sm:w-4 sm:h-4">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <div className="text-[9px] sm:text-xs uppercase tracking-widest opacity-80">Berlin · 24</div>
            <div className="font-display text-xl sm:text-3xl font-semibold">Lina</div>
          </div>
        </div>

        <div className="p-5 sm:p-8 text-center">
          <h3 className="font-display text-base sm:text-2xl md:text-3xl font-semibold mb-2 leading-tight">
            Warte — sie schreibt <span className="italic text-brand-600">dir gerade.</span>
          </h3>
          <p className="text-zinc-600 mb-4 sm:mb-6 text-[11px] sm:text-sm leading-relaxed">
            Geh nicht, ohne sie kennenzulernen.
          </p>
          <Link
            href="/register"
            className="block w-full bg-brand-600 text-white text-xs sm:text-base font-semibold py-2.5 sm:py-4 rounded-full hover:bg-brand-700 transition-all shadow-pink-lg mb-2"
          >
            Schauen, was sie schreibt
          </Link>
          <button
            onClick={() => setShow(false)}
            className="text-zinc-500 text-[11px] sm:text-sm hover:text-zinc-900 transition-colors"
          >
            Nein danke, ich gehe
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CITY MATCH RESULT
// ============================================================================

function CityMatchResult({ city }: { city: string }) {
  return (
    <section id="nahe" className="py-8 sm:py-20 md:py-28 bg-gradient-to-b from-brand-50/40 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center animate-fade-up">
        <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-0.5 sm:py-1.5 rounded-full bg-brand-600 text-white text-[10px] sm:text-sm font-medium mb-3 sm:mb-8">
          ✨ Treffer in {city}
        </div>
        <h2 className="font-display text-lg sm:text-4xl md:text-5xl font-semibold leading-tight mb-2 sm:mb-6">
          <span className="text-brand-600">4 Frauen</span> in der Nähe von <span className="italic">{city}</span> warten <span className="italic text-brand-600">jetzt</span>
        </h2>
        <p className="text-xs sm:text-lg text-zinc-600 mb-5 sm:mb-10 leading-relaxed max-w-xl mx-auto">
          Registriere dich kostenlos und sieh, wer in deiner Nähe gerade da ist.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 sm:gap-3 bg-brand-600 text-white font-semibold px-5 sm:px-10 py-2.5 sm:py-5 rounded-full hover:bg-brand-700 transition-all shadow-pink-lg text-xs sm:text-lg group"
        >
          <span>Treffer kostenlos ansehen</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform sm:w-5 sm:h-5">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN
// ============================================================================

export default function HomePage() {
  const [ageConfirmed, setAgeConfirmed] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [matchedCity, setMatchedCity] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem('verliebdich_age_ok');
    if (!stored) setAgeConfirmed(false);
  }, []);

  const confirmAge = () => {
    sessionStorage.setItem('verliebdich_age_ok', '1');
    setAgeConfirmed(true);
  };

  const handleCityFound = (city: string) => {
    setMatchedCity(city);
    setTimeout(() => {
      document.getElementById('nahe')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <>
      {mounted && !ageConfirmed && <AgeGate onConfirm={confirmAge} />}
      {mounted && ageConfirmed && <ExitIntent />}
      <Header />
      <main id="top">
        <Hero onCityFound={handleCityFound} />
        {matchedCity && <CityMatchResult city={matchedCity} />}
        <LiveStrip />
        <PremiumLocks />
        <ProfileShowcase />
        <CoinPackages />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <StickyCTA />
    </>
  );
}
