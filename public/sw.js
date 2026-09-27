const CACHE_NAME = "anbar-water-projects-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/anbar-water-logo.jpg",
  "/offline.html"
];

// Install event: Pre-cache core static assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Cache addAll warning:", err);
      });
    })
  );
});

// Activate event: Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event: Network-first for navigation/data, cache-first for static assets, fallback to offline.html
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Ignore non-GET requests, extensions, or local development on localhost
  if (request.method !== "GET" || !request.url.startsWith("http") || request.url.includes("localhost") || request.url.includes("127.0.0.1") || request.url.includes(":8080")) return;

  // Handle navigation HTML requests
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await cache.match("/offline.html");
          if (offlinePage) return offlinePage;
          return new Response("أنت غير متصل بالإنترنت حالياً", {
            status: 533,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        })
    );
    return;
  }

  // Handle static assets (JS, CSS, Images, Fonts) -> Cache First, Network Fallback
  const isStaticAsset =
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font" ||
    request.url.includes("/assets/");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default Stale-While-Revalidate for other GET requests
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
