/**
 * TrainerHub — המסכים של פיילוט אחריי (SPEC-site-scan.md): כרטיס משוב אחרי
 * אימון במסך הסיום של מצב אימון, וטופס קטן להזנת קוד פיילוט בדף הראשי.
 *
 * כל הלוגיקה (ניקוי, שמירה, ייצוא, וואטסאפ) נמצאת ב-js/pilot.js. כאן רק
 * מציירים ומחברים כפתורים. ה-HTML קבוע; קלט המאמן נכנס רק דרך textContent
 * ו-value, אף פעם לא דרך innerHTML.
 *
 * Classic script / CommonJS. Namespace: window.THPilotFeedback
 */
(function (root) {
  'use strict';

  var CARD_HTML =
    '<div class="pf-card" dir="rtl" style="text-align:right">' +
    '<p class="pf-title" style="font-weight:700;margin:0 0 8px">משוב פיילוט אחריי</p>' +
    '<div class="pf-rating" role="group" aria-label="איך היה האימון? 1 עד 5" style="display:flex;gap:6px;justify-content:center;margin-bottom:8px">' +
    [1, 2, 3, 4, 5].map(function (n) {
      return '<button type="button" data-pf-rating="' + n + '" aria-pressed="false" aria-label="דירוג ' + n + ' מתוך 5" style="min-width:44px;min-height:44px">' + n + '</button>';
    }).join('') +
    '</div>' +
    '<label for="pfWorked" style="display:block;font-size:0.8rem">מה עבד?</label>' +
    '<textarea id="pfWorked" maxlength="300" rows="2" style="width:100%;box-sizing:border-box"></textarea>' +
    '<label for="pfImprove" style="display:block;font-size:0.8rem">מה לשפר?</label>' +
    '<textarea id="pfImprove" maxlength="300" rows="2" style="width:100%;box-sizing:border-box"></textarea>' +
    '<button type="button" data-pf-save style="width:100%;min-height:44px;margin-top:8px">💾 שמור משוב</button>' +
    '<button type="button" data-pf-wa style="width:100%;min-height:44px;margin-top:8px">💬 שלח משוב בוואטסאפ</button>' +
    '<button type="button" data-pf-export style="width:100%;min-height:44px;margin-top:8px">⬇️ ייצוא כל המשובים (JSON)</button>' +
    '<p class="pf-status" role="status" style="font-size:0.8rem;margin:8px 0 0"></p>' +
    '</div>';

  var CODE_HTML =
    '<form class="pf-code" dir="rtl" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
    '<label for="pfCode" style="font-size:0.85rem">קוד פיילוט</label>' +
    '<input id="pfCode" type="text" autocomplete="off" maxlength="20" style="flex:1;min-width:120px">' +
    '<button type="submit" style="min-height:44px">הפעל</button>' +
    '<p class="pf-status" role="status" style="width:100%;font-size:0.8rem;margin:0"></p>' +
    '</form>';

  function pilotApi(opts) {
    return (opts && opts.pilot) || root.THPilot || null;
  }

  // מצייר את כרטיס המשוב רק כשמצב הפיילוט פעיל. מחזיר את הרשומה האחרונה שנשמרה.
  function mountFeedback(container, opts) {
    opts = opts || {};
    var P = pilotApi(opts);
    if (!container || !P || !P.isActive()) return null;
    container.innerHTML = CARD_HTML;
    container.hidden = false;

    var state = { rating: 0, saved: null };
    var status = container.querySelector('.pf-status');
    function say(text) { if (status) status.textContent = text; }
    function values() {
      return {
        rating: state.rating,
        worked: container.querySelector('#pfWorked').value,
        improve: container.querySelector('#pfImprove').value,
        session: opts.session || '',
        site: opts.site || ''
      };
    }

    var buttons = container.querySelectorAll('[data-pf-rating]');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener('click', function () {
        state.rating = Number(btn.getAttribute('data-pf-rating'));
        Array.prototype.forEach.call(buttons, function (b) {
          b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-pf-rating')) === state.rating));
        });
      });
    });

    container.querySelector('[data-pf-save]').addEventListener('click', function () {
      var r = P.saveFeedback(values());
      if (!r.ok) { say(r.error); return; }
      state.saved = r.feedback;
      say('המשוב נשמר במכשיר (' + r.count + ' משובים)');
    });

    container.querySelector('[data-pf-wa]').addEventListener('click', function () {
      var rec = P.buildFeedback(values());
      if (!rec.rating && !rec.worked && !rec.improve) { say('המשוב ריק'); return; }
      var open = opts.open || (root.open && root.open.bind(root));
      if (open) open(P.waUrl(rec, opts.phone), '_blank');
    });

    container.querySelector('[data-pf-export]').addEventListener('click', function () {
      var json = P.exportJson();
      if (opts.download) { opts.download(json); return; }
      var doc = root.document;
      if (!doc || typeof root.Blob !== 'function' || !root.URL) return;
      var a = doc.createElement('a');
      a.href = root.URL.createObjectURL(new root.Blob([json], { type: 'application/json' }));
      a.download = 'trainerhub-pilot-feedback.json';
      doc.body.appendChild(a);
      a.click();
      a.remove();
    });

    return state;
  }

  // טופס קוד הפיילוט. כשהפיילוט כבר פעיל מציג רק שורת סטטוס.
  function mountCode(container, opts) {
    opts = opts || {};
    var P = pilotApi(opts);
    if (!container || !P) return false;
    container.innerHTML = CODE_HTML;
    var form = container.querySelector('form');
    var status = container.querySelector('.pf-status');
    function showActive() {
      var cur = P.current();
      status.textContent = 'מצב פיילוט פעיל: ' + cur.org + '. יכולות המאמן פתוחות.';
      form.querySelector('label').hidden = true;
      form.querySelector('input').hidden = true;
      form.querySelector('button').hidden = true;
    }
    if (P.isActive()) { showActive(); return true; }
    form.addEventListener('submit', function (e) {
      if (e && e.preventDefault) e.preventDefault();
      var r = P.redeemCode(form.querySelector('input').value, opts.TH || root.TH);
      if (r.ok) showActive();
      else status.textContent = r.error;
    });
    return true;
  }

  var api = { CARD_HTML: CARD_HTML, CODE_HTML: CODE_HTML, mountFeedback: mountFeedback, mountCode: mountCode };
  root.THPilotFeedback = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
