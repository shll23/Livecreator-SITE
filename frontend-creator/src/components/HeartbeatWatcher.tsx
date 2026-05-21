'use client';

import { useEffect } from 'react';
import { sendHeartbeat, getAccessToken } from '@/lib/api';

// ============================================================================
// HeartbeatWatcher
//
// Pingt das Backend alle 60 Sekunden mit /api/auth/heartbeat
// um Aktivitaets-Sessions zu tracken. Nur aktiv wenn eingeloggt.
//
// Sendet auch sofort einen Heartbeat wenn der Tab wieder fokussiert wird.
// Rendert nichts (returns null).
// ============================================================================
export default function HeartbeatWatcher() {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    function ping() {
      if (!getAccessToken()) return;
      sendHeartbeat().catch(() => {});
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') ping();
    }

    // Sofort beim Mount einmal pingen
    ping();
    // Alle 60s
    interval = setInterval(ping, 60_000);
    // Bei Tab-Fokus auch
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
