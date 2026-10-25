/* RADA service worker: makes repeat launches fast and gives an offline shell.
 * No build step needed. Bump VERSION to force every device to drop old caches. */
const VERSION = 'rada-v2';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const RUNTIME = `${VERSION}-runtime`;
const RUNTIME_MAX_ENTRIES = 120;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map((k) => cache.delete(k)));
}

// Hashed build files never change: serve from cache first.
async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  // Never let a stalled request hang a tab forever: give up after 12s so the app can retry.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(request, { signal: ctrl.signal });
    // Only cache real assets. A missing hashed file can come back as index.html (200) and must not be kept.
    const type = res.headers.get('content-type') || '';
    if (res.ok && !type.includes('text/html')) cache.put(request, res.clone());
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Fonts, icon CSS, map library, images: show the cached copy now, refresh it in the background.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok || res.type === 'opaque') {
        cache.put(request, res.clone()).then(() => trim(RUNTIME, RUNTIME_MAX_ENTRIES));
      }
      return res;
    })
    .catch(() => hit);
  return hit || refresh;
}

// Page loads: always try the network (so new deploys show up), fall back to the cached shell offline.
async function networkFirstPage(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put('/', res.clone());
    return res;
  } catch {
    return (await cache.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache live data: Supabase REST/auth/realtime/functions, our own API, anything with a range header (media).
  if (url.hostname.endsWith('.supabase.co') && !url.pathname.startsWith('/storage/v1/object/public/')) return;
  if (url.pathname.startsWith('/api/')) return;
  if (request.headers.has('range')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(request));
      return;
    }
    if (/\.(svg|jpg|jpeg|png|webp|ico|json)$/.test(url.pathname) && url.pathname !== '/sw.js') {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }

  const host = url.hostname;
  const cacheable =
    host === 'fonts.googleapis.com' ||
    host === 'fonts.gstatic.com' ||
    host === 'cdnjs.cloudflare.com' ||
    host === 'unpkg.com' ||
    host.endsWith('basemaps.cartocdn.com') ||
    host === 'images.unsplash.com' ||
    (host.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/')) ||
    request.destination === 'image';
  if (cacheable) event.respondWith(staleWhileRevalidate(request));
});
