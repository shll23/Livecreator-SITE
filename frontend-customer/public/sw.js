// Service Worker fuer verliebdich
// Aktuell: Minimal-Setup. Push-Logic kommt in G6/G7.

const CACHE_NAME = 'customer-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push-Event Handler (wird in G7 fertig konfiguriert)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'verliebdich', body: event.data.text() };
  }

  const options = {
    body: payload.body || '',
    icon: '/pwa/icon-192.png',
    badge: '/pwa/icon-192.png',
    data: payload.data || {},
    tag: payload.tag,
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'verliebdich', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
