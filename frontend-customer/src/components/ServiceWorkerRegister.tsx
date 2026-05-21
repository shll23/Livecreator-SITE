'use client';

import { useEffect } from 'react';

// ============================================================================
// ServiceWorkerRegister
//
// Registriert den Service Worker (/sw.js) beim Start der App.
// Nur in Produktion und wenn der Browser es unterstuetzt.
// ============================================================================
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Erst nach 'load' registrieren um Initial-Page nicht zu verlangsamen
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[SW] registriert', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] Registrierung fehlgeschlagen:', err);
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
