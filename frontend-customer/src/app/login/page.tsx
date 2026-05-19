'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, APIError } from '@/lib/api';

const errorMessages: Record<string, string> = {
  invalid_credentials: 'E-Mail oder Passwort ist falsch.',
  account_not_active: 'Dieses Konto ist gesperrt.',
  invalid_email: 'Bitte gib eine gültige E-Mail-Adresse ein.',
};

// ============================================================================
// LOGO
// ============================================================================
function Logo() {
  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2 group">
      <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
        verliebdich
      </span>
    </span>
  );
}

// ============================================================================
// LOGIN PAGE
// ============================================================================
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      router.push('/explore');
    } catch (err) {
      if (err instanceof APIError) {
        setError(errorMessages[err.code] || 'Anmeldung fehlgeschlagen.');
      } else {
        setError('Verbindung zum Server fehlgeschlagen.');
      }
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* ============================================ */}
      {/* LINKS — FORM */}
      {/* ============================================ */}
      <div className="flex-1 lg:max-w-[58%] flex flex-col">
        {/* Header */}
        <header className="px-6 sm:px-10 py-5 sm:py-8 flex items-center justify-between">
          <Link href="/" aria-label="Zur Startseite">
            <Logo />
          </Link>
          <Link
            href="/register"
            className="text-xs sm:text-sm font-medium text-zinc-600 hover:text-brand-600 transition-colors"
          >
            Noch kein Konto? <span className="font-semibold text-brand-600">Registrieren</span>
          </Link>
        </header>

        {/* Form-Container — vertikal zentriert */}
        <div className="flex-1 flex items-center px-6 sm:px-10 lg:px-16 py-8">
          <div className="w-full max-w-md mx-auto lg:mx-0 animate-fade-up">
            {/* Headline */}
            <div className="mb-7 sm:mb-9">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05] mb-2 sm:mb-3">
                Willkommen <span className="italic text-brand-600">zurück.</span>
              </h1>
              <p className="text-zinc-600 text-sm sm:text-base leading-relaxed">
                Sie warten schon auf dich.
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

              {/* Passwort */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Passwort
                  </label>
                  <Link
                    href="/passwort-vergessen"
                    className="text-[11px] text-brand-600 hover:text-brand-700 hover:underline font-medium"
                  >
                    Vergessen?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-12 text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none transition-all"
                    placeholder="••••••••"
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

              {/* Angemeldet bleiben */}
              <label className="flex cursor-pointer items-center gap-2.5 text-sm pl-1">
                <input
                  type="checkbox"
                  checked={stayLoggedIn}
                  onChange={(e) => setStayLoggedIn(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-zinc-700">Angemeldet bleiben</span>
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
                {loading ? 'Anmelden…' : 'Anmelden'}
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
          src="/profiles/frau-6-sarah/01-haupt.jpg"
          alt="Sarah"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Gradient-Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-zinc-900/20" />

        {/* Floating Badge */}
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
            Spannend wird's für mich, wenn ein Gespräch <span className="italic text-brand-300">nicht oberflächlich</span> bleibt.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <img
              src="/profiles/frau-6-sarah/01-haupt.jpg"
              alt=""
              className="w-10 h-10 rounded-full border-2 border-white/30 object-cover"
            />
            <div>
              <div className="font-semibold text-sm">Sarah · 31</div>
              <div className="text-xs text-zinc-300">Köln</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
