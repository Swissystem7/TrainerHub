'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const C = require('../js/consent.js');
const S = require('../js/sentry-init.js');

const ROOT = path.join(__dirname, '..');
const SENTRY_PAGES = [
  'index.html',
  'booklet.html',
  'weekly.html',
  'journal.html',
  'library.html',
  'exercises.html',
  'reserves.html',
  'scan.html',
  'frontend/index.html'
];

function makeStorage(initial) {
  const m = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: function (k) {
      return m.has(k) ? m.get(k) : null;
    },
    setItem: function (k, v) {
      m.set(k, String(v));
    },
    map: m
  };
}

function makeEl() {
  const el = {
    attrs: {},
    children: [],
    className: '',
    textContent: '',
    listeners: {},
    setAttribute: function (k, v) {
      el.attrs[k] = v;
    },
    appendChild: function (c) {
      el.children.push(c);
      c.parent = el;
      return c;
    },
    addEventListener: function (t, f) {
      el.listeners[t] = f;
    },
    remove: function () {
      if (el.parent)
        el.parent.children = el.parent.children.filter(function (c) {
          return c !== el;
        });
    },
    click: function () {
      el.listeners.click();
    }
  };
  return el;
}

function makeWindow(opts) {
  const o = opts || {};
  const events = [];
  const body = makeEl();
  const head = makeEl();
  const docListeners = {};
  const win = {
    localStorage: o.storage || makeStorage(),
    events: events,
    CustomEvent: function (type, init) {
      this.type = type;
      this.detail = init && init.detail;
    },
    dispatchEvent: function (e) {
      events.push(e);
    },
    document: {
      readyState: o.readyState || 'complete',
      body: body,
      head: head,
      createElement: makeEl,
      querySelector: function (sel) {
        return (
          head.children.find(function (c) {
            return sel.indexOf('data-th-consent-style') > -1 && 'data-th-consent-style' in c.attrs;
          }) || null
        );
      },
      addEventListener: function (t, f) {
        docListeners[t] = f;
      },
      docListeners: docListeners
    }
  };
  return win;
}

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a, b) {
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

test('colours: only red #C22826 and gold #E6B731 plus black and white; text pairs reach AA', () => {
  assert.equal(C.RED, '#C22826');
  assert.equal(C.GOLD, '#E6B731');
  const hexes = new Set(
    (C.CSS.match(/#[0-9a-fA-F]{3,6}\b/g) || []).map(function (h) {
      return h.toLowerCase();
    })
  );
  const allowed = new Set(['#c22826', '#e6b731', '#fff', '#ffffff', '#1a1a1a', '#161616']);
  hexes.forEach(function (h) {
    assert.ok(allowed.has(h), 'unexpected colour ' + h);
  });
  assert.ok(!/(teal|turquoise|orange|f97316|#0d9488|#14b8a6)/i.test(C.CSS), 'no old turquoise or orange');
  [
    ['#ffffff', C.RED],
    [C.RED, '#ffffff'],
    ['#1a1a1a', '#ffffff'],
    [C.RED, '#ffffff'],
    ['#1a1a1a', C.GOLD],
    [C.GOLD, '#161616'],
    ['#ffffff', '#161616']
  ].forEach(function (pair) {
    assert.ok(contrast(pair[0], pair[1]) >= 4.5, pair.join(' on ') + ' = ' + contrast(pair[0], pair[1]).toFixed(2));
  });
});

test('first visit shows the banner with two equal choices and a privacy link; nothing stored yet', () => {
  const win = makeWindow();
  const c = C.create(win);
  assert.equal(c.get(), null);
  c.init();
  const wrap = win.document.body.children[0];
  assert.ok(wrap && 'data-th-consent' in wrap.attrs);
  const box = wrap.children[0];
  assert.equal(box.attrs.role, 'region');
  assert.equal(box.attrs.dir, 'rtl');
  const p = box.children[0];
  const link = p.children[0];
  assert.equal(link.attrs.href, './privacy.html');
  const buttons = box.children[1].children;
  assert.deepEqual(
    buttons.map(function (b) {
      return b.attrs.type;
    }),
    ['button', 'button']
  );
  assert.match(buttons[0].textContent, /מסכים/);
  assert.match(buttons[1].textContent, /לא, תודה/);
  assert.equal(win.localStorage.map.size, 0);
  assert.equal(win.events.length, 0);
});

test('"yes" stores granted, announces it and removes the banner; "no" stores denied', () => {
  const win = makeWindow();
  const c = C.create(win);
  c.init();
  win.document.body.children[0].children[0].children[1].children[0].click();
  assert.equal(win.localStorage.getItem(C.KEY), 'granted');
  assert.equal(c.get(), 'granted');
  assert.equal(win.document.body.children.length, 0);
  assert.equal(win.events[0].type, C.EVENT);
  assert.equal(win.events[0].detail, 'granted');

  const win2 = makeWindow();
  const c2 = C.create(win2);
  c2.init();
  win2.document.body.children[0].children[0].children[1].children[1].click();
  assert.equal(win2.localStorage.getItem(C.KEY), 'denied');
  assert.equal(win2.events[0].detail, 'denied');
});

test('a saved choice means no banner; open() can change it later; the style is added once', () => {
  const win = makeWindow({ storage: makeStorage({ 'th-consent-v1': 'denied' }) });
  const c = C.create(win);
  c.init();
  assert.equal(win.document.body.children.length, 0);
  assert.equal(c.get(), 'denied');
  assert.equal(c.open(), true);
  assert.equal(c.open(), false, 'not opened twice');
  assert.equal(win.document.body.children.length, 1);
  c.grant();
  assert.equal(win.localStorage.getItem(C.KEY), 'granted');
  c.open();
  c.close();
  assert.equal(win.document.head.children.length, 1, 'one style element');
});

test('data-th-consent-open elements reopen the banner; junk values and blocked storage are tolerated', () => {
  const win = makeWindow({ storage: makeStorage({ 'th-consent-v1': 'maybe' }) });
  const c = C.create(win);
  assert.equal(c.get(), null, 'junk value is no choice');
  c.init();
  c.close();
  assert.equal(win.document.body.children.length, 0);
  let prevented = false;
  win.document.docListeners.click({
    target: {
      closest: function (s) {
        return s === '[data-th-consent-open]' ? {} : null;
      }
    },
    preventDefault: function () {
      prevented = true;
    }
  });
  assert.equal(win.document.body.children.length, 1);
  assert.ok(prevented);

  const blocked = makeWindow();
  blocked.localStorage = {
    getItem: function () {
      throw new Error('blocked');
    },
    setItem: function () {
      throw new Error('blocked');
    }
  };
  const bc = C.create(blocked);
  assert.equal(bc.get(), null);
  bc.init();
  assert.doesNotThrow(function () {
    bc.grant();
  });
  assert.equal(bc.get(), 'granted', 'the choice lasts for this page');
});

test('while the page is still loading the banner waits for DOMContentLoaded', () => {
  const win = makeWindow({ readyState: 'loading' });
  const c = C.create(win);
  c.init();
  assert.equal(win.document.body.children.length, 0);
  win.document.docListeners.DOMContentLoaded();
  assert.equal(win.document.body.children.length, 1);
});

test('sentry-init: no choice or "denied" starts nothing; "granted" starts it', () => {
  function sentryWindow(choice) {
    const appended = [];
    const listeners = {};
    return {
      appended: appended,
      listeners: listeners,
      localStorage: makeStorage(choice ? { 'th-consent-v1': choice } : {}),
      location: { hostname: 'localhost', search: '' },
      addEventListener: function (t, f) {
        listeners[t] = f;
      },
      removeEventListener: function (t) {
        delete listeners[t];
      },
      document: {
        readyState: 'complete',
        createElement: function () {
          return {};
        },
        head: {
          appendChild: function (el) {
            appended.push(el);
          }
        }
      }
    };
  }
  const none = sentryWindow(null);
  assert.equal(S.startWhenConsented(none), false);
  assert.equal(none.appended.length, 0, 'no choice: no bundle');
  assert.equal(none.error, undefined);
  assert.equal(typeof none.listeners.error, 'undefined', 'no early-error buffer without consent');

  const denied = sentryWindow('denied');
  assert.equal(S.startWhenConsented(denied), false);
  assert.equal(denied.appended.length, 0);

  const granted = sentryWindow('granted');
  assert.equal(S.startWhenConsented(granted), true);
  assert.equal(granted.appended.length, 1);
  assert.equal(granted.appended[0].src, S.BUNDLE_URL);
});

test('sentry-init: saying yes on the page starts it at once; saying no closes a running one', () => {
  const appended = [];
  const listeners = {};
  let closed = 0;
  const win = {
    localStorage: makeStorage(),
    location: { hostname: 'localhost', search: '' },
    addEventListener: function (t, f) {
      listeners[t] = f;
    },
    removeEventListener: function (t) {
      delete listeners[t];
    },
    document: {
      readyState: 'complete',
      createElement: function () {
        return {};
      },
      head: {
        appendChild: function (el) {
          appended.push(el);
        }
      }
    }
  };
  S.startWhenConsented(win);
  assert.equal(appended.length, 0);
  listeners['th-consent']({ detail: 'granted' });
  assert.equal(appended.length, 1);
  win.Sentry = {
    close: function () {
      closed += 1;
    }
  };
  listeners['th-consent']({ detail: 'denied' });
  assert.equal(closed, 1);
  assert.doesNotThrow(function () {
    listeners['th-consent'](undefined);
  });
});

test('sentry-init: hasConsent is true only for "granted" and survives blocked storage', () => {
  assert.equal(S.hasConsent({ localStorage: makeStorage({ 'th-consent-v1': 'granted' }) }), true);
  assert.equal(S.hasConsent({ localStorage: makeStorage({ 'th-consent-v1': 'denied' }) }), false);
  assert.equal(S.hasConsent({ localStorage: makeStorage() }), false);
  assert.equal(S.hasConsent({}), false);
  assert.equal(
    S.hasConsent({
      get localStorage() {
        throw new Error('blocked');
      }
    }),
    false
  );
});

test('every page with Sentry loads js/consent.js once, in the head, next to sentry-init; the privacy page too', () => {
  SENTRY_PAGES.forEach(function (p) {
    const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
    const m = html.match(/<script src="[^"]*js\/consent\.js"><\/script>/g) || [];
    assert.equal(m.length, 1, p);
    assert.ok(html.indexOf('consent.js') < html.indexOf('</head>'), p + ': in head');
    assert.ok(html.indexOf('sentry-init.js') < html.indexOf('consent.js'), p + ': after sentry-init');
  });
  const privacy = fs.readFileSync(path.join(ROOT, 'privacy.html'), 'utf8');
  assert.match(privacy, /js\/consent\.js/);
  assert.match(privacy, /data-th-consent-open/);
});
