const CACHE = 'tliapp-v1';
const SHELL = ['/', '/index.html', '/logo.png', '/manifest.json'];

// Al instalar: guarda el shell en cache
self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
    self.skipWaiting();
});

// Al activar: borra caches viejos
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch: network-first para mismo origen, pasa directo para CDN/Firebase
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    // Solo interceptar recursos del mismo dominio
    if (url.hostname !== self.location.hostname) return;

    e.respondWith(
        fetch(e.request)
            .then(res => {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, copy));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
