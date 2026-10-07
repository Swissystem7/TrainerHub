/**
 * TrainerHub — browser error tracking for the Acharai pilot (Sentry).
 * Classic script, no bundler. Namespace: window.THSentry.
 * Errors only: no tracing, no session replay, no PII. The workout lives in the
 * URL hash, so every URL that leaves the page has its hash cut off first.
 * The Sentry bundle is loaded from the CDN after the page; offline or blocked,
 * the load just fails quietly and the app keeps working.
 */
(function (root) {
  'use strict';

  // Public browser DSN: it can only send events, safe to commit.
  var DSN = 'https://cfb7ac4a880c4a8b0144b51f0a99194a@o4512214280568832.ingest.de.sentry.io/4512214799286352';
  var BUNDLE_URL = 'https://browser.sentry-cdn.com/8.55.0/bundle.min.js';
  var BUNDLE_SRI = 'sha384-BlRl+vkcjdIA/AKRb8zWtiqlVVXepUsSv0+vho7ZMUTsNudEyQjGUKo9W86Hc1EC';
  var MAX_EARLY = 10;

  function stripHash(url) {
    if (typeof url !== 'string') return url;
    var i = url.indexOf('#');
    return i === -1 ? url : url.slice(0, i);
  }

  function environmentFor(hostname) {
    var h = String(hostname || '').toLowerCase();
    if (!h || h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1') return 'dev';
    if (h.slice(-10) === '.github.io') return 'production';
    return 'preview';
  }

  function isPilot(search) {
    return /(?:^|[?&])pilot=acharai(?:&|$)/i.test(String(search || ''));
  }

  function scrubBreadcrumb(crumb) {
    if (!crumb || !crumb.data) return crumb;
    ['url', 'from', 'to'].forEach(function (k) {
      if (typeof crumb.data[k] === 'string') crumb.data[k] = stripHash(crumb.data[k]);
    });
    return crumb;
  }

  function scrubEvent(event) {
    if (!event) return event;
    var req = event.request;
    if (req) {
      req.url = stripHash(req.url);
      if (req.headers) {
        if (req.headers.Referer) req.headers.Referer = stripHash(req.headers.Referer);
        if (req.headers.referer) req.headers.referer = stripHash(req.headers.referer);
      }
      delete req.cookies;
    }
    if (Array.isArray(event.breadcrumbs)) event.breadcrumbs.forEach(scrubBreadcrumb);
    if (event.user) event.user = { id: event.user.id };
    return event;
  }

  function buildOptions(loc) {
    loc = loc || {};
    var opts = {
      dsn: DSN,
      environment: environmentFor(loc.hostname),
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sendDefaultPii: false,
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
      initialScope: { tags: {} }
    };
    if (isPilot(loc.search)) opts.initialScope.tags.pilot = 'acharai';
    return opts;
  }

  // Errors thrown before the bundle arrives are kept (a few) and sent after init.
  function start(win) {
    var doc = win.document;
    if (!doc || win.__thSentryStarted) return false;
    win.__thSentryStarted = true;
    var early = [];
    function keep(err) { if (early.length < MAX_EARLY && err) early.push(err); }
    function onError(e) { keep(e && (e.error || e.message)); }
    function onRejection(e) { keep(e && e.reason); }
    win.addEventListener('error', onError);
    win.addEventListener('unhandledrejection', onRejection);
    function stopKeeping() {
      win.removeEventListener('error', onError);
      win.removeEventListener('unhandledrejection', onRejection);
    }

    var s = doc.createElement('script');
    s.src = BUNDLE_URL;
    s.integrity = BUNDLE_SRI;
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = function () {
      stopKeeping();
      var S = win.Sentry;
      if (!S || typeof S.init !== 'function') return;
      try {
        S.init(buildOptions(win.location));
        early.forEach(function (err) { S.captureException(err); });
      } catch (_) { /* tracking must never break the page */ }
      early = [];
    };
    s.onerror = function () { stopKeeping(); early = []; };
    (doc.head || doc.documentElement).appendChild(s);
    return true;
  }

  var api = {
    DSN: DSN,
    BUNDLE_URL: BUNDLE_URL,
    stripHash: stripHash,
    environmentFor: environmentFor,
    isPilot: isPilot,
    scrubEvent: scrubEvent,
    scrubBreadcrumb: scrubBreadcrumb,
    buildOptions: buildOptions,
    start: start
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    root.THSentry = api;
    start(root);
  }
})(typeof window !== 'undefined' ? window : this);
