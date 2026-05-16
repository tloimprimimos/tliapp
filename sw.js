const CACHE = 'tliapp-v2';
const STATIC = ['/logo.png', '/manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// index.html: siempre de la red (nunca desde caché)
// Estáticos (logo, manifest): caché primero, red como fallback
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    if (url.hostname !== self.location.hostname) return;

    const isStatic = STATIC.some(p => url.pathname === p);

    if (isStatic) {
        e.respondWith(
            caches.match(e.request).then(cached =>
                cached || fetch(e.request).then(res => {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(e.request, copy));
                    return res;
                })
            )
        );
    }
    // Para index.html y todo lo demás: no interceptar, deja que el browser lo maneje
});

// Cuando el SW se actualiza, notifica a todos los clientes para que recarguen
self.addEventListener('message', e => {
    if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
