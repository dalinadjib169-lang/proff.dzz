
// PWA Service Worker Core for TeachDZ

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through fetch listener to satisfy Chrome PWA installability requirements
  // without interfering with the app's dynamic assets or API calls
  event.respondWith(
    fetch(event.request).catch(() => {
      // Offline fallback can go here if needed
    })
  );
});

self.addEventListener('push', function(event) {
  const data = event.data?.json() ?? {};
  const title = data.title || 'تنبیه جديد';
  const options = {
    body: data.body || '',
    icon: '/prof_dali_logo.png',
    badge: '/prof_dali_logo.png',
    data: data.url,
    tag: data.tag || 'general-notif',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
