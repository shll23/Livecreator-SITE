'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAccessToken,
  adminListPendingPhotos,
  adminApprovePhoto,
  adminRejectPhoto,
  getMe,
  APIError,
  type PendingPhoto,
} from '@/lib/api';
import Sidebar from '@/components/Sidebar';

// Build absolute URL for image from /storage/... path
function imageUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  return base + path;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `vor ${hr} Std.`;
  const d = Math.floor(hr / 24);
  return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`;
}

export default function PhotosModerationPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject-Modal
  const [rejectingPhoto, setRejectingPhoto] = useState<PendingPhoto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Lightbox
  const [lightbox, setLightbox] = useState<PendingPhoto | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const res = await adminListPendingPhotos();
      setPhotos(res.photos);
    } catch (err) {
      if (err instanceof APIError && err.code === 'unauthenticated') {
        router.push('/login');
        return;
      }
      if (err instanceof APIError && err.code === 'admin_required') {
        setError('Du hast keine Admin-Berechtigung.');
        return;
      }
      setError('Bilder konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push('/login');
      return;
    }
    getMe().then(me => setDisplayName(me?.display_name || 'Admin')).catch(() => {});
    loadPhotos();
  }, [router, loadPhotos]);

  async function handleApprove(id: string) {
    setProcessingId(id);
    setError(null);
    try {
      await adminApprovePhoto(id);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch {
      setError('Freigabe fehlgeschlagen.');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject() {
    if (!rejectingPhoto) return;
    setProcessingId(rejectingPhoto.id);
    setError(null);
    try {
      await adminRejectPhoto(rejectingPhoto.id, rejectReason.trim());
      setPhotos(prev => prev.filter(p => p.id !== rejectingPhoto.id));
      setRejectingPhoto(null);
      setRejectReason('');
    } catch {
      setError('Ablehnen fehlgeschlagen.');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="flex bg-zinc-50 min-h-screen">
      <Sidebar displayName={displayName} />

      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-zinc-900 tracking-tight">
              Foto-Moderation
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Neue Profilbilder zur Prüfung. Genehmige oder lehne ab.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold">
              Ausstehend
            </div>
            <div className="font-sans text-3xl font-semibold text-zinc-900 tabular-nums">
              {photos.length}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-zinc-500">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin" />
            Bilder werden geladen…
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-zinc-300 mb-3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <h3 className="font-semibold text-zinc-900">Alles erledigt</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Keine ausstehenden Bilder zur Moderation.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {photos.map(photo => (
              <div key={photo.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                {/* Bild (klickbar für Lightbox) */}
                <button
                  onClick={() => setLightbox(photo)}
                  className="block w-full aspect-[4/5] bg-zinc-100 overflow-hidden"
                >
                  <img
                    src={imageUrl(photo.thumb_path || photo.file_path)}
                    alt=""
                    className="w-full h-full object-cover hover:opacity-95 transition-opacity cursor-pointer"
                  />
                </button>

                {/* Creator + Meta */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="font-semibold text-zinc-900">
                      {photo.creator.display_name}
                      {photo.creator.age && (
                        <span className="text-zinc-500 font-normal"> · {photo.creator.age}</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {photo.creator.city && <>📍 {photo.creator.city} · </>}
                      Hochgeladen {timeAgo(photo.created_at)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 tabular-nums">
                    {photo.width && photo.height && (
                      <span>{photo.width}×{photo.height} px</span>
                    )}
                    <span>·</span>
                    <span>{formatBytes(photo.file_size_bytes)}</span>
                  </div>

                  {/* Aktionen */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleApprove(photo.id)}
                      disabled={processingId === photo.id}
                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Freigeben
                    </button>
                    <button
                      onClick={() => setRejectingPhoto(photo)}
                      disabled={processingId === photo.id}
                      className="flex-1 px-3 py-2 bg-white hover:bg-red-50 border border-zinc-300 hover:border-red-300 text-zinc-700 hover:text-red-700 text-sm font-medium rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Ablehnen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Reject-Modal */}
      {rejectingPhoto && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setRejectingPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold text-lg text-zinc-900 mb-1">
              Bild ablehnen
            </h2>
            <p className="text-sm text-zinc-500 mb-4">
              Gib einen Grund an, der {rejectingPhoto.creator.display_name} angezeigt wird.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="z.B. Bitte verwende ein klares Gesichts-Foto…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100 focus:outline-none resize-none"
              autoFocus
            />
            <div className="text-right text-[11px] text-zinc-400 mt-1 tabular-nums">
              {rejectReason.length} / 500
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setRejectingPhoto(null)}
                className="flex-1 px-4 py-2.5 border border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-lg text-sm font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processingId === rejectingPhoto.id}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {processingId === rejectingPhoto.id ? 'Wird abgelehnt…' : 'Ablehnen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <img
            src={imageUrl(lightbox.file_path)}
            alt=""
            className="max-w-full max-h-full object-contain"
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
