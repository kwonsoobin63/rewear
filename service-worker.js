const CACHE_NAME = 'rewear-v1';
const ASSETS = ['./', './index.html', './style.css', './app.js', './config.js', './manifest.webmanifest', './icon.svg', './icon-maskable.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
