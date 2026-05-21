'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  getMyProfile,
  updateMyProfile,
  listMyPhotos,
  uploadMyPhoto,
  deleteMyPhoto,
  setMyPrimaryPhoto,
  reorderMyPhotos,
  getMe,
  APIError,
  type MyProfile,
  type ProfileData,
  type ProfilePhoto,
} from '@/lib/api';
import Sidebar from '@/components/Sidebar';

// ============================================================================
// Auswahl-Listen für Steckbrief (aus Customer-Seite konsistent)
// ============================================================================
const FIGURE_OPTIONS = ['schlank', 'sportlich', 'normal', 'kurvig', 'mollig'];
const HAIR_COLOR_OPTIONS = ['blond', 'brünett', 'schwarz', 'rot', 'gefärbt'];
const HAIR_LENGTH_OPTIONS = ['kurz', 'mittel', 'lang'];
const EYE_COLOR_OPTIONS = ['blau', 'grün', 'braun', 'grau', 'haselnuss'];
const ZODIAC_OPTIONS = [
  'Widder', 'Stier', 'Zwillinge', 'Krebs', 'Löwe', 'Jungfrau',
  'Waage', 'Skorpion', 'Schütze', 'Steinbock', 'Wassermann', 'Fische',
];
const SMOKER_OPTIONS = ['nein', 'gelegentlich', 'ja'];
const TATTOO_PIERCING_OPTIONS = ['keine', 'einige', 'viele'];
const MARITAL_OPTIONS = ['single', 'vergeben', 'verheiratet', 'es ist kompliziert', 'geschieden'];

const LOOKING_FOR_OPTIONS = [
  'Flirt', 'Freundschaft Plus', 'Seitensprung', 'Sex-Chat',
  'Bilder-Tausch', 'Treffen', 'Affäre', 'Romantik',
];
const TURN_ONS_OPTIONS = [
  'Dominanz', 'Unterwürfigkeit', 'Erotische Gespräche', 'Dessous',
  'Rollenspiele', 'Outdoor', 'Voyeurismus', 'Exhibitionismus',
];
const INTEREST_OPTIONS = [
  'Mode', 'Wellness', 'Nightlife', 'Musik', 'Reisen', 'Sport',
  'Fitness', 'Kochen', 'Filme', 'Bücher', 'Kunst', 'Tanzen',
];

// ============================================================================
// Helpers
// ============================================================================
function buildImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // /storage/... → Backend serviert (neue Uploads)
  // /profiles/... → Customer-Frontend serviert die alten Seed-Bilder statisch
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  if (path.startsWith('/storage/')) {
    return apiBase + path;
  }
  if (path.startsWith('/profiles/')) {
    // Customer-Frontend läuft auf Port 3000 (gleicher Host)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.port = '3000';
      url.pathname = path;
      url.search = '';
      url.hash = '';
      return url.toString();
    }
    return path;
  }
  return path;
}

// ============================================================================
// PROFIL-PAGE
// ============================================================================
export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');

  // Edit-State (separat vom Server-State)
  const [bio, setBio] = useState('');
  const [aboutText, setAboutText] = useState('');
  const [profileData, setProfileData] = useState<ProfileData>({});

  // UI-State
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Drag-and-Drop
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // ===========================================================================
  // Laden
  // ===========================================================================
  const loadAll = useCallback(async () => {
    try {
      const [prof, ph, me] = await Promise.all([
        getMyProfile(),
        listMyPhotos(),
        getMe().catch(() => null),
      ]);
      setProfile(prof);
      setPhotos(ph.photos);
      setBio(prof.bio || '');
      setAboutText(prof.profile_data?.about_text || '');
      setProfileData(prof.profile_data || {});
      if (me?.display_name) setDisplayName(me.display_name);
    } catch (err) {
      if (err instanceof APIError && err.code === 'unauthenticated') {
        router.push('/login');
        return;
      }
      setError('Profil konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    loadAll();
  }, [router, loadAll]);

  // ===========================================================================
  // Save Bio + About + Steckbrief + Tags
  // ===========================================================================
  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // about_text in profile_data einfügen
      const dataToSave: ProfileData = {
        ...profileData,
        about_text: aboutText,
      };
      await updateMyProfile({ bio, profile_data: dataToSave });
      setSuccess('Änderungen gespeichert.');
      setTimeout(() => setSuccess(null), 3000);
      await loadAll();
    } catch (err) {
      const code = err instanceof APIError ? err.code : 'unknown';
      if (code === 'bio_too_long') setError('Bio ist zu lang (max 500 Zeichen).');
      else if (code === 'about_text_too_long') setError('Beschreibung ist zu lang (max 2000 Zeichen).');
      else setError('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  // ===========================================================================
  // Photo Upload
  // ===========================================================================
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // Reset für nächsten Upload

    if (file.size > 10 * 1024 * 1024) {
      setError('Bild ist zu groß (max 10 MB).');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Nur Bilder erlaubt.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      await uploadMyPhoto(file);
      await loadAll();
      setSuccess('Bild hochgeladen. Wird geprüft, bevor es öffentlich erscheint.');
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError('Upload fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Dieses Bild wirklich löschen?')) return;
    try {
      await deleteMyPhoto(id);
      await loadAll();
    } catch {
      setError('Löschen fehlgeschlagen.');
    }
  }

  async function handleSetPrimary(id: string) {
    try {
      await setMyPrimaryPhoto(id);
      await loadAll();
    } catch {
      setError('Hauptbild konnte nicht gesetzt werden.');
    }
  }

  // ===========================================================================
  // Drag-and-Drop Reorder
  // ===========================================================================
  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  async function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const ordered = [...photos];
    const fromIdx = ordered.findIndex(p => p.id === draggedId);
    const toIdx = ordered.findIndex(p => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);

    setPhotos(ordered); // Optimistisch
    setDraggedId(null);

    try {
      await reorderMyPhotos(ordered.map(p => p.id));
    } catch {
      setError('Reihenfolge konnte nicht gespeichert werden.');
      loadAll();
    }
  }

  // ===========================================================================
  // Tag-Toggle Helper
  // ===========================================================================
  function toggleArrayTag(field: 'looking_for' | 'turn_ons' | 'interests', value: string) {
    setProfileData(prev => {
      const arr = (prev[field] as string[]) || [];
      const has = arr.includes(value);
      return {
        ...prev,
        [field]: has ? arr.filter(v => v !== value) : [...arr, value],
      };
    });
  }

  function isTagActive(field: 'looking_for' | 'turn_ons' | 'interests', value: string): boolean {
    const arr = (profileData[field] as string[]) || [];
    return arr.includes(value);
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <div className="flex bg-zinc-50 min-h-screen pb-32">
      <Sidebar displayName={displayName} />

      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900 tracking-tight">
            Mein Profil
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Bearbeite deine Beschreibung, Tags und Bilder. Stadt, Alter und Preis verwaltet die Plattform.
          </p>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
            Profil wird geladen…
          </div>
        )}

        {!loading && profile && (
          <div className="space-y-6">
            {/* === Read-only Header (Display Name, Stadt, Alter) === */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-200 overflow-hidden shrink-0">
                {profile.avatar_url && (
                  <img
                    src={buildImageUrl(profile.avatar_url)}
                    alt={profile.display_name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-zinc-900">{profile.display_name}</h2>
                  {profile.age && (
                    <span className="text-zinc-500 tabular-nums">· {profile.age}</span>
                  )}
                </div>
                {profile.city && (
                  <div className="text-sm text-zinc-500 mt-0.5">📍 {profile.city}</div>
                )}
                <div className="text-xs text-zinc-400 mt-1">
                  Diese Angaben verwaltet die Plattform.
                </div>
              </div>
            </div>

            {/* === Bilder-Sektion === */}
            <section className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-zinc-900">Bilder</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Ziehe Bilder zum Sortieren. Klicke ⭐ um ein Hauptbild zu setzen. Neue Bilder werden geprüft.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={() => handleDragStart(photo.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(photo.id)}
                    className={`relative group aspect-[4/5] rounded-lg overflow-hidden border-2 cursor-move ${
                      photo.status === 'rejected'
                        ? 'border-red-300'
                        : photo.is_primary
                        ? 'border-zinc-900'
                        : 'border-zinc-200'
                    } ${draggedId === photo.id ? 'opacity-40' : ''}`}
                  >
                    <img
                      src={buildImageUrl(photo.thumb_path || photo.file_path)}
                      alt=""
                      className="w-full h-full object-cover pointer-events-none"
                    />

                    {/* Status-Overlay */}
                    {photo.status === 'pending_review' && (
                      <div className="absolute inset-0 bg-zinc-900/40 flex items-center justify-center">
                        <div className="bg-white/95 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-semibold text-zinc-700">
                          In Prüfung
                        </div>
                      </div>
                    )}
                    {photo.status === 'rejected' && (
                      <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center p-2">
                        <div className="text-center">
                          <div className="bg-white/95 px-2 py-1 rounded text-[10px] uppercase tracking-wider font-semibold text-red-700">
                            Abgelehnt
                          </div>
                          {photo.rejection_reason && (
                            <div className="text-[10px] text-white mt-1">
                              {photo.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Primary-Star (oben links) */}
                    {photo.is_primary && (
                      <div className="absolute top-2 left-2 bg-zinc-900 text-white text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded">
                        Hauptbild
                      </div>
                    )}

                    {/* Action-Buttons (Hover) */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!photo.is_primary && photo.status === 'approved' && (
                        <button
                          onClick={() => handleSetPrimary(photo.id)}
                          className="w-7 h-7 bg-white/95 hover:bg-white rounded-full flex items-center justify-center text-zinc-700 hover:text-zinc-900 shadow-sm"
                          title="Als Hauptbild"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(photo.id)}
                        className="w-7 h-7 bg-white/95 hover:bg-red-50 rounded-full flex items-center justify-center text-zinc-700 hover:text-red-600 shadow-sm"
                        title="Löschen"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Upload-Tile */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-[4/5] rounded-lg border-2 border-dashed border-zinc-300 hover:border-zinc-900 hover:bg-zinc-50 flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
                      <span className="text-xs text-zinc-500">Wird hochgeladen…</span>
                    </>
                  ) : (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span className="text-xs text-zinc-500 font-medium">Bild hinzufügen</span>
                    </>
                  )}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </section>

            {/* === Bio === */}
            <section className="bg-white border border-zinc-200 rounded-xl p-5">
              <label className="block">
                <span className="font-semibold text-zinc-900">Bio</span>
                <span className="block text-xs text-zinc-500 mt-0.5 mb-2">
                  Kurzer Spruch oben in deinem Profil. Max 500 Zeichen.
                </span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="z.B. Ich weiß was ich will…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none resize-y"
                />
                <div className="text-right text-[11px] text-zinc-400 mt-1 tabular-nums">
                  {bio.length} / 500
                </div>
              </label>
            </section>

            {/* === About-Text === */}
            <section className="bg-white border border-zinc-200 rounded-xl p-5">
              <label className="block">
                <span className="font-semibold text-zinc-900">Über mich</span>
                <span className="block text-xs text-zinc-500 mt-0.5 mb-2">
                  Längere Beschreibung. Max 2000 Zeichen.
                </span>
                <textarea
                  value={aboutText}
                  onChange={(e) => setAboutText(e.target.value)}
                  maxLength={2000}
                  rows={6}
                  placeholder="Erzähl was über dich…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none resize-y"
                />
                <div className="text-right text-[11px] text-zinc-400 mt-1 tabular-nums">
                  {aboutText.length} / 2000
                </div>
              </label>
            </section>

            {/* === Steckbrief === */}
            <section className="bg-white border border-zinc-200 rounded-xl p-5">
              <h2 className="font-semibold text-zinc-900 mb-1">Steckbrief</h2>
              <p className="text-xs text-zinc-500 mb-4">Sachliche Angaben zu dir.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Figur"
                  value={profileData.figure || ''}
                  options={FIGURE_OPTIONS}
                  onChange={(v) => setProfileData(p => ({ ...p, figure: v }))}
                />
                <NumberField
                  label="Größe (cm)"
                  value={profileData.height_cm}
                  onChange={(v) => setProfileData(p => ({ ...p, height_cm: v }))}
                  min={140} max={210}
                />
                <SelectField
                  label="Haarfarbe"
                  value={profileData.hair_color || ''}
                  options={HAIR_COLOR_OPTIONS}
                  onChange={(v) => setProfileData(p => ({ ...p, hair_color: v }))}
                />
                <SelectField
                  label="Haarlänge"
                  value={profileData.hair_length || ''}
                  options={HAIR_LENGTH_OPTIONS}
                  onChange={(v) => setProfileData(p => ({ ...p, hair_length: v }))}
                />
                <SelectField
                  label="Augenfarbe"
                  value={profileData.eye_color || ''}
                  options={EYE_COLOR_OPTIONS}
                  onChange={(v) => setProfileData(p => ({ ...p, eye_color: v }))}
                />
                <SelectField
                  label="Sternzeichen"
                  value={profileData.zodiac || ''}
                  options={ZODIAC_OPTIONS}
                  onChange={(v) => setProfileData(p => ({ ...p, zodiac: v }))}
                />
                <SelectField
                  label="Raucher"
                  value={profileData.smoker || ''}
                  options={SMOKER_OPTIONS}
                  onChange={(v) => setProfileData(p => ({ ...p, smoker: v }))}
                />
                <SelectField
                  label="Beziehungsstatus"
                  value={profileData.marital_status || ''}
                  options={MARITAL_OPTIONS}
                  onChange={(v) => setProfileData(p => ({ ...p, marital_status: v }))}
                />
                <SelectField
                  label="Tattoos"
                  value={profileData.tattoos || ''}
                  options={TATTOO_PIERCING_OPTIONS}
                  onChange={(v) => setProfileData(p => ({ ...p, tattoos: v }))}
                />
                <SelectField
                  label="Piercings"
                  value={profileData.piercings || ''}
                  options={TATTOO_PIERCING_OPTIONS}
                  onChange={(v) => setProfileData(p => ({ ...p, piercings: v }))}
                />
              </div>
            </section>

            {/* === Tags === */}
            <section className="bg-white border border-zinc-200 rounded-xl p-5">
              <h2 className="font-semibold text-zinc-900 mb-4">Was du suchst</h2>

              <TagSection
                title="Looking for"
                options={LOOKING_FOR_OPTIONS}
                isActive={(v) => isTagActive('looking_for', v)}
                onToggle={(v) => toggleArrayTag('looking_for', v)}
              />
              <TagSection
                title="Turn-ons"
                options={TURN_ONS_OPTIONS}
                isActive={(v) => isTagActive('turn_ons', v)}
                onToggle={(v) => toggleArrayTag('turn_ons', v)}
              />
              <TagSection
                title="Interessen"
                options={INTEREST_OPTIONS}
                isActive={(v) => isTagActive('interests', v)}
                onToggle={(v) => toggleArrayTag('interests', v)}
              />
            </section>
          </div>
        )}
      </main>

      {/* Sticky Save-Bar */}
      {!loading && profile && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/95 backdrop-blur border-t border-zinc-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 z-10">
          <div className="text-xs flex-1 min-w-0">
            {error && <span className="text-red-700">{error}</span>}
            {success && <span className="text-emerald-700">{success}</span>}
            {!error && !success && (
              <span className="text-zinc-500">Änderungen werden gespeichert wenn du auf "Speichern" klickst.</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Speichert…
              </>
            ) : (
              'Speichern'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function SelectField({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-zinc-600 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none"
      >
        <option value="">— nicht angegeben —</option>
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label, value, onChange, min, max,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  min?: number; max?: number;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-zinc-600 mb-1">{label}</span>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        min={min}
        max={max}
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none tabular-nums"
      />
    </label>
  );
}

function TagSection({
  title, options, isActive, onToggle,
}: {
  title: string;
  options: string[];
  isActive: (v: string) => boolean;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const active = isActive(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-700 border-zinc-300 hover:border-zinc-900'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
