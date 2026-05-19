'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setTokens, APIError } from '@/lib/api';

// ============================================================================
// DACH-Städte für Autocomplete (Top 50)
// ============================================================================
const STADTE_DACH = [
  'Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt am Main', 'Stuttgart',
  'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hannover',
  'Nürnberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster',
  'Mannheim', 'Karlsruhe', 'Augsburg', 'Wiesbaden', 'Mönchengladbach', 'Gelsenkirchen',
  'Aachen', 'Braunschweig', 'Kiel', 'Chemnitz', 'Halle', 'Magdeburg', 'Freiburg',
  'Krefeld', 'Mainz', 'Lübeck', 'Erfurt', 'Oberhausen', 'Rostock', 'Kassel',
  'Hagen', 'Potsdam', 'Saarbrücken', 'Heidelberg', 'Regensburg', 'Ingolstadt',
  // Österreich
  'Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt',
  // Schweiz
  'Zürich', 'Genf', 'Basel', 'Bern', 'Lausanne', 'Luzern',
];

const errorMessages: Record<string, string> = {
  email_already_registered: 'Diese E-Mail ist bereits registriert.',
  invalid_email: 'Bitte gib eine gültige E-Mail-Adresse ein.',
  password_too_short: 'Passwort muss mindestens 8 Zeichen lang sein.',
};

// ============================================================================
// LOGO
// ============================================================================
function Logo({ white = false }: { white?: boolean }) {
  const textColor = white ? 'text-white' : 'text-zinc-900';
  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2 group">
      <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span className={`font-display text-xl sm:text-2xl font-semibold tracking-tight ${textColor}`}>
        verliebdich
      </span>
    </span>
  );
}

// ============================================================================
// WELCOME SCREEN — nach erfolgreichem Register, 2.5s lang
// ============================================================================
function WelcomeScreen({ name }: { name: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-4 animate-fade-up">
      <div className="max-w-md w-full text-center">
        {/* Animiertes Herz */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0 bg-brand-400/40 blur-3xl rounded-full animate-pulse" />
          <svg viewBox="0 0 24 24" className="relative w-16 h-16 sm:w-20 sm:h-20 text-brand-600 animate-pulse" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>

        <h1 className="font-display text-3xl sm:text-5xl font-semibold tracking-tight mb-3 leading-tight">
          Willkommen{name ? `, ${name}` : ''} <span className="italic text-brand-600">bei verliebdich.</span>
        </h1>
        <p className="text-zinc-600 text-sm sm:text-base mb-8 leading-relaxed">
          Wir bringen dich gleich zu den Profilen…
        </p>

        {/* Loading-Spinner */}
        <div className="inline-flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REGISTER PAGE
// ============================================================================
export default function RegisterPage() {
  const router = useRouter();

  // Form-State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [confirmAdult, setConfirmAdult] = useState(false);
  const [confirmAgb, setConfirmAgb] = useState(false);

  // UI-State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // Autocomplete-State
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const cityInputRef = useRef<HTMLDivElement>(null);

  // Autocomplete-Logik
  useEffect(() => {
    if (city.length < 1) {
      setCitySuggestions([]);
      return;
    }
    const filtered = STADTE_DACH.filter((s) =>
      s.toLowerCase().startsWith(city.toLowerCase())
    ).slice(0, 6);
    setCitySuggestions(filtered);
  }, [city]);

  // Klick außerhalb → Suggestions schließen
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityInputRef.current && !cityInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!confirmAdult) {
      setError('Bitte bestätige, dass du volljährig bist.');
      return;
    }
    if (!confirmAgb) {
      setError('Bitte akzeptiere die AGB und Datenschutzerklärung.');
      return;
    }
    if (!city.trim()) {
      setError('Bitte gib deine Stadt an.');
      return;
    }

    setLoading(true);
    try {
      const data = await api<any>('/api/auth/register/customer', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          display_name: displayName,
          city,
        }),
      });
      setTokens(data.access_token, data.refresh_token);

      // Welcome-Screen kurz zeigen, dann redirect
      setShowWelcome(true);
      setTimeout(() => {
        router.push('/explore');
      }, 2500);
    } catch (err) {
      if (err instanceof APIError) {
        setError(errorMessages[err.code] || `Fehler: ${err.code}`);
      } else {
        setError('Verbindung zum Server fehlgeschlagen.');
      }
      setLoading(false);
    }
  }

  if (showWelcome) {
    return <WelcomeScreen name={displayName} />;
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* ============================================ */}
      {/* LINKS — FORM (mobile: full width) */}
      {/* ============================================ */}
      <div className="flex-1 lg:max-w-[58%] flex flex-col">
        {/* Header */}
        <header className="px-6 sm:px-10 py-5 sm:py-8 flex items-center justify-between">
          <Link href="/" aria-label="Zur Startseite">
            <Logo />
          </Link>
          <Link
            href="/login"
            className="text-xs sm:text-sm font-medium text-zinc-600 hover:text-brand-600 transition-colors"
          >
            Schon Mitglied? <span className="font-semibold text-brand-600">Anmelden</span>
          </Link>
        </header>

        {/* Form-Container */}
        <div className="flex-1 flex items-start lg:items-center px-6 sm:px-10 lg:px-16 py-4 sm:py-8">
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-fade-up">
            {/* Headline */}
            <div className="mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-3 sm:mb-4">
                Kostenlos · 30 Sekunden
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05] mb-2 sm:mb-3">
                Erstelle dein <span className="italic text-brand-600">Konto.</span>
              </h1>
              <p className="text-zinc-600 text-sm sm:text-base leading-relaxed">
                Geprüfte Profile · Keine Bots · Volle Kontrolle
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* E-Mail */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none transition-all"
                  placeholder="du@beispiel.de"
                />
              </div>

              {/* Anzeigename */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Vorname <span className="font-normal text-zinc-400 normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none transition-all"
                  placeholder="So nennen dich die Frauen"
                />
              </div>

              {/* Stadt — Autocomplete */}
              <div ref={cityInputRef} className="relative">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Stadt
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  required
                  autoComplete="off"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none transition-all"
                  placeholder="z.B. Berlin"
                />
                {showSuggestions && citySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-10 overflow-hidden">
                    {citySuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setCity(s);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center gap-2"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
                        </svg>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Passwort mit Show/Hide */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Passwort
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-12 text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none transition-all"
                    placeholder="Mind. 8 Zeichen"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                    aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 18+ Checkbox */}
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-brand-50/60 p-3 ring-1 ring-brand-100 text-sm hover:bg-brand-50 transition-colors">
                <input
                  type="checkbox"
                  checked={confirmAdult}
                  onChange={(e) => setConfirmAdult(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-zinc-700 leading-snug">
                  Ich bestätige, dass ich <span className="font-semibold">18 Jahre oder älter</span> bin.
                </span>
              </label>

              {/* AGB-Checkbox */}
              <label className="flex cursor-pointer items-start gap-2.5 text-sm pl-1">
                <input
                  type="checkbox"
                  checked={confirmAgb}
                  onChange={(e) => setConfirmAgb(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-zinc-600 leading-snug">
                  Ich akzeptiere die{' '}
                  <Link href="/agb" className="text-brand-600 hover:underline font-medium">AGB</Link>
                  {' '}und{' '}
                  <Link href="/datenschutz" className="text-brand-600 hover:underline font-medium">Datenschutzerklärung</Link>.
                </span>
              </label>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-brand-600 px-4 py-3.5 text-sm sm:text-base font-semibold text-white shadow-pink-lg hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Konto wird erstellt…' : 'Konto erstellen'}
              </button>

              {/* Trust-Line */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 pt-2 text-[10px] sm:text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  SSL-verschlüsselt
                </span>
                <span>·</span>
                <span>🇩🇪 DSGVO</span>
                <span>·</span>
                <span>18+</span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* RECHTS — Hero-Bild (nur Desktop) */}
      {/* ============================================ */}
      <div className="hidden lg:block relative flex-1 bg-zinc-900 overflow-hidden">
        <img
          src="/profiles/frau-2-valentina/01-haupt.jpg"
          alt="Valentina"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient-Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-zinc-900/20" />

        {/* Floating Badge oben rechts */}
        <div className="absolute top-8 right-8 flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs font-semibold text-zinc-900">237 Frauen jetzt online</span>
        </div>

        {/* Quote unten */}
        <div className="absolute bottom-0 left-0 right-0 p-10 xl:p-14 text-white">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="text-brand-400 mb-3 opacity-90">
            <path d="M9.984 4.5l-.531.703C7.078 8.469 6 12.281 6 16.5h3.984c1.094 0 2.016.891 2.016 1.984v3.516a2 2 0 0 1-1.984 2H6c-1.094 0-2.016-.906-2.016-2.016V16.5c0-4.969 1.359-9.516 4.078-13.547l.328-.469L9.984 4.5zm10.5 0l-.516.703C17.578 8.469 16.5 12.281 16.5 16.5h3.984c1.094 0 2.016.891 2.016 1.984v3.516a2 2 0 0 1-1.984 2H16.5c-1.094 0-2.016-.906-2.016-2.016V16.5c0-4.969 1.359-9.516 4.078-13.547l.328-.469L20.484 4.5z" />
          </svg>
          <p className="font-display text-2xl xl:text-3xl font-medium leading-tight tracking-tight mb-4 max-w-md">
            Ich rede Klartext. Hab keine Lust auf <span className="italic text-brand-300">Spielchen</span> oder Standard-Sprüche.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <img
              src="/profiles/frau-2-valentina/01-haupt.jpg"
              alt=""
              className="w-10 h-10 rounded-full border-2 border-white/30 object-cover"
            />
            <div>
              <div className="font-semibold text-sm">Valentina · 25</div>
              <div className="text-xs text-zinc-300">München</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
