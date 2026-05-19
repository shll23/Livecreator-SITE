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
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Subtle Background — zwei sehr dezente Pink-Glows */}
      <div className="pointer-events-none absolute -top-40 -right-20 w-[500px] h-[500px] rounded-full bg-brand-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full bg-brand-100/40 blur-3xl" />

      {/* Header */}
      <header className="relative px-6 sm:px-10 py-5 sm:py-8 flex items-center justify-between max-w-6xl mx-auto">
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

      {/* Form-Container — zentriert */}
      <div className="relative flex items-center justify-center px-6 py-8 min-h-[calc(100vh-100px)]">
        <div className="w-full max-w-md animate-fade-up">
          {/* Headline */}
          <div className="mb-7 sm:mb-9 text-center">
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.05] mb-2 sm:mb-3">
              Willkommen <span className="italic text-brand-600">zurück.</span>
            </h1>
            <p className="text-zinc-600 text-sm sm:text-base leading-relaxed">
              Sie warten schon auf dich.
            </p>
          </div>

          {/* Form-Card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 p-6 sm:p-8 shadow-sm">
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
    </div>
  );
}
