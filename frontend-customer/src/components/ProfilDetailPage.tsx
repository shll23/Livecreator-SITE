'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getCreatorByHandle, createConversation, getAccessToken, type Creator } from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import CoinIcon from '@/components/CoinIcon';

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
// BILDER-GALERIE — Korrektes Touch-Verhalten
// 
// Lösung für den "Bild hängt"-Bug:
//  - Galerie-Container ist horizontaler Scroll-Container mit scroll-snap
//  - Bilder haben `draggable={false}` UND `pointer-events: none` 
//    → Browser sieht sie nicht als interagierbar, kein Drag/Hänger
//  - touch-action auf der Galerie ist `pan-x pan-y` (beides erlaubt)
//    → Browser entscheidet anhand der Wischrichtung
//  - Body kann normal vertikal scrollen
// ============================================================================
function PhotoGallery({ images, alt }: { images: string[]; alt: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    if (!scrollerRef.current) return;
    const sc = scrollerRef.current;
    const idx = Math.round(sc.scrollLeft / sc.clientWidth);
    setActiveIndex(idx);
  }

  function scrollTo(idx: number) {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTo({
      left: idx * scrollerRef.current.clientWidth,
      behavior: 'smooth',
    });
  }

  function next() {
    scrollTo(Math.min(activeIndex + 1, images.length - 1));
  }
  function prev() {
    scrollTo(Math.max(activeIndex - 1, 0));
  }

  if (images.length === 0) {
    return <div className="w-full aspect-[4/5] bg-zinc-200 rounded-t-2xl" />;
  }

  return (
    <div className="relative group">
      {/* Horizontal Scroll-Container — Scroll-Snap nur horizontal */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="gallery-scroller flex overflow-x-auto overflow-y-hidden aspect-[4/5] sm:aspect-[3/2] bg-zinc-100 rounded-t-2xl"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          overscrollBehaviorX: 'contain',
          overscrollBehaviorY: 'auto',
          touchAction: 'pan-x pan-y pinch-zoom',
        }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="shrink-0 w-full h-full"
            style={{ scrollSnapAlign: 'center', scrollSnapStop: 'always' }}
          >
            <img
              src={src}
              alt={`${alt} – Bild ${i + 1}`}
              draggable={false}
              className="w-full h-full object-cover select-none pointer-events-none"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Indikator-Punkte — tappable Navigation */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1.5 rounded-full z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`transition-all rounded-full ${
                i === activeIndex
                  ? 'w-5 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Bild ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Bild-Counter oben rechts */}
      {images.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-semibold px-2 py-1 rounded-full z-10">
          {activeIndex + 1} / {images.length}
        </div>
      )}

      {/* Pfeile Desktop only — versteckt Mobile */}
      {images.length > 1 && (
        <>
          {activeIndex > 0 && (
            <button
              onClick={prev}
              className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm hover:bg-white text-zinc-900 shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10"
              aria-label="Vorheriges Bild"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {activeIndex < images.length - 1 && (
            <button
              onClick={next}
              className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm hover:bg-white text-zinc-900 shadow-lg transition-all opacity-0 group-hover:opacity-100 z-10"
              aria-label="Nächstes Bild"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// HELPER
// ============================================================================
function FactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5 text-center">
      <div className="flex justify-center mb-1 text-zinc-500">{icon}</div>
      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</div>
      <div className="font-semibold text-sm text-zinc-900 mt-0.5">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-b-0">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-zinc-900">{value}</span>
    </div>
  );
}

function TagList({ tags, variant }: { tags: string[]; variant?: 'pink' | 'rose' | 'zinc' }) {
  const styles = {
    pink: 'bg-brand-50 text-brand-700 border-brand-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    zinc: 'bg-zinc-50 text-zinc-700 border-zinc-200',
  };
  const cls = styles[variant || 'zinc'];

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {tag}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// HAUPT-KOMPONENTE
// ============================================================================
export default function ProfilDetailPage() {
  const router = useRouter();
  const params = useParams();
  const handle = params?.handle as string;

  const [profile, setProfile] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(!!getAccessToken());
  }, []);

  useEffect(() => {
    if (!handle) return;
    getCreatorByHandle(handle)
      .then(setProfile)
      .catch(() => setError('Profil nicht gefunden'))
      .finally(() => setLoading(false));
  }, [handle]);

  async function handleStartChat() {
    if (!profile) return;
    if (!authed) {
      router.push('/register');
      return;
    }
    setStartingChat(true);
    try {
      const { id } = await createConversation(profile.user_id);
      router.push(`/inbox/${id}`);
    } catch (err) {
      console.error(err);
      setStartingChat(false);
    }
  }

  if (loading) {
    return (
      <>
        {mounted && authed ? <AppHeader /> : (
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 py-2.5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6"><Logo /></div>
          </header>
        )}
        <main className="min-h-screen bg-zinc-50 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        {mounted && authed ? <AppHeader /> : (
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 py-2.5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6"><Logo /></div>
          </header>
        )}
        <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-4xl mb-3">😕</div>
            <h1 className="font-display text-xl font-semibold mb-2">Profil nicht gefunden</h1>
            <p className="text-zinc-600 text-sm mb-5">{error}</p>
            <Link href="/explore" className="inline-block bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-brand-700 transition-colors">
              Zurück zur Übersicht
            </Link>
          </div>
        </main>
      </>
    );
  }

  const pd = profile.profile_data || {};
  const images = profile.gallery_urls && profile.gallery_urls.length > 0
    ? profile.gallery_urls
    : (profile.avatar_url ? [profile.avatar_url] : []);

  return (
    <>
      {mounted && authed ? <AppHeader /> : (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 py-2.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center"><Logo /></Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login" className="hidden sm:inline-block text-sm font-medium text-zinc-700 hover:text-brand-600 transition-colors">Anmelden</Link>
              <Link href="/register" className="text-xs sm:text-sm font-semibold bg-brand-600 text-white px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-full hover:bg-zinc-900 transition-all shadow-pink">Anmelden / Registrieren</Link>
            </div>
          </div>
        </header>
      )}

      <main className="min-h-screen bg-zinc-50 pb-32 sm:pb-12">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-brand-600 transition-colors mb-3 sm:mb-4 px-1"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Zurück zur Übersicht
          </Link>

          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100">
            {/* GALERIE */}
            <div className="relative">
              <PhotoGallery images={images} alt={profile.display_name} />

              {/* Online-Badge */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 pointer-events-none">
                <span className="flex items-center gap-1.5 bg-white/95 backdrop-blur text-zinc-800 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                  </span>
                  Online
                </span>
              </div>
            </div>

            <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 leading-tight">
                {profile.display_name}
                {profile.age && <span className="font-normal text-zinc-700">, {profile.age}</span>}
              </h1>
              {profile.city && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-zinc-600">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-brand-500">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
                  </svg>
                  {profile.city}
                </div>
              )}
            </div>

            {profile.bio && (
              <div className="px-5 sm:px-7 pb-5">
                <p className="text-zinc-700 leading-relaxed text-[15px] whitespace-pre-wrap">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* STECKBRIEF */}
            <div className="px-5 sm:px-7 pb-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-3">
                Steckbrief
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {profile.age && (
                  <FactCard
                    icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6.5c1.93 0 3.5 1.57 3.5 3.5h2c0-3.04-2.46-5.5-5.5-5.5S6.5 6.96 6.5 10s2.46 5.5 5.5 5.5v2c-1.93 0-3.5 1.57-3.5 3.5h-2c0 3.04 2.46 5.5 5.5 5.5z" /></svg>}
                    label="Alter"
                    value={`${profile.age} J.`}
                  />
                )}
                {pd.height_cm && (
                  <FactCard
                    icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><polyline points="6 8 12 2 18 8" /><polyline points="6 16 12 22 18 16" /></svg>}
                    label="Größe"
                    value={`${pd.height_cm} cm`}
                  />
                )}
                {pd.hair_color && (
                  <FactCard
                    icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 12 7.4 12.3l.6.6.6-.6c.4-.3 7.4-6.9 7.4-12.3a8 8 0 0 0-8-8z" /></svg>}
                    label="Haare"
                    value={pd.hair_color}
                  />
                )}
                {pd.eye_color && (
                  <FactCard
                    icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                    label="Augen"
                    value={pd.eye_color}
                  />
                )}
                {pd.zodiac && (
                  <FactCard
                    icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" /></svg>}
                    label="Sternzeichen"
                    value={pd.zodiac}
                  />
                )}
                {profile.city && (
                  <FactCard
                    icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>}
                    label="Stadt"
                    value={profile.city}
                  />
                )}
              </div>
            </div>

            <div className="px-5 sm:px-7 pb-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2">
                Über mich
              </div>
              <div className="bg-zinc-50/50 rounded-xl px-4 py-1">
                {pd.figure && <InfoRow label="Figur" value={pd.figure} />}
                {pd.hair_length && <InfoRow label="Haarlänge" value={pd.hair_length} />}
                {pd.tattoos && <InfoRow label="Tattoos" value={pd.tattoos} />}
                {pd.piercings && <InfoRow label="Piercings" value={pd.piercings} />}
                {pd.smoker && <InfoRow label="Raucherin" value={pd.smoker} />}
                {pd.marital_status && <InfoRow label="Beziehungsstatus" value={pd.marital_status} />}
              </div>
            </div>

            {pd.looking_for && pd.looking_for.length > 0 && (
              <div className="px-5 sm:px-7 pb-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2.5">
                  Was ich suche
                </div>
                <TagList tags={pd.looking_for} variant="pink" />
              </div>
            )}

            {pd.turn_ons && pd.turn_ons.length > 0 && (
              <div className="px-5 sm:px-7 pb-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2.5">
                  Was mich antörnt
                </div>
                <TagList tags={pd.turn_ons} variant="rose" />
              </div>
            )}

            {pd.interests && pd.interests.length > 0 && (
              <div className="px-5 sm:px-7 pb-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2.5">
                  Interessen
                </div>
                <TagList tags={pd.interests} variant="zinc" />
              </div>
            )}

            {pd.about_text && (
              <div className="px-5 sm:px-7 pb-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2">
                  Das macht mich aus
                </div>
                <p className="text-zinc-700 italic leading-relaxed text-[15px]">
                  „{pd.about_text}"
                </p>
              </div>
            )}

            <div className="mx-5 sm:mx-7 mb-5">
              <div className="flex items-center gap-3 bg-amber-50/60 border border-amber-200/50 rounded-xl p-3.5">
                <div className="shrink-0">
                  <CoinIcon size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-900">
                    {profile.message_price_coins} Coins pro Nachricht
                  </div>
                  <div className="text-xs text-zinc-600">
                    Antworten von {profile.display_name} kosten nichts extra.
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden sm:block px-7 pb-7">
              {authed ? (
                <button
                  onClick={handleStartChat}
                  disabled={startingChat}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-full transition-all shadow-pink-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {startingChat ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Nachricht senden
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href="/register"
                  className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-full transition-all shadow-pink-lg"
                >
                  Kostenlos registrieren um zu schreiben
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="sm:hidden fixed inset-x-0 z-30 px-4 py-3 bg-white border-t border-zinc-200 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]"
             style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
          {authed ? (
            <button
              onClick={handleStartChat}
              disabled={startingChat}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-full transition-all shadow-pink-lg disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {startingChat ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Nachricht senden
                </>
              )}
            </button>
          ) : (
            <Link
              href="/register"
              className="w-full inline-flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-full transition-all shadow-pink-lg"
            >
              Kostenlos registrieren
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
