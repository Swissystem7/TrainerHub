const CACHE_NAME = "trainerhub-v1";
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

self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") {
		return;
	}

	event.respondWith(
		caches.match(event.request).then((cachedResponse) => {
			if (cachedResponse) {
				return cachedResponse;
			}
			return fetch(event.request)
				.then((networkResponse) => {
					if (
						networkResponse &&
						networkResponse.status === 200 &&
						(networkResponse.type === "basic" ||
							networkResponse.type === "cors")
					) {
						const responseToCache = networkResponse.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(event.request, responseToCache);
						});
					}
					return networkResponse;
				})
				.catch(async () => {
					const cached = await caches.match(event.request);
					if (cached) return cached;
					if (event.request.mode === "navigate") {
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
				});
		}),
	);
});

self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});
