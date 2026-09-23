// =======================================================================
//  sw.js — Service Worker para Generador de Plantillas & QR Studio
// =======================================================================

const CACHE_NAME = 'plantillas-pdf-v1.0.0';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './qr.js',
  './merge.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// Instalación: guardar activos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Algunos recursos no pudieron precachearse:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés antiguas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de Fetch: Stale-While-Revalidate con fallback a red
self.addEventListener('fetch', event => {
  // Ignorar peticiones no GET o esquemas extraños (chrome-extension, etc.)
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Petición a la red en segundo plano para actualizar caché
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(err => {
        // En caso de estar offline y no haber caché
        return cachedResponse;
      });

      // Retornar caché inmediatamente si existe, si no esperar a la red
      return cachedResponse || fetchPromise;
    })
  );
});
