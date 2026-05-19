'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================================================
// DEMO-DATEN — 6 echte Frauen
// ============================================================================

const FRAUEN = [
  {
    id: 'lara',
    name: 'Lara',
    age: 24,
    city: 'Berlin',
    image: '/profiles/frau-1-lara/01-haupt.jpg',
    online: true,
    mood: 'Diskret',
    bio: 'Bin eher zurückhaltend am Anfang. Wenn ich mich wohl fühle, taue ich auf.',
    today: 'Bin heute Abend da.',
    likes: ['Lange Nachrichten', 'Klartext', 'Späte Abende', 'Wein', 'Ehrliche Komplimente'],
    looking: ['Lockeres Dating', 'Lange Gespräche', 'Sexting', 'Flirten ohne Druck'],
  },
  {
    id: 'valentina',
    name: 'Valentina',
    age: 25,
    city: 'München',
    image: '/profiles/frau-2-valentina/01-haupt.jpg',
    online: true,
    mood: 'Direkt',
    bio: 'Ich rede Klartext. Hab keine Lust auf Spielchen oder Standard-Sprüche. Wenn du echt bist, bin ich\'s auch.',
    today: 'Bock auf was zwischendurch.',
    likes: ['Klartext', 'Schlagfertige Männer', 'Tanzen', 'Frecher Humor', 'Spontaneität'],
    looking: ['Kennenlernen', 'Lockeres Dating', 'Offen für ONS', 'Flirten ohne Druck'],
  },
  {
    id: 'mia',
    name: 'Mia',
    age: 23,
    city: 'Hamburg',
    image: '/profiles/frau-3-mia/01-haupt.jpg',
    online: true,
    mood: 'Cool',
    bio: 'Schreib mich einfach an :)',
    today: 'online',
    likes: ['Musik', 'Späte Nächte', 'Klartext', 'Spontaneität'],
    looking: ['Kennenlernen', 'Sexting', 'Lange Gespräche', 'Flirten ohne Druck'],
  },
  {
    id: 'sophia',
    name: 'Sophia',
    age: 26,
    city: 'Frankfurt',
    image: '/profiles/frau-4-sophia/01-haupt.png',
    online: true,
    mood: 'Sportlich',
    bio: 'Sport, Musik, Wein. Mehr brauch ich nicht. Suche jemanden zum Quatschen oder mehr — kommt drauf an.',
    today: 'hab Bock.',
    likes: ['Sport', 'Tanzen', 'Klartext', 'Frecher Humor', 'Schlagfertige Männer'],
    looking: ['Lockeres Dating', 'Offen für ONS', 'Sexting', 'Flirten ohne Druck'],
  },
  {
    id: 'elena',
    name: 'Elena',
    age: 29,
    city: 'Düsseldorf',
    image: '/profiles/frau-5-elena/01-haupt.jpg',
    online: false,
    mood: 'Reif',
    bio: 'Ich bin 29 und weiß was ich will. Keine Lust auf Jungs, die noch nicht wissen wer sie sind.',
    today: 'Glas Wein, gemütlicher Abend.',
    likes: ['Lange Gespräche', 'Klartext', 'Wein-Abende', 'Ehrliche Komplimente', 'Echte Männer'],
    looking: ['Kennenlernen', 'Lockeres Dating', 'Sexting', 'Lange Gespräche'],
  },
  {
    id: 'sarah',
    name: 'Sarah',
    age: 31,
    city: 'Köln',
    image: '/profiles/frau-6-sarah/01-haupt.jpg',
    online: true,
    mood: 'Sophisticated',
    bio: 'Ich rede gern. Aber manchmal höre ich auch einfach nur zu. Spannend wird\'s für mich, wenn ein Gespräch nicht oberflächlich bleibt.',
    today: 'Hab Lust auf was Echtes.',
    likes: ['Lange Gespräche', 'Bücher', 'Wein', 'Klartext', 'Späte Chats'],
    looking: ['Kennenlernen', 'Lange Gespräche', 'Flirten ohne Druck', 'Sexting'],
  },
];

// Featured-Profile = Valentina
const FEATURED = FRAUEN.find((f) => f.id === 'valentina')!;

// Premium-Locks — bleibt wie es ist (alte KI-Bilder, ist Platzhalter)
const PREMIUM_LOCKS = [
  { name: 'Lara', image: '/creators/creator-real-1-blurred.jpg', coins: 5, label: 'Exklusiv für dich' },
  { name: 'Sophia', image: '/creators/creator-real-2-blurred.jpg', coins: 10, label: 'Privater Moment' },
  { name: 'Elena', image: '/creators/creator-real-3-blurred.jpg', coins: 8, label: 'Persönliche Einblicke' },
];

// TODO: Vor Live-Launch durch echte Reviews ersetzen sobald Beta-Tester da sind
const TESTIMONIALS = [
  { name: 'Markus', age: 38, city: 'Berlin', text: 'Endlich eine Plattform, die nicht nach Standard-Bot wirkt. Die Gespräche fühlen sich persönlicher und echter an.', rating: 5 },
  { name: 'Thomas', age: 42, city: 'München', text: 'Hatte mich schon abgewöhnt, sowas zu nutzen — zu viele Fakes überall. Hier wirkt es seriöser, die Profile sind geprüft.', rating: 5 },
  { name: 'Daniel', age: 35, city: 'Hamburg', text: 'Was ich am meisten schätze: keine versteckten Kosten. Ich zahle pro Nachricht und weiß immer, was ich tue. Kein Abo-Wahnsinn.', rating: 5 },
  { name: 'Sebastian', age: 45, city: 'Köln', text: 'Klare Sache: deutsche Plattform, deutsche Server, deutsche Sprache. Und Gespräche, die sich persönlich anfühlen.', rating: 5 },
  { name: 'Florian', age: 31, city: 'Frankfurt', text: 'Habe einige andere Seiten ausprobiert. Hier ist es einfach ehrlicher und persönlicher. Punkt.', rating: 5 },
];

// ============================================================================
// AGE GATE — unscharfer Hintergrund statt schwarz
// ============================================================================

function AgeGate({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-2xl p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl p-6 sm:p-8 shadow-2xl text-center animate-fade-up border border-zinc-200/60">
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
// LOGO
// ============================================================================

function Logo({ size = 'normal', white = false }: { size?: 'small' | 'normal' | 'large'; white?: boolean }) {
  const heartSize = size === 'small' ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : size === 'large' ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-3.5 h-3.5 sm:w-4 sm:h-4';
  const textSize = size === 'small' ? 'text-base sm:text-lg' : size === 'large' ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-2xl';
  const textColor = white ? 'text-white' : 'text-zinc-900';

  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2 group">
      <svg
        viewBox="0 0 24 24"
        className={`${heartSize} text-brand-600 group-hover:scale-110 transition-transform`}
        fill="currentColor"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span className={`font-display ${textSize} font-semibold tracking-tight ${textColor}`}>
        verliebdich
      </span>
    </span>
  );
}

// ============================================================================
// HEADER
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
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-700">
          <a href="#live" className="hover:text-brand-600 transition-colors flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </a>
          <Link href="/explore" className="hover:text-brand-600 transition-colors">Profile</Link>
          <a href="#erfahrungen" className="hover:text-brand-600 transition-colors">Erfahrungen</a>
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
// HERO
// ============================================================================

function Hero({ onCityFound }: { onCityFound: (city: string) => void }) {
  const [onlineCount, setOnlineCount] = useState(237);
  const [city, setCity] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => prev + (Math.random() > 0.5 ? 1 : -1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleCitySubmit = () => {
    if (city.trim().length > 1) onCityFound(city.trim());
  };

  return (
    <section className="relative overflow-hidden pt-16 sm:pt-24 pb-6 sm:pb-14 bg-soft-gradient">
      <div className="absolute top-[15%] -left-20 sm:-left-32 w-[280px] sm:w-[520px] h-[320px] sm:h-[560px] bg-brand-300/30 rounded-[50%] blur-3xl pointer-events-none rotate-12" />
      <div className="absolute bottom-[10%] right-[-15%] w-[340px] sm:w-[640px] h-[300px] sm:h-[540px] bg-brand-400/20 rounded-[60%] blur-3xl pointer-events-none -rotate-6" />

      <div className="relative max-w-3xl mx-auto px-5 sm:px-6 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 mb-4 sm:mb-6 bg-white/70 backdrop-blur rounded-full pl-2.5 sm:pl-3 pr-4 sm:pr-5 py-1 sm:py-2 border border-brand-200/60">
          <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-green-500"></span>
          </span>
          <span className="text-zinc-800 text-[11px] sm:text-sm font-medium">
            <span className="font-display text-brand-700 font-bold tabular-nums">{onlineCount}</span> Frauen jetzt online
          </span>
        </div>

        <h1 className="font-display font-semibold leading-[1.05] tracking-tight text-zinc-900 mb-3 sm:mb-5">
          <span className="block text-[2rem] sm:text-5xl md:text-6xl">
            Sie ist <span className="italic text-brand-600/90 font-medium">online</span>.
          </span>
          <span className="block text-[2rem] sm:text-5xl md:text-6xl mt-0.5 sm:mt-1">
            Du musst nur schreiben.
          </span>
        </h1>

        <p className="text-xs sm:text-base text-zinc-700 max-w-xl mx-auto sm:mx-0 leading-relaxed mb-5 sm:mb-8">
          Starte diskret in wenigen Sekunden und entdecke geprüfte Profile in deiner Nähe.
        </p>

        <div className="max-w-md mx-auto sm:mx-0">
          <label className="block text-[10px] sm:text-xs font-medium tracking-[0.2em] uppercase text-brand-600 mb-1.5 sm:mb-2.5">
            Singles in deiner Nähe?
          </label>
          <div className="flex flex-col gap-1.5 bg-white rounded-xl sm:rounded-2xl p-1.5 shadow-[0_4px_24px_-8px_rgba(236,72,153,0.15)] border border-zinc-200/80">
            <div className="flex items-center gap-2 flex-1 px-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-zinc-400 flex-shrink-0">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" fill="currentColor" />
              </svg>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCitySubmit()}
                placeholder="Deine Stadt"
                className="flex-1 py-2 sm:py-2.5 text-sm bg-transparent text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>
            <button
              onClick={handleCitySubmit}
              className="bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg sm:rounded-xl hover:bg-brand-700 transition-all whitespace-nowrap"
            >
              Profile in deiner Nähe finden
            </button>
          </div>

          <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-[10px] sm:text-xs text-zinc-500">
            <span className="flex items-center gap-1"><span className="text-brand-600">·</span> Kein Abo</span>
            <span className="flex items-center gap-1"><span className="text-brand-600">·</span> 100% diskret</span>
            <span className="flex items-center gap-1"><span className="text-brand-600">·</span> 18+ verifiziert</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// LIVE STRIP — echte Frauen, Mobile 2-Spalten-Grid
// ============================================================================

function LiveStrip() {
  const onlineFrauen = FRAUEN.filter((f) => f.online);

  return (
    <section id="live" className="py-8 sm:py-16 bg-white border-y border-zinc-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-4 sm:mb-7 gap-3">
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500"></span>
              </span>
              <span className="text-green-700 font-semibold text-[9px] sm:text-xs tracking-[0.2em] uppercase">Gerade aktiv</span>
            </div>
            <h2 className="font-display text-lg sm:text-3xl md:text-4xl font-semibold leading-tight">
              Diese Frauen sind <span className="italic text-brand-600">jetzt online</span>
            </h2>
          </div>
          <Link href="/explore" className="text-[11px] sm:text-sm text-zinc-500 hover:text-brand-600 transition-colors font-medium whitespace-nowrap mb-0.5">
            Alle →
          </Link>
        </div>

        {/* MOBILE: 2-Spalten-Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:hidden">
          {onlineFrauen.slice(0, 4).map((f) => (
            <Link key={f.id} href="/register" className="group relative">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow group-hover:shadow-pink-lg transition-all">
                <img src={f.image} alt={f.name} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                <div className="absolute top-2 left-2">
                  <span className="flex items-center gap-1 bg-white/95 backdrop-blur text-zinc-900 text-[9px] font-semibold px-1.5 py-0.5 rounded-full shadow">
                    <span className="relative flex h-1 w-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1 w-1 bg-green-500"></span>
                    </span>
                    Online
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                  <div className="font-display text-base font-semibold leading-tight">{f.name} · {f.age}</div>
                  <div className="text-[9px] opacity-75 flex items-center gap-0.5">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                    {f.city}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="sm:hidden mt-3 text-center">
          <Link href="/explore" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600">
            <span>Alle {FRAUEN.length} Profile entdecken</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        {/* DESKTOP: horizontaler Scroll */}
        <div
          className="hidden sm:flex gap-4 overflow-x-auto pb-3 -mx-6 px-6 snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            div::-webkit-scrollbar { display: none; }
          `}</style>
          {FRAUEN.map((f) => (
            <Link key={f.id} href="/register" className="group flex-shrink-0 w-[300px] snap-start relative">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow group-hover:shadow-pink-lg transition-all">
                <img src={f.image} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                <div className="absolute top-3 left-3">
                  {f.online ? (
                    <span className="flex items-center gap-1 bg-white/95 backdrop-blur text-zinc-900 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-zinc-100/90 backdrop-blur text-zinc-500 text-[11px] font-medium px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      Offline
                    </span>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                  <div className="font-display text-2xl font-semibold mb-0">{f.name} · {f.age}</div>
                  <div className="text-xs opacity-75 mb-3 flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                    {f.city}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase bg-white/15 backdrop-blur px-2 py-0.5 rounded-full">
                    {f.mood}
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
// PREMIUM LOCKS
// ============================================================================

function PremiumLocks() {
  return (
    <section className="py-10 sm:py-20 bg-zinc-900 text-white relative overflow-hidden">
      <div className="absolute top-[15%] left-[20%] w-[220px] sm:w-[420px] h-[260px] sm:h-[480px] bg-brand-600/25 rounded-[55%] blur-3xl pointer-events-none rotate-12" />
      <div className="absolute bottom-[10%] right-[15%] w-[200px] sm:w-[380px] h-[220px] sm:h-[420px] bg-brand-700/20 rounded-[45%] blur-3xl pointer-events-none -rotate-6" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-12">
          <div className="text-brand-400 font-medium text-[9px] sm:text-xs tracking-[0.3em] uppercase mb-2 sm:mb-4">Privat</div>
          <h2 className="font-display text-xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
            Nicht alles ist <span className="italic text-brand-400">öffentlich</span>
          </h2>
          <p className="mt-2 sm:mt-4 text-zinc-300 leading-relaxed text-xs sm:text-base max-w-lg mx-auto">
            Manche Momente siehst du erst, wenn du wirklich neugierig bist.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-5 max-w-5xl mx-auto">
          {PREMIUM_LOCKS.map((lock, i) => (
            <div key={i} className="group relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
              <img src={lock.image} alt="Privat" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/40" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-md rounded-full w-9 h-9 sm:w-14 sm:h-14 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white sm:w-[22px] sm:h-[22px]">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-5">
                <div className="text-[7px] sm:text-[10px] font-bold tracking-[0.15em] uppercase text-brand-400 mb-0.5 line-clamp-1">{lock.label}</div>
                <div className="font-display text-xs sm:text-xl font-semibold mb-1 sm:mb-2">Von {lock.name}</div>
                <Link href="/register" className="inline-block bg-white/10 backdrop-blur-md text-white font-semibold text-[8px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full border border-white/20 hover:bg-white/20 transition-all whitespace-nowrap">
                  🔓 {lock.coins} Coins
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center mt-5 sm:mt-10 text-zinc-400 text-[10px] sm:text-sm">
          Diskret · Freiwillig · Ohne Verpflichtung
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// PROFILE SHOWCASE — Valentina featured, Bild LINKS, Daten RECHTS
// ============================================================================

function ProfileShowcase() {
  return (
    <section id="profile-showcase" className="py-10 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-12">
          <div className="text-brand-600 font-medium text-[9px] sm:text-xs tracking-[0.3em] uppercase mb-2 sm:mb-4">Profile</div>
          <h2 className="font-display text-xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
            Lern sie kennen, <span className="italic text-brand-600">bevor du schreibst</span>
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-3 sm:gap-10 items-start max-w-6xl mx-auto">
          {/* Bild LINKS */}
          <div className="col-span-5">
            <div className="relative aspect-[4/5] rounded-lg sm:rounded-3xl overflow-hidden shadow-lg sm:shadow-xl">
              <img src={FEATURED.image} alt={FEATURED.name} className="w-full h-full object-cover" />
              <div className="absolute top-1.5 left-1.5 sm:top-4 sm:left-4 flex items-center gap-1 sm:gap-2 bg-white/95 backdrop-blur px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full shadow-lg">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500"></span>
                </span>
                <span className="text-[8px] sm:text-xs font-semibold text-zinc-900">Online</span>
              </div>
            </div>
          </div>

          {/* Profil-Details RECHTS */}
          <div className="col-span-7">
            <div className="mb-3 sm:mb-6">
              <div className="font-display text-lg sm:text-4xl md:text-5xl font-semibold leading-tight">{FEATURED.name} · {FEATURED.age}</div>
              <div className="text-[10px] sm:text-base text-zinc-500 flex items-center gap-0.5 mt-0.5">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" className="sm:w-3.5 sm:h-3.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                {FEATURED.city}
              </div>
            </div>

            <div className="mb-3 sm:mb-6">
              <div className="text-[8px] sm:text-xs font-medium tracking-[0.15em] sm:tracking-[0.2em] uppercase text-brand-600 mb-1 sm:mb-2.5">Über mich</div>
              <p className="text-[10px] sm:text-base text-zinc-700 leading-relaxed italic">"{FEATURED.bio}"</p>
            </div>

            <div className="mb-3 sm:mb-6">
              <div className="text-[8px] sm:text-xs font-medium tracking-[0.15em] sm:tracking-[0.2em] uppercase text-brand-600 mb-1 sm:mb-2.5">Worauf ich stehe</div>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {FEATURED.likes.map((like) => (
                  <span key={like} className="px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full bg-zinc-100 text-zinc-800 text-[9px] sm:text-sm font-medium">
                    {like}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3 sm:mb-6">
              <div className="text-[8px] sm:text-xs font-medium tracking-[0.15em] sm:tracking-[0.2em] uppercase text-brand-600 mb-1 sm:mb-2.5">Was ich suche</div>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {FEATURED.looking.map((item) => (
                  <span key={item} className="px-1.5 sm:px-3 py-0.5 sm:py-1.5 rounded-full bg-brand-50 border border-brand-200/60 text-brand-700 text-[9px] sm:text-sm font-medium">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4 sm:mb-7 p-2 sm:p-4 rounded-md sm:rounded-2xl bg-gradient-to-br from-brand-50/60 to-transparent border border-brand-100/60">
              <div className="text-[8px] sm:text-xs font-medium tracking-[0.15em] sm:tracking-[0.2em] uppercase text-brand-600 mb-0.5 sm:mb-1.5">Heute</div>
              <p className="text-[10px] sm:text-base text-zinc-800 italic">"{FEATURED.today}"</p>
            </div>

            <Link href="/explore" className="group inline-flex items-center gap-1 sm:gap-2 text-[11px] sm:text-base text-zinc-900 font-semibold hover:text-brand-600 transition-colors">
              <span>Mehr Profile entdecken</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform sm:w-[18px] sm:h-[18px]">
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
// TESTIMONIALS — Erfahrungen
// ============================================================================

function Testimonials() {
  return (
    <section id="erfahrungen" className="py-10 sm:py-20 bg-gradient-to-b from-white via-brand-50/30 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10">
          <div className="text-brand-600 font-medium text-[9px] sm:text-xs tracking-[0.3em] uppercase mb-1.5 sm:mb-3">Erfahrungen</div>
          <h2 className="font-display text-xl sm:text-4xl md:text-5xl font-semibold leading-tight">
            Das sagen <span className="italic text-brand-600">unsere Nutzer</span>
          </h2>
        </div>

        <div
          className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 overflow-x-auto sm:overflow-visible pb-3 sm:pb-0 -mx-4 sm:mx-0 px-4 sm:px-0 snap-x snap-mandatory sm:snap-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style jsx>{`
            div::-webkit-scrollbar { display: none; }
          `}</style>
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className="flex-shrink-0 sm:flex-shrink w-[260px] sm:w-auto snap-start bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-zinc-200/60 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_10px_40px_-15px_rgba(236,72,153,0.15)] transition-all"
            >
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, idx) => (
                  <svg key={idx} width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-brand-500 sm:w-4 sm:h-4">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                ))}
              </div>

              <p className="text-zinc-700 text-xs sm:text-base leading-relaxed italic mb-4 sm:mb-5">
                "{t.text}"
              </p>

              <div className="flex items-center gap-2.5 pt-3 sm:pt-4 border-t border-zinc-100">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-brand-700 font-display font-bold text-xs sm:text-base">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-zinc-900 text-xs sm:text-sm">{t.name}, {t.age}</div>
                  <div className="text-[10px] sm:text-xs text-zinc-500 flex items-center gap-1">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="sm:w-2.5 sm:h-2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                    {t.city}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center mt-5 sm:mt-8 text-[9px] sm:text-[11px] text-zinc-400 leading-relaxed max-w-xl mx-auto px-4">
          Beispielhafte Nutzererfahrungen. Eigene Bewertungen kannst du nach deiner Registrierung abgeben.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// FINAL CTA
// ============================================================================

function FinalCTA() {
  return (
    <section id="final-cta" className="py-10 sm:py-20 bg-soft-gradient relative overflow-hidden">
      <div className="absolute top-[10%] left-[15%] w-[240px] sm:w-[520px] h-[220px] sm:h-[460px] bg-brand-300/30 rounded-[60%] blur-3xl pointer-events-none rotate-12" />
      <div className="absolute bottom-[15%] right-[10%] w-[220px] sm:w-[480px] h-[260px] sm:h-[540px] bg-brand-400/20 rounded-[50%] blur-3xl pointer-events-none -rotate-6" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-1.5 sm:gap-3 mb-3 sm:mb-6 bg-white/70 backdrop-blur rounded-full pl-2 sm:pl-3 pr-3 sm:pr-5 py-1 sm:py-2 border border-brand-200/60">
          <span className="relative flex h-1.5 w-1.5 sm:h-2.5 sm:w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2.5 sm:w-2.5 bg-green-500"></span>
          </span>
          <span className="text-zinc-800 text-[10px] sm:text-sm font-medium">237 Frauen gerade aktiv</span>
        </div>

        <h2 className="font-display text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight mb-3 sm:mb-6">
          Sie ist online. <span className="block sm:inline italic text-brand-600 text-xl sm:text-4xl md:text-5xl lg:text-6xl font-medium mt-1 sm:mt-0">Schreib ihr.</span>
        </h2>

        <p className="text-xs sm:text-lg md:text-xl text-zinc-700 max-w-2xl mx-auto leading-relaxed mb-5 sm:mb-10">
          Registrieren in 30 Sekunden. <strong>Kostenlos starten.</strong>
        </p>

        <Link href="/register" className="group inline-flex items-center gap-1.5 sm:gap-3 bg-brand-600 text-white font-bold px-6 sm:px-10 py-3 sm:py-5 rounded-full hover:bg-brand-700 transition-all duration-300 text-sm sm:text-lg shadow-pink-lg hover:scale-105">
          <span>Jetzt schreiben</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform sm:w-[20px] sm:h-[20px]">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="mt-4 sm:mt-8 flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-6 gap-y-1.5 text-[10px] sm:text-sm text-zinc-500">
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-brand-500 sm:w-3 sm:h-3">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Kostenlos
          </span>
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-brand-500 sm:w-3 sm:h-3">
              <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Diskret
          </span>
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-brand-500 sm:w-3 sm:h-3">
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
// FOOTER
// ============================================================================

function Footer() {
  return (
    <>
      <div className="h-12 sm:h-24 bg-gradient-to-b from-transparent via-zinc-100/40 to-zinc-950 pointer-events-none -mb-1" />

      <footer id="footer" className="bg-zinc-950 text-zinc-400 py-8 sm:py-16 pb-24 sm:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-8 mb-6 sm:mb-12 pb-6 sm:pb-12 border-b border-zinc-800/60">
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
                <div className="text-[9px] sm:text-xs text-zinc-500">Alle Profile</div>
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

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-6 mb-4 sm:mb-8">
            <Link href="/" className="flex items-center">
              <Logo size="small" white />
            </Link>

            <div className="flex flex-wrap gap-x-3 sm:gap-x-6 gap-y-1 text-[10px] sm:text-sm">
              <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
              <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
              <Link href="/agb" className="hover:text-white transition-colors">AGB</Link>
              <Link href="/widerruf" className="hover:text-white transition-colors">Widerruf</Link>
              <a href="mailto:support@verliebdich.com" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>

          <div className="pt-4 sm:pt-6 border-t border-zinc-800/60 text-[9px] sm:text-xs text-zinc-400 leading-relaxed">
            © 2026 verliebdich · Alle Rechte vorbehalten · Ein Service der verliebdich UG (i.G.), Deutschland
          </div>
        </div>
      </footer>
    </>
  );
}

// ============================================================================
// STICKY CTA — Mitscrollend, versteckt in Profile-Showcase, Final-CTA, Footer
// ============================================================================

function StickyCTA() {
  const [visible, setVisible] = useState(false);
  const [shouldHide, setShouldHide] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.3);
    };
    window.addEventListener('scroll', onScroll);
    onScroll();

    const targets = ['profile-showcase', 'final-cta', 'footer'].map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return () => window.removeEventListener('scroll', onScroll);

    const observer = new IntersectionObserver(
      (entries) => {
        const anyInView = entries.some((e) => e.isIntersecting);
        setShouldHide(anyInView);
      },
      { threshold: 0.15 }
    );

    targets.forEach((t) => observer.observe(t));

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const shown = visible && !shouldHide;

  return (
    <>
      {/* Desktop */}
      <div
        className={`hidden sm:block fixed bottom-5 right-5 z-40 transition-all duration-500 ${
          shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <Link
          href="/register"
          className="group inline-flex items-center gap-2.5 bg-brand-600 text-white font-semibold px-5 py-3 rounded-full shadow-[0_12px_40px_-8px_rgba(236,72,153,0.5)] hover:bg-brand-700 transition-all hover:scale-105"
        >
          <div className="flex -space-x-2">
            <img src="/profiles/frau-2-valentina/01-haupt.jpg" alt="" className="w-6 h-6 rounded-full border-2 border-white object-cover" />
            <img src="/profiles/frau-6-sarah/01-haupt.jpg" alt="" className="w-6 h-6 rounded-full border-2 border-white object-cover" />
            <img src="/profiles/frau-3-mia/01-haupt.jpg" alt="" className="w-6 h-6 rounded-full border-2 border-white object-cover" />
          </div>
          <span className="text-sm">Jetzt schreiben</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-0.5 transition-transform">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Mobile — schwebt höher (bottom-20 statt 0) */}
      <div
        className={`sm:hidden fixed left-3 right-3 z-40 transition-all duration-500 ${
          shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'
        }`}
        style={{ bottom: '5rem' }}
      >
        <Link
          href="/register"
          className="group flex items-center justify-between gap-2 bg-brand-600 text-white font-semibold px-4 py-3.5 rounded-full shadow-[0_8px_32px_-4px_rgba(236,72,153,0.6)] hover:bg-brand-700 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2">
              <img src="/profiles/frau-2-valentina/01-haupt.jpg" alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
              <img src="/profiles/frau-6-sarah/01-haupt.jpg" alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
              <img src="/profiles/frau-3-mia/01-haupt.jpg" alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
            </div>
            <span className="text-sm font-semibold">Jetzt schreiben</span>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="group-hover:translate-x-1 transition-transform">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </>
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
          <img src={FEATURED.image} alt={FEATURED.name} className="w-full h-full object-cover" />
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
            <div className="text-[9px] sm:text-xs uppercase tracking-widest opacity-80">{FEATURED.city} · {FEATURED.age}</div>
            <div className="font-display text-xl sm:text-3xl font-semibold">{FEATURED.name}</div>
          </div>
        </div>

        <div className="p-5 sm:p-8 text-center">
          <h3 className="font-display text-base sm:text-2xl md:text-3xl font-semibold mb-2 leading-tight">
            Warte — sie ist gerade <span className="italic text-brand-600">aktiv.</span>
          </h3>
          <p className="text-zinc-600 mb-4 sm:mb-6 text-[11px] sm:text-sm leading-relaxed">
            Geh nicht, ohne sie kennenzulernen.
          </p>
          <Link
            href="/register"
            className="block w-full bg-brand-600 text-white text-xs sm:text-base font-semibold py-2.5 sm:py-4 rounded-full hover:bg-brand-700 transition-all shadow-pink-lg mb-2"
          >
            Profil ansehen
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
// CITY MATCH
// ============================================================================

function CityMatchResult({ city }: { city: string }) {
  return (
    <section id="nahe" className="py-6 sm:py-16 bg-gradient-to-b from-brand-50/40 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center animate-fade-up">
        <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-4 py-0.5 sm:py-1.5 rounded-full bg-brand-600 text-white text-[10px] sm:text-sm font-medium mb-3 sm:mb-6">
          ✨ Treffer in {city}
        </div>
        <h2 className="font-display text-lg sm:text-4xl md:text-5xl font-semibold leading-tight mb-2 sm:mb-5">
          <span className="text-brand-600">4 Profile</span> in der Nähe von <span className="italic">{city}</span> <span className="italic text-brand-600">gerade aktiv</span>
        </h2>
        <p className="text-xs sm:text-base text-zinc-600 mb-4 sm:mb-8 leading-relaxed max-w-xl mx-auto">
          Registriere dich kostenlos und sieh, wer in deiner Nähe gerade online ist.
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-1.5 sm:gap-3 bg-brand-600 text-white font-semibold px-5 sm:px-8 py-2.5 sm:py-4 rounded-full hover:bg-brand-700 transition-all shadow-pink-lg text-xs sm:text-base group"
        >
          <span>Profile kostenlos ansehen</span>
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
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
      <StickyCTA />
    </>
  );
}
