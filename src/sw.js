const SHELL_CACHE = 'vapedown-shell-v1';
const DATA_CACHE  = 'vapedown-data-v1';

const WB_MANIFEST = self.__WB_MANIFEST || [];
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  ...WB_MANIFEST.map((e) => (typeof e === 'string' ? e : e.url)),
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) { e.respondWith(networkFirst(request)); return; }
  if (['script','style','font','image'].includes(request.destination)) { e.respondWith(cacheFirst(request)); return; }
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('/index.html').then((r) => r || caches.match('/offline.html'))));
  }
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) (await caches.open(SHELL_CACHE)).put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(DATA_CACHE)).put(req, res.clone());
    return res;
  } catch {
    return (await caches.match(req)) || new Response(JSON.stringify({ offline: true }), { headers: { 'Content-Type': 'application/json' } });
  }
}

self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-logs') e.waitUntil(syncPending());
});

async function syncPending() {
  try {
    const db = await openIDB();
    const items = await db.getAll('pending_logs');
    for (const item of items) {
      try {
        await fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
        await db.delete('pending_logs', item.id);
      } catch {}
    }
  } catch {}
}

self.addEventListener('push', (e) => {
  if (!e.data) return;
  const d = e.data.json();
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: '/icons/192.png',
    badge: '/icons/192.png',
    tag: d.tag || 'vapedown',
    requireInteraction: d.urgent || false,
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.matchAll({ type: 'window' }).then((wins) => {
    const w = wins.find((x) => x.url === url);
    return w ? w.focus() : clients.openWindow(url);
  }));
});

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('vapedown', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending_logs')) db.createObjectStore('pending_logs', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      resolve({
        getAll: (s) => new Promise((r) => { const tx = db.transaction(s,'readonly'); tx.objectStore(s).getAll().onsuccess = (e) => r(e.target.result); }),
        delete: (s, k) => new Promise((r) => { const tx = db.transaction(s,'readwrite'); tx.objectStore(s).delete(k).onsuccess = r; }),
      });
    };
    req.onerror = reject;
  });
}
