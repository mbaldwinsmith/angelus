// sw.js — Service Worker for offline support and background bells

const CACHE = 'angelus-v10';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=7',
  './app.js?v=8',
  './prayers.js?v=7',
  './streaks.js?v=7',
  './notifications.js?v=7',
  './audio.js?v=7',
  './manifest.json',
  './social-preview.png',
  './icons/favicon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/badge-72.png'
];

// ── Install: pre-cache all static assets ──────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old cache versions ────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for HTML, cache-first for assets ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const isNav = e.request.mode === 'navigate';

  if (isNav) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return res;
        });
      })
    );
  }
});

// ── Periodic Background Sync: fire bell at hour ───
self.addEventListener('periodicsync', e => {
  if (e.tag === 'angelus-bell') {
    e.waitUntil(maybeSendBellNotification());
  }
});

async function maybeSendBellNotification() {
  const h = new Date().getHours();
  const labels = { 6: 'Morning Angelus', 12: 'Midday Angelus', 18: 'Evening Angelus' };
  if (!(h in labels)) return;
  return self.registration.showNotification(labels[h], {
    body: 'The angel of the Lord declared unto Mary…',
    icon: './icons/icon-192.png',
    badge: './icons/badge-72.png',
    tag: `angelus-bell-${h}`,
    renotify: true,
    silent: false
  });
}

// ── Notification click: focus or open app ─────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});
