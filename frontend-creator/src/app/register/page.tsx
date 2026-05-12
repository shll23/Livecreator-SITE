'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerCreator, APIError } from '@/lib/api';

const errorMessages: Record<string, string> = {
  email_already_registered: 'Diese Email ist bereits registriert.',
  handle_already_taken: 'Dieser Handle ist bereits vergeben.',
  invalid_email: 'Bitte gib eine gültige Email-Adresse ein.',
  invalid_handle: 'Handle: nur a–z, 0–9, _ — 3 bis 32 Zeichen.',
  password_too_short: 'Passwort muss mindestens 8 Zeichen lang sein.',
  invalid_display_name: 'Anzeigename muss 1–80 Zeichen lang sein.',
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerCreator({ email, password, handle, display_name: displayName });
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof APIError) {
        setError(errorMessages[err.code] || `Fehler: ${err.code}`);
      } else {
        setError('Verbindung fehlgeschlagen.');
      }
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-mesh">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl"></div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex flex-col items-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-pink">
              <span className="font-display text-2xl font-bold text-white">v</span>
            </div>
            <div className="mt-3 font-display text-2xl font-bold tracking-tight">Creator Studio</div>
            <div className="text-xs uppercase tracking-wider text-zinc-500">verliebdich</div>
          </div>

          <div className="rounded-3xl border border-zinc-200/60 bg-white p-8 shadow-lg md:p-10">
            <div className="mb-7 text-center">
              <h1 className="font-display text-3xl font-bold tracking-tight">Creator werden</h1>
              <p className="mt-2 text-sm text-zinc-500">Starte deine Reise.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none"
                  placeholder="creator@beispiel.de"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Handle</label>
                <div className="flex rounded-xl border border-zinc-300 bg-white focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
                  <span className="flex items-center pl-4 text-sm text-zinc-400">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                    minLength={3}
                    maxLength={32}
                    placeholder="dein_name"
                    className="w-full rounded-r-xl bg-transparent py-3 pr-4 pl-1 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Anzeigename</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={80}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none"
                  placeholder="Dein Künstlername"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none"
                  placeholder="Mind. 8 Zeichen"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-pink transition hover:from-brand-600 hover:to-brand-700 disabled:opacity-50"
              >
                {loading ? 'Registriere…' : 'Konto erstellen'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Bereits ein Konto?{' '}
              <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
                Anmelden
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
