// Al cambiar la versión, el navegador instala un SW nuevo y borra las cachés viejas.
const VERSION = "v4";
const SHELL_CACHE = `shell-${VERSION}`; // archivos de la app (HTML, CSS, JS, iconos)
const DATA_CACHE = `data-${VERSION}`; // respuestas de la API

// El "app shell": lo mínimo para que la app abra sin red.
const SHELL_ASSETS = [
    "/",
    "/index.html",
    "/login.html",
    "/registro.html",
    "/js/register.js",
    "/js/pwa.js",
    "/manifest.webmanifest",
    "/icons/meditunja.svg"
];

/* ---- 1. INSTALL: se ejecuta una vez, al registrar el SW ---- */
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting())
    );
});

/* ---- 2. ACTIVATE: limpieza de versiones anteriores ---- */
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

/* ---- 3. FETCH: se dispara en CADA petición de la app ---- */
self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== "GET" || url.origin !== self.location.origin) return;

    // --- Estrategia A: network-first para la API ---
    // Los datos deben ser frescos; la caché es solo el plan B si no hay red.
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(networkFirst(request));
        return;
    }

    // --- Estrategia B: cache-first para el resto (HTML, CSS, JS, iconos) ---
    // Estos archivos casi no cambian: responder desde caché es instantáneo.
    event.respondWith(cacheFirst(request));
});

/** Intenta la red; si falla, responde con la última copia guardada. */
async function networkFirst(request) {
    const cache = await caches.open(DATA_CACHE);
    try {
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
    } catch {
        const cached = await cache.match(request);
        if (cached) return cached;

        return new Response(JSON.stringify({ error: "Sin conexión y sin datos en caché" }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
        });
    }
}

/** Responde desde caché; si no está, va a la red y la guarda. */
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(request, response.clone());
        return response;
    } catch {
        if (request.mode === "navigate") {
            const offline = await caches.match("/offline.html");
            if (offline) return offline;
        }
        return Response.error();
    }
}