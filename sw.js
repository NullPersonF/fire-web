const CACHE = "fire-web-v2";
const ASSETS = ["./", "./index.html", "./styles.css", "./manifest.webmanifest", "./src/app.js", "./src/storage.js", "./src/domain.js"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request))));
