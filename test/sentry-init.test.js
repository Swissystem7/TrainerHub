'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const S = require('../js/sentry-init.js');

const ROOT = path.join(__dirname, '..');
const PAGES = ['index.html', 'booklet.html', 'weekly.html', 'journal.html', 'library.html', 'frontend/index.html'];

test('errors only: no tracing, no replay, no PII', function () {
  const o = S.buildOptions({ hostname: 'swissystem7.github.io', search: '' });
  assert.equal(o.dsn, S.DSN);
  assert.equal(o.tracesSampleRate, 0);
  assert.equal(o.replaysSessionSampleRate, 0);
  assert.equal(o.replaysOnErrorSampleRate, 0);
  assert.equal(o.sendDefaultPii, false);
  assert.equal(o.environment, 'production');
  assert.equal(o.initialScope.tags.pilot, undefined);
  assert.ok(!/tracing|replay/.test(S.BUNDLE_URL), 'errors-only bundle');
});

test('environment from hostname: localhost is dev', function () {
  assert.equal(S.environmentFor('localhost'), 'dev');
  assert.equal(S.environmentFor('127.0.0.1'), 'dev');
  assert.equal(S.environmentFor(''), 'dev');
  assert.equal(S.environmentFor('swissystem7.github.io'), 'production');
  assert.equal(S.environmentFor('example.pages.dev'), 'preview');
});

test('?pilot=acharai tags the events', function () {
  assert.equal(S.buildOptions({ hostname: 'x.github.io', search: '?pilot=acharai' }).initialScope.tags.pilot, 'acharai');
  assert.equal(S.buildOptions({ hostname: 'x.github.io', search: '?a=1&pilot=acharai' }).initialScope.tags.pilot, 'acharai');
  assert.equal(S.isPilot('?pilot=acharai2'), false);
  assert.equal(S.isPilot(''), false);
});

test('beforeSend cuts the URL hash (the workout) everywhere it shows up', function () {
  const ev = {
    request: {
      url: 'https://swissystem7.github.io/TrainerHub/index.html?pilot=acharai#w=SECRET',
      headers: { Referer: 'https://swissystem7.github.io/TrainerHub/#w=SECRET' },
      cookies: { a: 'b' }
    },
    breadcrumbs: [
      { category: 'navigation', data: { from: '/index.html#w=SECRET', to: '/booklet.html#x=SECRET' } },
      { category: 'fetch', data: { url: 'content/x.json#SECRET' } },
      { category: 'console', message: 'hi' }
    ],
    user: { id: 'u1', ip_address: '1.2.3.4', email: 'a@b.c' }
  };
  const out = S.buildOptions({}).beforeSend(ev);
  assert.ok(!JSON.stringify(out).includes('SECRET'));
  assert.equal(out.request.url, 'https://swissystem7.github.io/TrainerHub/index.html?pilot=acharai');
  assert.equal(out.request.cookies, undefined);
  assert.deepEqual(out.user, { id: 'u1' });
});

test('beforeBreadcrumb cuts the hash too, and tolerates odd input', function () {
  assert.equal(S.scrubBreadcrumb({ data: { url: '/a#b' } }).data.url, '/a');
  assert.equal(S.scrubBreadcrumb(null), null);
  assert.equal(S.scrubEvent(null), null);
  assert.equal(S.stripHash(undefined), undefined);
});

test('start() loads the bundle async with SRI and never throws when offline', function () {
  const listeners = {};
  const appended = [];
  const win = {
    location: { hostname: 'localhost', search: '' },
    addEventListener: function (t, f) { listeners[t] = f; },
    removeEventListener: function (t) { delete listeners[t]; },
    document: {
      createElement: function () { return {}; },
      head: { appendChild: function (el) { appended.push(el); } }
    }
  };
  assert.equal(S.start(win), true);
  assert.equal(S.start(win), false, 'only once per page');
  const s = appended[0];
  assert.equal(s.src, S.BUNDLE_URL);
  assert.ok(s.integrity.startsWith('sha384-'));
  assert.equal(s.crossOrigin, 'anonymous');
  assert.equal(s.async, true);
  listeners.error({ error: new Error('early') });
  s.onerror();
  assert.equal(listeners.error, undefined, 'early-error buffer removed when offline');
});

test('early errors are sent after the bundle loads', function () {
  const listeners = {};
  let el;
  const sent = [];
  let inited = null;
  const win = {
    location: { hostname: 'localhost', search: '?pilot=acharai' },
    addEventListener: function (t, f) { listeners[t] = f; },
    removeEventListener: function (t) { delete listeners[t]; },
    document: { createElement: function () { return (el = {}); }, head: { appendChild: function () {} } }
  };
  S.start(win);
  listeners.error({ error: new Error('boom') });
  listeners.unhandledrejection({ reason: 'nope' });
  win.Sentry = { init: function (o) { inited = o; }, captureException: function (e) { sent.push(e); } };
  el.onload();
  assert.equal(inited.environment, 'dev');
  assert.equal(inited.initialScope.tags.pilot, 'acharai');
  assert.equal(sent.length, 2);
});

test('every pilot page loads js/sentry-init.js once, in the head', function () {
  PAGES.forEach(function (p) {
    const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
    const m = html.match(/<script src="[^"]*js\/sentry-init\.js"><\/script>/g) || [];
    assert.equal(m.length, 1, p);
    assert.ok(html.indexOf('sentry-init.js') < html.indexOf('</head>'), p + ': in head');
  });
});
