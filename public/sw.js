// PWA Service Worker Core for TeachDZ (Background Push + Audio & Text Alerts)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through GET requests without interfering with POST/API mutations
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'TeachDZ', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'TeachDZ - تنبيه جديد';
  const isCall = data.type === 'call';

  const options = {
    body: data.body || 'لديك إشعار جديد في منصة TeachDZ',
    icon: data.icon || '/prof_dali_logo.png',
    badge: data.badge || '/icon-192x192.png',
    vibrate: isCall ? [400, 150, 400, 150, 400] : [250, 100, 250, 100, 300],
    silent: false, // Triggers OS notification sound even when app is completely closed
    renotify: true,
    requireInteraction: isCall,
    timestamp: Date.now(),
    dir: 'rtl',
    lang: 'ar',
    tag: data.tag || `teachdz-notif-${Date.now()}`,
    data: {
      url: data.url || '/',
      type: data.type || 'general',
      roomId: data.roomId || null,
      senderId: data.senderId || null
    },
    actions: [
      { action: 'open', title: isCall ? 'الرد الآن' : 'فتح وعرض' }
    ]
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Also notify any open/minimized tabs so they can play crisp in-app chimes immediately
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        windowClients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_RECEIVED',
            payload: data
          });
        });
      })
    ])
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const notifData = event.notification.data || {};
  const urlToOpen = typeof notifData === 'string' ? notifData : (notifData.url || '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            payload: notifData
          });
          if (urlToOpen && urlToOpen !== '/' && 'navigate' in client) {
            return client.navigate(urlToOpen);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
