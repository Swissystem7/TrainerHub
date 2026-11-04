/* TrainerHub PWA: registers the service worker, offers install, shows "יש גרסה חדשה". */
(function (root) {
  'use strict';
  var nav = root.navigator;
  var doc = root.document;

  function swUrl() {
    var s = doc.currentScript || doc.querySelector('script[src*="pwa.js"]');
    return new URL('../sw.js', s ? s.src : root.location.href).href;
  }

  function bar() {
    var el = doc.getElementById('th-pwa-bar');
    if (el) return el;
    el = doc.createElement('div');
    el.id = 'th-pwa-bar';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;
    el.className = 'th-banner';
    el.style.cssText = 'position:fixed;inset-inline:12px;bottom:12px;z-index:9999;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap';
    doc.body.appendChild(el);
    return el;
  }

  function show(text, buttonText, onClick, id) {
    var el = bar();
    el.textContent = '';
    var span = doc.createElement('span');
    span.textContent = text;
    el.appendChild(span);
    var b = doc.createElement('button');
    b.type = 'button';
    b.className = 'th-btn';
    b.id = id;
    b.textContent = buttonText;
    b.addEventListener('click', onClick);
    el.appendChild(b);
    var close = doc.createElement('button');
    close.type = 'button';
    close.className = 'th-btn';
    close.setAttribute('aria-label', 'סגירה');
    close.textContent = '×';
    close.addEventListener('click', function () { el.hidden = true; });
    el.appendChild(close);
    el.hidden = false;
  }

  function promptUpdate(worker) {
    show('יש גרסה חדשה של TrainerHub', 'לעדכן עכשיו', function () {
      api.updating = true;
      worker.postMessage('SKIP_WAITING');
    }, 'th-pwa-update');
  }

  var api = { promptUpdate: promptUpdate, show: show, installEvent: null, updating: false };

  root.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    api.installEvent = e;
    show('אפשר להתקין את TrainerHub למסך הבית ולעבוד גם בלי אינטרנט', 'התקנה למסך הבית', function () {
      bar().hidden = true;
      e.prompt();
    }, 'th-pwa-install');
  });

  if (nav && 'serviceWorker' in nav && /^https?:$/.test(root.location.protocol)) {
    var reloading = false;
    nav.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading || !api.updating) return;
      reloading = true;
      root.location.reload();
    });
    root.addEventListener('load', function () {
      nav.serviceWorker.register(swUrl()).then(function (reg) {
        if (reg.waiting && nav.serviceWorker.controller) promptUpdate(reg.waiting);
        reg.addEventListener('updatefound', function () {
          var w = reg.installing;
          if (!w) return;
          w.addEventListener('statechange', function () {
            if (w.state === 'installed' && nav.serviceWorker.controller) promptUpdate(w);
          });
        });
        root.setInterval(function () { reg.update().catch(function () {}); }, 60 * 60 * 1000);
      }).catch(function () {});
    });
  }

  root.THPwa = api;
})(typeof window !== 'undefined' ? window : globalThis);
