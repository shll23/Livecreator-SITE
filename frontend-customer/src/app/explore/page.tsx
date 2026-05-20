'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listCreators, getAccessToken, type Creator, type CreatorFilters } from '@/lib/api';
import { CITIES, filterCities, findCity, type CityEntry } from '@/lib/cities';
import AppHeader from '@/components/AppHeader';

function Logo() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-brand-600" fill="currentColor">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span className="font-display text-base sm:text-xl font-semibold tracking-tight text-zinc-900">verliebdich</span>
    </span>
  );
}

// ============================================================================
// FILTER BAR
// ============================================================================
interface FilterState {
  city: string;
  cityEntry: CityEntry | null;
  radiusKm: number;
  minAge: number;
  maxAge: number;
  useRadius: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  city: '',
  cityEntry: null,
  radiusKm: 100,
  minAge: 18,
  maxAge: 50,
  useRadius: false,
};

function FilterBar({
  filters,
  onChange,
  onReset,
  resultCount,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onReset: () => void;
  resultCount: number;
}) {
  const [cityInput, setCityInput] = useState(filters.city);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);

  // Sync external state
  useEffect(() => {
    setCityInput(filters.city);
  }, [filters.city]);

  // Click-outside für Suggestions
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => filterCities(cityInput, 6), [cityInput]);

  function selectCity(c: CityEntry) {
    setCityInput(c.name);
    setShowSuggestions(false);
    onChange({ ...filters, city: c.name, cityEntry: c });
  }

  function clearCity() {
    setCityInput('');
    onChange({ ...filters, city: '', cityEntry: null, useRadius: false });
  }

  const hasActiveFilters =
    filters.city !== '' || filters.minAge !== 18 || filters.maxAge !== 50;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-3 sm:p-4 mb-5 sm:mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* STADT mit Autocomplete */}
        <div ref={cityRef} className="relative">
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
            Stadt
          </label>
          <div className="relative">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => {
                setCityInput(e.target.value);
                setShowSuggestions(true);
                // Wenn Eingabe komplett gelöscht: City-Filter zurücksetzen
                if (e.target.value === '') {
                  onChange({ ...filters, city: '', cityEntry: null, useRadius: false });
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="z.B. Berlin"
              className="w-full pl-8 pr-8 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none transition-all"
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {cityInput && (
              <button
                onClick={clearCity}
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5"
                aria-label="Stadt löschen"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          {showSuggestions && (
            <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.length === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...filters, city: cityInput, cityEntry: null });
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-zinc-600 hover:bg-brand-50"
                >
                  <span className="text-zinc-500">„{cityInput}" verwenden</span>
                </button>
              ) : (
                suggestions.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => selectCity(c)}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-brand-50 hover:text-brand-700 flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-zinc-400">{c.country}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Umkreis-Toggle (nur wenn Stadt mit Koordinaten gewählt) */}
          {filters.cityEntry && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.useRadius}
                  onChange={(e) => onChange({ ...filters, useRadius: e.target.checked })}
                  className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                />
                <span className="text-zinc-600">Umkreis</span>
              </label>
              {filters.useRadius && (
                <select
                  value={filters.radiusKm}
                  onChange={(e) => onChange({ ...filters, radiusKm: parseInt(e.target.value) })}
                  className="text-xs bg-zinc-50 border border-zinc-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-brand-400"
                >
                  <option value="25">25 km</option>
                  <option value="50">50 km</option>
                  <option value="100">100 km</option>
                  <option value="200">200 km</option>
                  <option value="500">500 km</option>
                </select>
              )}
            </div>
          )}
        </div>

        {/* ALTER */}
        <div className="sm:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
            Alter <span className="text-zinc-400 font-normal normal-case">({filters.minAge}–{filters.maxAge} Jahre)</span>
          </label>
          <div className="flex items-center gap-3 pt-1.5">
            <input
              type="range"
              min={18}
              max={60}
              value={filters.minAge}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                onChange({ ...filters, minAge: Math.min(v, filters.maxAge) });
              }}
              className="flex-1 accent-brand-600"
            />
            <span className="text-xs text-zinc-400">bis</span>
            <input
              type="range"
              min={18}
              max={60}
              value={filters.maxAge}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                onChange({ ...filters, maxAge: Math.max(v, filters.minAge) });
              }}
              className="flex-1 accent-brand-600"
            />
          </div>
        </div>
      </div>

      {/* Footer: Anzahl + Reset */}
      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
        <span className="text-zinc-500">
          <span className="font-semibold text-zinc-900">{resultCount}</span> {resultCount === 1 ? 'Treffer' : 'Treffer'}
        </span>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXPLORE PAGE
// ============================================================================
export default function ExplorePage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    setMounted(true);
    setAuthed(!!getAccessToken());
  }, []);

  // Lade Creators bei Filter-Änderung (debounced)
  useEffect(() => {
    const handler = setTimeout(() => {
      const apiFilters: CreatorFilters = {};

      if (filters.useRadius && filters.cityEntry) {
        // Umkreis-Suche
        apiFilters.near_lat = filters.cityEntry.lat;
        apiFilters.near_lng = filters.cityEntry.lng;
        apiFilters.radius_km = filters.radiusKm;
      } else if (filters.city) {
        // Exakte Stadt-Suche
        apiFilters.city = filters.city;
      }

      if (filters.minAge !== 18) apiFilters.min_age = filters.minAge;
      if (filters.maxAge !== 50) apiFilters.max_age = filters.maxAge;

      setLoading(true);
      listCreators(apiFilters)
        .then((res) => setCreators(res.creators))
        .catch((err) => console.error('Fehler beim Laden:', err))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(handler);
  }, [filters]);

  function handleCardClick(frau: Creator) {
    // Immer zur Profil-Detail-Seite (eingeloggt oder nicht)
    router.push(`/profil/${frau.handle}`);
  }

  return (
    <>
      {mounted && authed ? (
        <AppHeader />
      ) : (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 py-2.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center"><Logo /></Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login" className="hidden sm:inline-block text-sm font-medium text-zinc-700 hover:text-brand-600 transition-colors">Anmelden</Link>
              <Link href="/register" className="text-xs sm:text-sm font-semibold bg-brand-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full hover:bg-zinc-900 transition-all shadow-pink">Anmelden / Registrieren</Link>
            </div>
          </div>
        </header>
      )}

      <main className="bg-soft-gradient min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-10 sm:pb-16">
          {/* Headline */}
          <div className="mb-5 sm:mb-7">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              <span className="text-green-700 font-semibold text-[10px] sm:text-xs tracking-[0.2em] uppercase">
                {creators.length} {creators.length === 1 ? 'Frau' : 'Frauen'} online
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-4xl md:text-5xl font-semibold leading-tight tracking-tight mb-1.5 sm:mb-3">
              Echte Frauen <span className="italic text-brand-600">entdecken</span>
            </h1>
            <p className="text-zinc-600 text-xs sm:text-base">
              Diskret und persönlich.
            </p>
          </div>

          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            resultCount={creators.length}
          />

          {/* Profil-Grid */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-[3/4] bg-zinc-200/60 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : creators.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-3xl mb-3">🔍</div>
              <p className="text-zinc-700 font-medium mb-1">Keine Treffer</p>
              <p className="text-sm text-zinc-500">Versuche deine Filter zu ändern.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {creators.map((f) => (
                <button
                  key={f.user_id}
                  onClick={() => handleCardClick(f)}
                  className="group relative text-left"
                >
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-sm group-hover:shadow-pink transition-all">
                    {f.avatar_url ? (
                      <img
                        src={f.avatar_url}
                        alt={f.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-200" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Online-Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="flex items-center gap-1 bg-white/90 backdrop-blur text-zinc-800 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                        <span className="w-1 h-1 rounded-full bg-green-500"></span>
                        Online
                      </span>
                    </div>

                    {/* Distanz-Badge (nur bei Umkreis-Suche) */}
                    {f.distance_km != null && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-white/90 backdrop-blur text-zinc-700 text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                          {Math.round(f.distance_km)} km
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 text-white">
                      <div className="flex items-baseline gap-1.5">
                        <div className="font-display text-sm sm:text-lg font-semibold leading-tight">
                          {f.display_name}
                        </div>
                        {f.age && (
                          <div className="text-xs sm:text-sm opacity-90">
                            · {f.age}
                          </div>
                        )}
                      </div>
                      {f.city && (
                        <div className="text-[10px] sm:text-xs opacity-80 mt-0.5 flex items-center gap-1">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
                          </svg>
                          {f.city}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {mounted && !authed && (
            <div className="mt-10 sm:mt-14 text-center">
              <p className="text-zinc-600 text-sm mb-4">
                Registriere dich kostenlos, um Frauen zu schreiben.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-brand-600 text-white font-semibold px-6 sm:px-8 py-3 rounded-full hover:bg-brand-700 transition-all shadow-pink-lg text-sm"
              >
                <span>Kostenlos registrieren</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
