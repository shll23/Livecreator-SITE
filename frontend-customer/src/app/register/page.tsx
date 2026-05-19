'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setTokens, APIError } from '@/lib/api';

// ============================================================================
// DACH-Städte für Autocomplete (Top 200+, abgedeckt 90%+ der User)
// ============================================================================
const STADTE_DACH = [
  // Deutschland — Großstädte & Mittelstädte (alphabetisch)
  'Aachen', 'Aalen', 'Ahlen', 'Albstadt', 'Aschaffenburg', 'Augsburg',
  'Bad Homburg', 'Bad Salzuflen', 'Bamberg', 'Bayreuth', 'Berlin', 'Bergisch Gladbach',
  'Bergheim', 'Bielefeld', 'Bocholt', 'Bochum', 'Bonn', 'Bottrop', 'Brandenburg',
  'Braunschweig', 'Bremen', 'Bremerhaven', 'Castrop-Rauxel', 'Celle', 'Chemnitz',
  'Coburg', 'Cottbus', 'Cuxhaven', 'Darmstadt', 'Delmenhorst', 'Dessau-Roßlau',
  'Detmold', 'Dinslaken', 'Dormagen', 'Dortmund', 'Dresden', 'Duisburg', 'Düren',
  'Düsseldorf', 'Eberswalde', 'Eisenach', 'Emden', 'Erfurt', 'Erlangen', 'Eschweiler',
  'Esslingen', 'Essen', 'Euskirchen', 'Flensburg', 'Frankfurt am Main', 'Frankfurt (Oder)',
  'Freiburg im Breisgau', 'Friedrichshafen', 'Fulda', 'Fürth', 'Gera', 'Gelsenkirchen',
  'Gießen', 'Gladbeck', 'Görlitz', 'Göppingen', 'Göttingen', 'Greifswald',
  'Grevenbroich', 'Gronau', 'Gummersbach', 'Gütersloh', 'Hagen', 'Halberstadt',
  'Halle (Saale)', 'Hamburg', 'Hameln', 'Hamm', 'Hanau', 'Hannover', 'Hattingen',
  'Heidelberg', 'Heidenheim', 'Heilbronn', 'Herford', 'Herne', 'Herten', 'Hilden',
  'Hildesheim', 'Hof', 'Hürth', 'Ibbenbüren', 'Ingolstadt', 'Iserlohn', 'Jena',
  'Kaiserslautern', 'Karlsruhe', 'Kassel', 'Kempten', 'Kerpen', 'Kiel', 'Kleve',
  'Koblenz', 'Konstanz', 'Köln', 'Krefeld', 'Landshut', 'Langenfeld', 'Langenhagen',
  'Leipzig', 'Leonberg', 'Leverkusen', 'Lingen', 'Lippstadt', 'Lübeck', 'Lüdenscheid',
  'Ludwigsburg', 'Ludwigshafen', 'Lüneburg', 'Lünen', 'Magdeburg', 'Mainz', 'Mannheim',
  'Marburg', 'Marl', 'Meerbusch', 'Memmingen', 'Menden', 'Minden', 'Moers',
  'Mönchengladbach', 'Mülheim an der Ruhr', 'München', 'Münster', 'Neubrandenburg',
  'Neumünster', 'Neuss', 'Neustadt', 'Neu-Ulm', 'Neuwied', 'Norderstedt', 'Nordhausen',
  'Nordhorn', 'Nürnberg', 'Oberhausen', 'Offenbach', 'Offenburg', 'Oldenburg', 'Osnabrück',
  'Paderborn', 'Passau', 'Peine', 'Pforzheim', 'Pirmasens', 'Plauen', 'Potsdam',
  'Ratingen', 'Recklinghausen', 'Regensburg', 'Remscheid', 'Reutlingen', 'Rheine',
  'Rosenheim', 'Rostock', 'Rüsselsheim', 'Saarbrücken', 'Salzgitter', 'Sankt Augustin',
  'Schwabach', 'Schweinfurt', 'Schwerin', 'Siegen', 'Sindelfingen', 'Solingen',
  'Speyer', 'Stolberg', 'Stralsund', 'Stuttgart', 'Suhl', 'Trier', 'Troisdorf',
  'Tübingen', 'Ulm', 'Unna', 'Velbert', 'Viersen', 'Villingen-Schwenningen',
  'Waiblingen', 'Weimar', 'Wesel', 'Wetzlar', 'Wiesbaden', 'Wilhelmshaven', 'Witten',
  'Wolfenbüttel', 'Wolfsburg', 'Worms', 'Wuppertal', 'Würzburg', 'Zwickau',
  // Österreich
  'Wien', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels',
  'Sankt Pölten', 'Dornbirn', 'Steyr', 'Wiener Neustadt', 'Feldkirch', 'Bregenz',
  // Schweiz
  'Zürich', 'Genf', 'Basel', 'Bern', 'Lausanne', 'Luzern', 'Winterthur', 'St. Gallen',
  'Lugano', 'Biel/Bienne', 'Thun', 'Köniz', 'Schaffhausen', 'Chur',
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

  // Autocomplete-Logik: erst startsWith (besser sortiert), dann includes als Fallback
  useEffect(() => {
    if (city.length < 1) {
      setCitySuggestions([]);
      return;
    }
    const query = city.toLowerCase();
    const startsWith = STADTE_DACH.filter((s) => s.toLowerCase().startsWith(query));
    const includes = STADTE_DACH.filter(
      (s) => !s.toLowerCase().startsWith(query) && s.toLowerCase().includes(query)
    );
    setCitySuggestions([...startsWith, ...includes].slice(0, 6));
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
          href="/login"
          className="text-xs sm:text-sm font-medium text-zinc-600 hover:text-brand-600 transition-colors"
        >
          Schon Mitglied? <span className="font-semibold text-brand-600">Anmelden</span>
        </Link>
      </header>

      {/* Form-Container — zentriert */}
      <div className="relative flex items-start justify-center px-6 py-4 sm:py-8 pb-12">
        <div className="w-full max-w-md animate-fade-up">
          {/* Headline */}
          <div className="mb-6 sm:mb-8 text-center">
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

          {/* Form-Card mit zarter Border */}
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
                {showSuggestions && city.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-10 overflow-hidden">
                    {citySuggestions.length > 0 ? (
                      <>
                        {/* Treffer */}
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
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-400 shrink-0">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
                            </svg>
                            {s}
                          </button>
                        ))}
                        {/* "Andere Stadt" als letzte Option (immer sichtbar wenn Treffer da sind) */}
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          className="w-full px-4 py-2.5 text-left text-sm text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center gap-2 border-t border-zinc-100"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          <span><span className="font-semibold text-zinc-900">{city}</span> eingeben</span>
                        </button>
                      </>
                    ) : (
                      // Kein Treffer — nimm trotzdem die Eingabe an
                      <button
                        type="button"
                        onClick={() => setShowSuggestions(false)}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-brand-50 transition-colors flex items-start gap-2.5"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600 shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <div>
                          <div className="text-zinc-900 font-medium">„{city}" verwenden</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">Keine Vorschläge — deine Eingabe wird akzeptiert</div>
                        </div>
                      </button>
                    )}
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
    </div>
  );
}
