/* TrainerHub service worker – offline app shell + watched-video cache. No server, no keys. */
'use strict';
const VERSION = 'th-2026-11-05-1';
const SHELL = 'th-shell-' + VERSION;
const MEDIA = 'th-media-v1';
const MEDIA_MAX = 40;
const PRECACHE = [
  './',
  './index.html', './booklet.html', './exercises.html', './journal.html', './library.html',
  './manage.html', './offer.html', './pitch.html', './scan.html', './site-scan.html',
  './weekly.html', './workout-print.html',
  './frontend/index.html', './frontend/workout-mode.html',
  './frontend/netanya-opening.js', './frontend/parse-workout.js', './frontend/saved-workouts.js',
  './css/app.css',
  './js/analyzer.js', './js/booklet.js', './js/contact.js', './js/core.js', './js/feedback.js',
  './js/infer.js', './js/ingest.js', './js/journal-storage.js', './js/pilot.js', './js/profile.js',
  './js/prompt-parser.js', './js/pwa.js', './js/ready-workouts.js', './js/reel-library.js',
  './js/rules-with-sources.js', './js/scan-match.js', './js/sentry-init.js', './js/session-builder.js',
  './js/session-tracker.js', './js/site-plan.js', './js/site-profile.js', './js/site-scan.js',
  './js/catalog.json', './js/ready-workouts.json',
  './data/exercises.json', './data/drive_videos.json', './data/reels_queue.json',
  './videos/drive-catalog.json',
  './manifest.json', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(SHELL).then(function (cache) {
    return cache.addAll(PRECACHE.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('th-shell-') === 0 && k !== SHELL; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'VERSION' && event.source) event.source.postMessage({ type: 'VERSION', version: VERSION });
});

function isMedia(request, url) {
  return request.destination === 'video' || request.destination === 'image' ||
    /\.(mp4|webm|mov|m4v|jpg|jpeg|png|webp)$/i.test(url.pathname) ||
    /googleusercontent\.com|drive\.google\.com\/(uc|thumbnail)/.test(url.href);
}

function trimMedia(cache) {
  return cache.keys().then(function (keys) {
    if (keys.length <= MEDIA_MAX) return;
    return Promise.all(keys.slice(0, keys.length - MEDIA_MAX).map(function (k) { return cache.delete(k); }));
  });
}

self.addEventListener('fetch', function (event) {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Watched videos/posters: cache-first, store full (non-range) responses after watching.
  if (isMedia(request, url) && !(url.origin === self.location.origin && /\/icons\//.test(url.pathname))) {
    if (request.headers.has('range')) {
      event.respondWith(caches.open(MEDIA).then(function (cache) {
        return cache.match(request.url).then(function (hit) { return hit || fetch(request); });
      }));
      return;
    }
    event.respondWith(caches.open(MEDIA).then(function (cache) {
      return cache.match(request).then(function (hit) {
        if (hit) return hit;
        return fetch(request).then(function (res) {
          if (res && (res.ok || res.type === 'opaque') && res.status !== 206) {
            cache.put(request, res.clone()).then(function () { return trimMedia(cache); });
          }
          return res;
        });
      });
    }));
    return;
  }

  if (url.origin !== self.location.origin) {
    // Fonts etc.: stale-while-revalidate in the media cache.
    if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
      event.respondWith(caches.open(MEDIA).then(function (cache) {
        return cache.match(request).then(function (hit) {
          const net = fetch(request).then(function (res) { cache.put(request, res.clone()); return res; })
            .catch(function () { return hit; });
          return hit || net;
        });
      }));
    }
    return;
  }

  // Data JSON: network-first (fresh catalog), fall back to the precached copy offline.
  if (/\.json$/.test(url.pathname) && !/manifest\.json$/.test(url.pathname)) {
    event.respondWith(fetch(request).then(function (res) {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(function (c) { c.put(new Request(url.origin + url.pathname), copy); }); }
      return res;
    }).catch(function () { return caches.match(request, { ignoreSearch: true }); }));
    return;
  }

  // App shell: cache-first (ignoring ?v= cache-busters); navigations fall back to index.html.
  event.respondWith(caches.match(request, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(request).catch(function () {
      if (request.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    });
  }));
});
