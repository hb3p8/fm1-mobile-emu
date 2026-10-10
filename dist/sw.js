// SPDX-License-Identifier: GPL-3.0-only
// Offline cache. assemble.py fills in VERSION (a hash of every file below) and FILES, so any
// rebuild changes this script; the browser notices on the next online launch, installs the new
// files next to the old ones and the page switches over (see mobile.js).
const VERSION = "a595c43f9207aeb3";
const FILES = ["index.html", "style.css", "app.js", "manifest.webmanifest", "icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "fw/flash-worklet.js", "fw/x0x/x0x.wasm", "fw/x0x/worklet.js", "fw/felucca/felucca.wasm", "fw/sloop/sloop.wasm", "fw/fimba/kalimba.wasm", "fw/fimba/worklet.js", "BarlowSemiCondensed-Medium.ttf", "BarlowSemiCondensed-SemiBold.ttf", "Barlow-OFL.txt", "LICENSE.txt", "LICENSING.md"];
const CACHE = "fm1-x0x-" + VERSION;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Bypass the HTTP cache so a new version never stores an older copy of a file.
    await cache.addAll(FILES.map((file) => new Request(file, { cache: "reload" })));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith("fm1-x0x-") && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// Cached files are served from the cache (they only change together with this script);
// anything else, like the source archive, comes from the network.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true }) ||
      (request.mode === "navigate" && url.pathname.endsWith("/") ? await cache.match("index.html") : undefined);
    return cached || fetch(request);
  })());
});
