/// <reference lib="webworker" />
declare let self: ServiceWorkerGlobalScope;

// This replaces the import for workbox if we were injecting it, but for our simple push needs
// we just listen to events. If using VitePWA with 'injectManifest', we must import the manifest.
import { precacheAndRoute } from 'workbox-precaching';

// @ts-ignore: __WB_MANIFEST is injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST || []);

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options: any = {
      body: data.body,
      icon: data.icon || '/wasla-logo.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
      vibrate: [100, 50, 100],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'إشعار جديد', options)
    );
  } catch (err) {
    // Fallback if data is not JSON
    event.waitUntil(
      self.registration.showNotification('وصلة تك: إشعار جديد', {
        body: event.data.text()
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const matchingClient = windowClients.find((client) => client.url === urlToOpen);
      if (matchingClient) {
        return matchingClient.focus();
      }
      return self.clients.openWindow(urlToOpen);
    })
  );
});
