'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setTokens, APIError } from '@/lib/api';

const errorMessages: Record<string, string> = {
  email_already_registered: 'Diese Email ist bereits registriert.',
  invalid_email: 'Bitte gib eine gültige Email-Adresse ein.',
  password_too_short: 'Passwort muss mindestens 8 Zeichen lang sein.',
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmAdult, setConfirmAdult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmAdult) {
      setError('Du musst bestätigen, dass du volljährig bist.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await api<any>('/api/auth/register/customer', {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name: displayName }),
      });
      setTokens(data.access_token, data.refresh_token);
      router.push('/explore');
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
          <h1 className="text-3xl font-bold tracking-tight">Konto erstellen</h1>
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
            <label className="mb-1 block text-sm font-medium">Anzeigename (optional)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              placeholder="Wie sollen Creators dich nennen?"
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
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirmAdult}
              onChange={(e) => setConfirmAdult(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-zinc-600 dark:text-zinc-400">
              Ich bestätige, dass ich volljährig (18+) bin und Inhalte für Erwachsene rechtmäßig
              betrachten darf.
            </span>
          </label>

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
