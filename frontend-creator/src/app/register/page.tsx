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
        setError('Verbindung zum Server fehlgeschlagen.');
      }
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Creator werden</h1>
          <p className="mt-2 text-sm text-zinc-500">Erstelle dein Creator-Konto.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Handle (URL-Name)</label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
                minLength={3}
                maxLength={32}
                placeholder="dein_name"
                className="w-full rounded-r-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Anzeigename</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={80}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            />
            <p className="mt-1 text-xs text-zinc-500">Mindestens 8 Zeichen.</p>
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Registriere…' : 'Konto erstellen'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Bereits ein Konto?{' '}
          <Link href="/login" className="font-medium text-brand-500 hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
