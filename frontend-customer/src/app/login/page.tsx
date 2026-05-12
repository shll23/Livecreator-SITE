'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, APIError } from '@/lib/api';

const errorMessages: Record<string, string> = {
  invalid_credentials: 'Email oder Passwort ist falsch.',
  account_not_active: 'Dieses Konto ist gesperrt.',
  invalid_email: 'Bitte gib eine gültige Email-Adresse ein.',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="relative min-h-screen overflow-hidden bg-mesh">
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl"></div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md animate-fade-up">
          <Link href="/explore" className="mb-8 flex items-center justify-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-pink">
              <span className="font-display text-xl font-bold text-white">v</span>
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">verliebdich</span>
          </Link>

          <div className="rounded-3xl border border-zinc-200/60 bg-white p-8 shadow-lg md:p-10">
            <div className="mb-7 text-center">
              <h1 className="font-display text-3xl font-bold tracking-tight">Willkommen zurück</h1>
              <p className="mt-2 text-sm text-zinc-500">Melde dich an, um zu chatten.</p>
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
                  placeholder="du@beispiel.de"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:outline-none"
                  placeholder="••••••••"
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
                {loading ? 'Anmelden…' : 'Anmelden'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Neu hier?{' '}
              <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
                Konto erstellen
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
