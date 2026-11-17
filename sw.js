// v2: the v1 worker served every cached file first and never refreshed it, so a
// phone that opened the app once kept that day's code and video catalog
// (old Drive ids, missing clips). Bumping the name makes activate drop v1.
const CACHE_NAME = "trainerhub-v2";
const APP_SHELL_FILES = [
	"./",
	"./index.html",
	"./reserves.html",
	"./journal.html",
	"./exercises.html",
	"./js/core.js",
	"./js/session-builder.js",
	"./js/journal-storage.js",
	"./js/session-tracker.js",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(APP_SHELL_FILES))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((cacheNames) =>
				Promise.all(
					cacheNames.map((name) => {
						if (name !== CACHE_NAME) {
							return caches.delete(name);
						}
						return null;
					}),
				),
			)
			.then(() => self.clients.claim()),
	);
});

// Network first: online, every request goes to the network and the fresh copy
// replaces the cached one, so a deploy (new clips, fixed video ids) reaches the
// phone on the next load. The cache only answers when the network fails
// (offline), which keeps the offline workout loop working.
self.addEventListener("fetch", (event) => {
	const req = event.request;
	if (req.method !== "GET") {
		return;
	}
	// Byte-range requests (video seeking) go straight to the network.
	if (req.headers && typeof req.headers.get === "function" && req.headers.get("range")) {
		return;
	}

	event.respondWith(
		fetch(req)
			.then((networkResponse) => {
				if (
					networkResponse &&
					networkResponse.status === 200 &&
					(networkResponse.type === "basic" ||
						networkResponse.type === "cors")
				) {
					const responseToCache = networkResponse.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(req, responseToCache);
					});
				}
				return networkResponse;
			})
			.catch(async () => {
				const cached =
					(await caches.match(req)) ||
					(await caches.match(req, { ignoreSearch: true }));
				if (cached) return cached;
				if (req.mode === "navigate") {
					const fallbackNav =
						(await caches.match("./index.html")) ||
						(await caches.match("index.html"));
					if (fallbackNav) return fallbackNav;
				}
				return new Response("Offline fallback", {
					status: 503,
					statusText: "Service Unavailable",
					headers: { "Content-Type": "text/plain; charset=utf-8" },
				});
			}),
	);
});

self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});
