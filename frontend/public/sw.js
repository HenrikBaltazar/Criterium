/* Criterium service worker — runtime caching (works with Vite's hashed asset names).
   API endpoints never cached; everything else network-first with offline fallback. */
const CACHE = 'criterium-rt-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()))
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname.startsWith('/api/')) return    // never cache auth/data

  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()))
    return res
  }).catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html'))))
})
