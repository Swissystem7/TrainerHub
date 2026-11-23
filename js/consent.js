/**
 * TrainerHub - consent for error reports (Sentry).
 * Classic script, no bundler. Namespace: window.THConsent.
 * Until the visitor says yes, no Sentry code is loaded and nothing is sent.
 * The choice is kept in this browser (localStorage 'th-consent-v1': 'granted' or 'denied'),
 * announced with a 'th-consent' event (detail = the choice), and can be changed later from any
 * element with a data-th-consent-open attribute or by calling THConsent.open().
 * Colours: red #C22826 and gold #E6B731 only, plus black and white.
 */
(function (root) {
  'use strict';

  var KEY = 'th-consent-v1';
  var EVENT = 'th-consent';
  var RED = '#C22826';
  var GOLD = '#E6B731';

  function storageOf(win) {
    try {
      return win.localStorage || null;
    } catch (_) {
      return null;
    }
  }

  function read(storage) {
    try {
      var v = storage && storage.getItem(KEY);
      return v === 'granted' || v === 'denied' ? v : null;
    } catch (_) {
      return null;
    }
  }

  function write(storage, value) {
    try {
      if (storage) storage.setItem(KEY, value);
    } catch (_) {
      /* private mode: the choice lasts for this page only */
    }
  }

  var CSS =
    '[data-th-consent]{position:fixed;inset-inline:0;bottom:0;z-index:2147483000;display:flex;justify-content:center;' +
    'padding:12px 12px calc(12px + env(safe-area-inset-bottom));pointer-events:none}' +
    '[data-th-consent] .th-consent-box{pointer-events:auto;max-width:560px;width:100%;background:#fff;color:#1a1a1a;' +
    'border:2px solid ' +
    GOLD +
    ';border-top:6px solid ' +
    RED +
    ';border-radius:14px;padding:14px 16px;' +
    'box-shadow:0 8px 28px rgba(0,0,0,.28);font:15px/1.6 Heebo,system-ui,sans-serif}' +
    '[data-th-consent] p{margin:0 0 10px}' +
    '[data-th-consent] a{color:' +
    RED +
    ';font-weight:700}' +
    '[data-th-consent] .th-consent-row{display:flex;gap:10px;flex-wrap:wrap}' +
    '[data-th-consent] button{flex:1 1 140px;min-height:48px;border-radius:10px;font:inherit;font-weight:800;cursor:pointer;' +
    'border:2px solid ' +
    RED +
    '}' +
    '[data-th-consent] .th-consent-yes{background:' +
    RED +
    ';color:#fff}' +
    '[data-th-consent] .th-consent-no{background:#fff;color:' +
    RED +
    '}' +
    '[data-th-consent] button:focus-visible,[data-th-consent] a:focus-visible{outline:3px solid #1a1a1a;outline-offset:2px}' +
    '@media (prefers-color-scheme:dark){' +
    '[data-th-consent] .th-consent-box{background:#161616;color:#fff}' +
    '[data-th-consent] a{color:' +
    GOLD +
    '}' +
    '[data-th-consent] button{border-color:' +
    GOLD +
    '}' +
    '[data-th-consent] .th-consent-yes{background:' +
    GOLD +
    ';color:#1a1a1a}' +
    '[data-th-consent] .th-consent-no{background:#161616;color:' +
    GOLD +
    '}' +
    '[data-th-consent] button:focus-visible,[data-th-consent] a:focus-visible{outline-color:#fff}}';

  function privacyHref(win) {
    try {
      var script = win.document.currentScript;
      if (script && script.src) return new win.URL('../privacy.html', script.src).href;
    } catch (_) {
      /* fall through */
    }
    return './privacy.html';
  }

  /** Create the consent controller for a window. Nothing is shown until open() or the first visit. */
  function create(win, options) {
    var opts = options || {};
    var storage = opts.storage || storageOf(win);
    var href = opts.privacyHref || privacyHref(win);
    var state = read(storage);
    var node = null;

    function announce(value) {
      try {
        if (typeof win.dispatchEvent === 'function' && typeof win.CustomEvent === 'function') {
          win.dispatchEvent(new win.CustomEvent(EVENT, { detail: value }));
        }
      } catch (_) {
        /* announcing must never break the page */
      }
    }

    function close() {
      if (node && typeof node.remove === 'function') node.remove();
      node = null;
    }

    function choose(value) {
      state = value;
      write(storage, value);
      close();
      announce(value);
    }

    function open() {
      var doc = win.document;
      if (node || !doc || !doc.body || typeof doc.createElement !== 'function') return false;
      if (!opts.noStyle && !doc.querySelector('style[data-th-consent-style]')) {
        var style = doc.createElement('style');
        style.setAttribute('data-th-consent-style', '');
        style.textContent = CSS;
        (doc.head || doc.body).appendChild(style);
      }
      var wrap = doc.createElement('div');
      wrap.setAttribute('data-th-consent', '');
      var box = doc.createElement('div');
      box.className = 'th-consent-box';
      box.setAttribute('role', 'region');
      box.setAttribute('aria-label', 'פרטיות ודיווח תקלות');
      box.setAttribute('dir', 'rtl');
      var p = doc.createElement('p');
      p.textContent =
        'אפשר לשלוח דיווחי תקלות אל Sentry כדי שנוכל לתקן באגים. נשלחות שגיאות בלבד, בלי פרטים אישיים ובלי תוכן האימון. ' +
        'בלי הסכמה לא נשלח כלום. ';
      var link = doc.createElement('a');
      link.setAttribute('href', href);
      link.textContent = 'מדיניות פרטיות';
      p.appendChild(link);
      var row = doc.createElement('div');
      row.className = 'th-consent-row';
      var yes = doc.createElement('button');
      yes.setAttribute('type', 'button');
      yes.className = 'th-consent-yes';
      yes.textContent = 'מסכים לדיווח תקלות';
      yes.addEventListener('click', function () {
        choose('granted');
      });
      var no = doc.createElement('button');
      no.setAttribute('type', 'button');
      no.className = 'th-consent-no';
      no.textContent = 'לא, תודה';
      no.addEventListener('click', function () {
        choose('denied');
      });
      row.appendChild(yes);
      row.appendChild(no);
      box.appendChild(p);
      box.appendChild(row);
      wrap.appendChild(box);
      doc.body.appendChild(wrap);
      node = wrap;
      return true;
    }

    function init() {
      var doc = win.document;
      if (!doc) return;
      if (typeof doc.addEventListener === 'function') {
        doc.addEventListener('click', function (e) {
          var t = e && e.target;
          if (t && typeof t.closest === 'function' && t.closest('[data-th-consent-open]')) {
            if (e.preventDefault) e.preventDefault();
            open();
          }
        });
      }
      if (state === null) {
        if (doc.readyState === 'loading' && typeof doc.addEventListener === 'function') {
          doc.addEventListener('DOMContentLoaded', open, { once: true });
        } else {
          open();
        }
      }
    }

    return {
      get: function () {
        return state;
      },
      grant: function () {
        choose('granted');
      },
      deny: function () {
        choose('denied');
      },
      open: open,
      close: close,
      init: init
    };
  }

  var api = { KEY: KEY, EVENT: EVENT, RED: RED, GOLD: GOLD, CSS: CSS, create: create };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) {
    var controller = create(root);
    root.THConsent = {
      get: controller.get,
      grant: controller.grant,
      deny: controller.deny,
      open: controller.open
    };
    controller.init();
  }
})(typeof window !== 'undefined' ? window : this);
