// Simple service worker to satisfy PWA requirements
const CACHE_NAME = 'teachdz-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
});

self.addEventListener('fetch', (event) => {
  // Pass-through strategy - just enough to make it installable
  event.respondWith(fetch(event.request));
});
