/* =========================================================
   sw.js — service worker
   Guarda una copia local de todos los archivos de la app para
   que funcione sin conexión. Pero para los archivos PROPIOS
   (html/css/js) usa "red primero": si hay internet, siempre
   trae la versión más nueva y la guarda; solo si no hay
   conexión usa la copia guardada. Así, cuando se actualiza la
   app, el teléfono la ve apenas tenga señal — no se queda con
   una versión vieja pegada.
   ========================================================= */

const CACHE_NAME = "inventario-offline-v4";

const ARCHIVOS_A_GUARDAR = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/icons.js",
  "./js/db.js",
  "./js/auth.js",
  "./js/theme.js",
  "./js/almacenes.js",
  "./js/inventario.js",
  "./js/consulta.js",
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
  // Ojo: aquí NO se llama a skipWaiting() automáticamente — así, si hay
  // una pestaña abierta con la versión vieja, esta nueva versión espera
  // hasta que el usuario toque "Actualizar" (ver banner en la app).
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.tipo === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function esArchivoPropio(url) {
  return url.origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (esArchivoPropio(url)) {
    // Red primero (con copia de respaldo en caché para cuando no haya señal)
    event.respondWith(
      fetch(event.request)
        .then((respuestaRed) => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return respuestaRed;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Librerías externas (ej. xlsx): caché primero, así no dependen de internet
    event.respondWith(
      caches.match(event.request).then((respuestaCache) => {
        if (respuestaCache) return respuestaCache;
        return fetch(event.request).then((respuestaRed) => {
          const copia = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return respuestaRed;
        });
      })
    );
  }
});
