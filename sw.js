/* =========================================================
   sw.js — service worker
   Guarda una copia local de todos los archivos de la app
   (incluida la librería de Excel) para que, después de la
   primera vez que se abre con internet, funcione 100%
   sin conexión, incluso en modo avión.
   ========================================================= */

const CACHE_NAME = "inventario-offline-v2";

const ARCHIVOS_A_GUARDAR = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/icons.js",
  "./js/db.js",
  "./js/auth.js",
  "./js/theme.js",
  "./js/inventario.js",
  "./js/movimientos.js",
  "./js/auditoria.js",
  "./js/usuarios.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_A_GUARDAR))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: cache primero, y si no está, va a la red (y la guarda para la próxima)
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((respuestaCache) => {
      if (respuestaCache) return respuestaCache;
      return fetch(event.request)
        .then((respuestaRed) => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return respuestaRed;
        })
        .catch(() => respuestaCache);
    })
  );
});
