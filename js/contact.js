/**
 * TrainerHub — ערוץ פנייה אחד, מוגדר במקום אחד.
 *
 * הבעלים ממלא ערך אחד: CONTACT. דוגמאות לצורה (לא פרטים אמיתיים):
 *   'https://wa.me/9725XXXXXXXX'   או כתובת שמתחילה ב־mailto:
 * כל עוד הוא ריק, קישור הפנייה הישירה מוסתר והדף מפנה לטופס GitHub בעברית.
 * לא ממציאים כאן טלפון או מייל.
 */
(function (root) {
  'use strict';

  var CONTACT = '';

  var FORM_URL = 'https://github.com/Swissystem7/TrainerHub/issues/new?template=access-request.yml';

  function safeHref(value) {
    var v = String(value || '').trim();
    if (!v) return null;
    if (/^https:\/\/[^\s"'<>]+$/i.test(v)) return v;
    if (/^mailto:[^\s"'<>]+$/i.test(v)) return v;
    if (/^tel:\+?[0-9-]{6,}$/i.test(v)) return v;
    return null;
  }

  function resolve(value) {
    return { direct: safeHref(value), formUrl: FORM_URL };
  }

  function render(doc) {
    doc = doc || root.document;
    if (!doc) return;
    var r = resolve(CONTACT);
    var direct = doc.getElementById('contactDirect');
    var form = doc.getElementById('contactForm');
    var note = doc.getElementById('contactNote');
    if (form) form.href = r.formUrl;
    if (direct) {
      if (r.direct) {
        direct.href = r.direct;
        direct.hidden = false;
      } else {
        direct.hidden = true;
      }
    }
    if (note) note.hidden = !!r.direct;
  }

  var api = { resolve: resolve, render: render, value: CONTACT, formUrl: FORM_URL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.THContact = api;
  if (root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', function () { render(root.document); });
    } else {
      render(root.document);
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
