// v3: the whole app now works offline. v2 cached only 4 pages and 4 scripts, so a phone that went
// offline lost the other pages, the stylesheet, the data files and the fonts. Bumping the name makes
// activate drop v2.
//
// What is cached at install:
//   CORE_FILES   must all arrive, or the worker does not install (the builder page and its basics).
//   Other groups are best effort: one failing group (a slow connection) does not block the install,
//   and any file missing here is still stored the first time it is fetched online.
// Not cached on purpose: videos and posters (large, range requests), and cross-origin files
// (Google Drive, Instagram, YouTube, the Sentry bundle). test/sw-offline-shell.test.js keeps this
// list complete: every local script, stylesheet and page the app uses must be in it.
const CACHE_NAME = 'trainerhub-v3';

const CORE_FILES = [
  './',
  './index.html',
  './css/app.css',
  './css/fonts.css',
  './fonts/heebo-hebrew.woff2',
  './fonts/heebo-latin.woff2',
  './fonts/heebo-latin-ext.woff2',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
  './js/core.js',
  './js/session-builder.js',
  './js/journal-storage.js',
  './js/session-tracker.js',
  './js/th-nav.js'
];

const PAGE_FILES = [
  './booklet.html',
  './exercises.html',
  './journal.html',
  './library.html',
  './manage.html',
  './offer.html',
  './pitch.html',
  './privacy.html',
  './reserves.html',
  './scan.html',
  './site-scan.html',
  './weekly.html',
  './workout-print.html',
  './frontend/index.html',
  './frontend/workout-mode.html'
];

const SCRIPT_FILES = [
  './js/adaptation-engine.js',
  './js/analyzer.js',
  './js/benchmark-checkin.js',
  './js/booklet.js',
  './js/coach-profiles.js',
  './js/consent.js',
  './js/contact.js',
  './js/custom-templates.js',
  './js/exercise-card-fallback.js',
  './js/feedback.js',
  './js/group-scoreboard.js',
  './js/infer.js',
  './js/ingest.js',
  './js/joint-prep.js',
  './js/library-profile-filter.js',
  './js/live-media-panel.js',
  './js/live-tempo-cue.js',
  './js/live-workout.js',
  './js/muscle-balance.js',
  './js/natural-workout-flow.js',
  './js/pilot.js',
  './js/plan-link-codec.js',
  './js/profile.js',
  './js/progression-engine.js',
  './js/prompt-parser.js',
  './js/ready-workouts.js',
  './js/reel-library.js',
  './js/reserves-planner.js',
  './js/reserves-readiness-ui.js',
  './js/reserves-track.js',
  './js/rules-with-sources.js',
  './js/scan-match.js',
  './js/sentry-init.js',
  './js/session-rpe.js',
  './js/site-plan.js',
  './js/site-profile.js',
  './js/site-scan.js',
  './js/superset-builder.js',
  './js/tempo-volume.js',
  './js/warmup-generator.js',
  './js/whatsapp-share.js',
  './js/workout-timer-ui.js',
  './frontend/netanya-opening.js',
  './frontend/parse-workout.js',
  './frontend/saved-workouts.js'
];

const DATA_FILES = [
  './js/catalog.json',
  './js/ready-workouts.json',
  './data/exercises.json',
  './data/drive_videos.json',
  './content/adaptation-templates.json',
  './content/booklet/team-safety-file.json',
  './content/reserves/miluim-track.json',
  './videos/drive-catalog.json',
  './videos/media-manifest.json',
  './videos/youtube-catalog.json',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

const APP_SHELL_FILES = [...CORE_FILES, ...PAGE_FILES, ...SCRIPT_FILES, ...DATA_FILES];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(CORE_FILES).then(() =>
          // Best effort, one group at a time: a failed group is skipped, not fatal.
          [PAGE_FILES, SCRIPT_FILES, DATA_FILES].reduce(
            (chain, group) => chain.then(() => cache.addAll(group).catch(() => null)),
            Promise.resolve()
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
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
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Network first: online, every request goes to the network and the fresh copy
// replaces the cached one, so a deploy (new clips, fixed video ids) reaches the
// phone on the next load. The cache only answers when the network fails
// (offline), which keeps the offline workout loop working.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') {
    return;
  }
  // Byte-range requests (video seeking) go straight to the network.
  if (req.headers && typeof req.headers.get === 'function' && req.headers.get('range')) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = (await caches.match(req)) || (await caches.match(req, { ignoreSearch: true }));
        if (cached) return cached;
        if (req.mode === 'navigate') {
          const fallbackNav = (await caches.match('./index.html')) || (await caches.match('index.html'));
          if (fallbackNav) return fallbackNav;
        }
        return new Response('Offline fallback', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
