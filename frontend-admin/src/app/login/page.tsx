'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login as apiLogin, APIError } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await apiLogin({ email: email.trim(), password });
      if (res.role !== 'admin') {
        setError('Dieser Login ist nur für Admins.');
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof APIError) {
        if (err.code === 'invalid_credentials') {
          setError('E-Mail oder Passwort falsch.');
        } else if (err.code === 'account_not_active') {
          setError('Dein Account wurde noch nicht freigeschaltet. Bitte wende dich an die Verwaltung.');
        } else {
          setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
        }
      } else {
        setError('Verbindung zum Server fehlgeschlagen.');
      }
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Brand-Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-zinc-900" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="font-display text-lg font-semibold tracking-tight text-zinc-900">
              verliebdich
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-zinc-900 tracking-tight">
            Admin Panel
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Melde dich an, um deine Nachrichten zu sehen.
          </p>
        </div>

        {/* Form-Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
                E-Mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none text-zinc-900 text-sm disabled:bg-zinc-50 disabled:cursor-not-allowed"
                placeholder="name@verliebdich.test"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wider">
                Passwort
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 bg-white focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none text-zinc-900 text-sm disabled:bg-zinc-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white font-semibold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Anmelden…
                </>
              ) : (
                'Anmelden'
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-zinc-400 text-center mt-6">
          Kein Account? Wende dich an deinen Manager.
        </p>
      </div>
    </main>
  );
}
