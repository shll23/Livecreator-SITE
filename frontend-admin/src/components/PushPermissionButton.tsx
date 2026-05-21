'use client';

import { useEffect, useState } from 'react';
import { getVapidPublicKey, subscribePush, unsubscribePush, getAccessToken } from '@/lib/api';

// ============================================================================
// PushPermissionButton
//
// Zeigt einen Button um Push-Notifications zu aktivieren/deaktivieren.
// Setzt voraus dass der Service Worker (/sw.js) schon registriert ist.
//
// Status:
//   - "blocked": User hat im Browser geblockt -> Hinweis
//   - "denied": noch nicht gefragt, oder default
//   - "granted": aktiv, sub vorhanden
// ============================================================================
type Status = 'idle' | 'subscribing' | 'subscribed' | 'unsubscribing' | 'blocked';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

export default function PushPermissionButton({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState<Status>('idle');
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false);
      return;
    }
    setSupported(true);

    // Aktuellen Subscription-Status pruefen
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (Notification.permission === 'denied') {
          setStatus('blocked');
        } else if (sub) {
          setStatus('subscribed');
        } else {
          setStatus('idle');
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  async function enable() {
    setError(null);
    if (!getAccessToken()) {
      setError('Bitte melde dich an.');
      return;
    }
    setStatus('subscribing');

    try {
      // 1. Permission abfragen
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'blocked' : 'idle');
        return;
      }

      // 2. Public-Key holen
      const vapidKey = await getVapidPublicKey();

      // 3. Subscribe
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      // 4. Subscription zum Backend senden
      await subscribePush(sub.toJSON() as PushSubscriptionJSON);
      setStatus('subscribed');
    } catch (e: any) {
      console.error('[push] subscribe failed:', e);
      setError(e?.message || 'Fehler beim Aktivieren.');
      setStatus('idle');
    }
  }

  async function disable() {
    setError(null);
    setStatus('unsubscribing');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint).catch(() => {});
        await sub.unsubscribe();
      }
      setStatus('idle');
    } catch (e: any) {
      console.error('[push] unsubscribe failed:', e);
      setError(e?.message || 'Fehler beim Deaktivieren.');
      setStatus('subscribed');
    }
  }

  if (!supported) {
    return (
      <div className={`text-xs text-zinc-500 ${className}`}>
        Dein Browser unterstuetzt keine Push-Benachrichtigungen.
      </div>
    );
  }

  if (status === 'blocked') {
    return (
      <div className={`text-xs text-amber-700 ${className}`}>
        Push-Benachrichtigungen sind im Browser blockiert. Bitte in den Browser-Einstellungen aktivieren.
      </div>
    );
  }

  return (
    <div className={className}>
      {status === 'subscribed' ? (
        <button
          onClick={disable}
          disabled={(status as Status) === 'unsubscribing'}
          className="text-xs font-medium px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition disabled:opacity-50"
        >
          {(status as Status) === 'unsubscribing' ? 'Wird deaktiviert ...' : 'Push-Benachrichtigungen aktiv (deaktivieren)'}
        </button>
      ) : (
        <button
          onClick={enable}
          disabled={(status as Status) === 'subscribing'}
          className="text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 transition disabled:opacity-50"
        >
          {(status as Status) === 'subscribing' ? 'Wird aktiviert ...' : '🔔 Push-Benachrichtigungen aktivieren'}
        </button>
      )}
      {error && <div className="text-[11px] text-red-600 mt-1">{error}</div>}
    </div>
  );
}
