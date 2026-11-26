// PWA Service Worker Core for TeachDZ (Background Push + Audio & Text Alerts)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

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
  const isMessage = data.type === 'message';
  const targetUrl =
    isMessage || isCall
      ? data.roomId
        ? `/?openChat=${encodeURIComponent(data.roomId)}`
        : data.senderId
        ? `/?openChat=${encodeURIComponent(data.senderId)}`
        : '/?openChat=1'
      : data.url || '/notifications';

  const options = {
    body: data.body || 'لديك إشعار جديد في منصة TeachDZ',
    icon: data.icon || '/prof_dali_logo.png',
    badge: data.badge || '/icon-192x192.png',
    vibrate: isCall ? [500, 150, 500, 150, 500] : [250, 100, 250, 100, 300],
    silent: false, // Triggers OS notification sound even when app is completely closed
    renotify: true,
    requireInteraction: isCall,
    timestamp: Date.now(),
    dir: 'rtl',
    lang: 'ar',
    tag: data.tag || `teachdz-notif-${Date.now()}`,
    data: {
      url: targetUrl,
      type: data.type || 'general',
      roomId: data.roomId || null,
      senderId: data.senderId || null
    },
    actions: [
      { action: 'open', title: isCall ? 'الرد الآن' : isMessage ? 'رد سريع / فتح' : 'فتح وعرض' }
    ]
  };

  const badgeTask =
    self.navigator && typeof self.navigator.setAppBadge === 'function'
      ? self.navigator.setAppBadge(data.badgeCount || 1).catch(() => {})
      : Promise.resolve();

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      badgeTask,
      // Notify any open/minimized tabs so they can play crisp in-app chimes immediately
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

  const clearBadgeTask =
    self.navigator && typeof self.navigator.clearAppBadge === 'function'
      ? self.navigator.clearAppBadge().catch(() => {})
      : Promise.resolve();

  event.waitUntil(
    Promise.all([
      clearBadgeTask,
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if ('focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              payload: notifData
            });
            if (urlToOpen && urlToOpen !== '/' && !urlToOpen.startsWith('/?openChat') && 'navigate' in client) {
              return client.navigate(urlToOpen);
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
    ])
  );
});

self.addEventListener('pushsubscriptionchange', function(event) {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch('/api/push/vapid-public-key');
        if (!res.ok) return;
        const { publicKey } = await res.json();
        if (!publicKey) return;

        const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        const keyArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) keyArray[i] = rawData.charCodeAt(i);

        const newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyArray.buffer
        });

        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: newSub.toJSON()
          });
        });
      } catch (err) {
        // Will re-sync next time user opens app
      }
    })()
  );
});
