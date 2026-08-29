const CACHE_NAME = 'rewear-v14';
const ASSETS = ['./', './index.html', './style.css', './platform.css', './platform.js', './wardrobe.html', './current.html', './market.html', './fabric.html', './config.js', './firebase-auth.js', './manifest.webmanifest', './icon.svg', './icon-maskable.svg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const isAppShell = event.request.mode === 'navigate' || /\.(html|js|css)$/.test(new URL(event.request.url).pathname);
  event.respondWith(isAppShell ? fetch(event.request).catch(() => caches.match(event.request)) : caches.match(event.request).then(cached => cached || fetch(event.request)));
});
