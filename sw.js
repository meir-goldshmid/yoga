// Offline support. App files: network first (so updates arrive), cache when offline. Fonts: cache first.
const CACHE = 'yoga-v1';
const FILES = ['./', 'index.html', 'manifest.json', 'css/style.css', 'icons/icon.svg', 'icons/icon-192.png',
  'js/app.js', 'js/ui.js', 'js/store.js', 'js/figure.js', 'js/poses.js', 'js/flows.js', 'js/play.js', 'js/audio.js', 'js/config.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.status === 200) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
