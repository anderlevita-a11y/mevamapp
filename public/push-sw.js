// Custom Web Push handlers for MEVAM Itapema Sertão.
// Injected into the Workbox-generated service worker via vite-plugin-pwa's
// "workbox.importScripts" option (see vite.config.ts). This file is copied
// as-is from /public to the build output root, so it lives at /push-sw.js
// alongside the generated /sw.js and is pulled in via importScripts().
//
// Without this, the generated sw.js only handles asset caching — it never
// listens for the "push" event, so a Web Push arriving while the app is
// closed or in the background is silently dropped by the browser: nothing
// tells it to actually display a notification.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: 'MEVAM Itapema Sertão', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'MEVAM Itapema Sertão';
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    tag: data.tag || 'mevam-aviso',
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
