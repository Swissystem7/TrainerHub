'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'index.html'), 'utf8');

function extractPageScript(src) {
  const match = src.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert.ok(match, 'page script block found');
  return match[1];
}

function mountFrontendIndex(options) {
  options = options || {};
  const els = {};
  const handlers = {};
  let focusedId = null;

  function el(id) {
    if (!els[id]) {
      const attrs = {};
      els[id] = {
        id: id,
        innerText: '',
        textContent: '',
        innerHTML: '',
        value: '',
        hidden: false,
        className: '',
        getAttribute: function (k) { return attrs[k] != null ? attrs[k] : null; },
        setAttribute: function (k, v) { attrs[k] = String(v); },
        removeAttribute: function (k) { delete attrs[k]; },
        focus: function () { focusedId = id; },
        addEventListener: function (type, fn) {
          handlers[id + ':' + type] = fn;
        }
      };
    }
    return els[id];
  }

  // Pre-seed elements
  ['workoutInput', 'parseBtn', 'clearBtn', 'startBtn', 'previewBtn', 'shareBtn',
   'pdfBtn', 'saveBtn', 'jsonBtn', 'copyBtn', 'netanyaBtn',
   'cardEmpty', 'cardContent', 'actionBar', 'gateHost', 'libraryStatus',
   'historyList', 'saveToast'].forEach(el);

  let savedStorage = options.savedStorage || [];

  const THMock = {
    esc: function (s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
    hasClip: function () { return false; },
    store: {
      get: function (key, def) {
        if (key === 'trainerhub_saved') return savedStorage;
        return def;
      },
      set: function (key, val) {
        if (key === 'trainerhub_saved') {
          savedStorage = val;
          return true;
        }
        return true;
      }
    },
    KEYS: {
      saved: 'trainerhub_saved',
      active: 'trainerhub_active'
    },
    phaseLabel: function (name) {
      return ({ 'Warm-up': 'חימום', 'Main': 'עיקר', 'Cool-down': 'שחרור' })[name] || name;
    },
    copyOrShow: function (text, container, cb) {
      if (typeof cb === 'function') cb();
    },
    encodeLink: function () { return 'mock-preview-url'; },
    shareToClient: function () { return { ok: true, url: 'mock-share-url' }; },
    preparePrint: function () {},
    printUrl: function () { return 'mock-print-url'; }
  };

  const documentMock = {
    getElementById: el,
    querySelectorAll: function (selector) {
      if (selector === '[data-ex]') return [];
      return [];
    }
  };

  const parseWorkoutClientMock = options.parseWorkoutClient || function (text) {
    return {
      title: 'אימון בדיקה',
      intensity: 'medium',
      duration_minutes: 45,
      phases: [
        { name: 'Warm-up', duration_minutes: 10, exercises: [{ name: 'ריצה', sets: 1, duration_seconds: 180 }] }
      ]
    };
  };

  const scriptCode = extractPageScript(html);
  const runner = new Function(
    'document', 'window', 'TH', 'parseWorkoutClient', 'NetanyaOpeningWorkouts', 'WorkoutLibrary',
    scriptCode
  );

  runner(documentMock, {}, THMock, parseWorkoutClientMock, [], { save: function () {} });

  return {
    el: el,
    getFocusedId: function () { return focusedId; },
    getSavedStorage: function () { return savedStorage; },
    click: function (id) {
      if (handlers[id + ':click']) handlers[id + ':click']({ target: el(id) });
    },
    triggerHistoryClick: function (target) {
      if (handlers['historyList:click']) {
        handlers['historyList:click']({
          target: target
        });
      }
    },
    triggerHistoryKeydown: function (key, target) {
      let prevented = false;
      if (handlers['historyList:keydown']) {
        handlers['historyList:keydown']({
          key: key,
          target: target,
          preventDefault: function () { prevented = true; }
        });
      }
      return prevented;
    }
  };
}

test('frontend/index.html static: document structure, language, direction and skip link', function () {
  assert.match(html, /<html\s+lang="he"\s+dir="rtl">/);
  assert.match(html, /<a\s+class="skip-link"\s+href="#workoutInput">דלג לעורך האימון<\/a>/);
  assert.match(html, /<main\s+class="container"\s+id="main-content">/);
});

test('frontend/index.html static: navigation includes full site links and active chip indicator', function () {
  assert.match(html, /<nav class="th-nav" aria-label="ניווט ראשי">/);
  assert.match(html, /<a href="\.\.\/">בנה אימון<\/a>/);
  assert.match(html, /<a href="\.\.\/weekly\.html">בונה שבועי<\/a>/);
  assert.match(html, /<a href="\.\.\/booklet\.html">חוברת הקורס<\/a>/);
  assert.match(html, /<a href="\.\.\/site-scan\.html">סריקת שטח<\/a>/);
  assert.match(html, /<a href="\.\.\/library\.html">ספריית סרטונים<\/a>/);
  assert.match(html, /<a href="\.\.\/journal\.html">יומן ביצוע<\/a>/);
  assert.match(html, /<a href="\.\.\/offer\.html">הצעה למאמנים<\/a>/);
  assert.match(html, /<a href="\.\.\/manage\.html">ניהול מאגר<\/a>/);
  assert.match(html, /<span class="chip on" aria-current="page">טקסט לכרטיסייה<\/span>/);
  assert.match(html, /<a href="\.\/workout-mode\.html">מצב אימון חי<\/a>/);
});

test('frontend/index.html static: action bar and action buttons have accessible labels and toolbar role', function () {
  assert.match(html, /<div class="action-bar" id="actionBar" role="toolbar" aria-label="פעולות כרטיסיית אימון" hidden>/);
  assert.match(html, /<button type="button" class="action-btn primary" id="startBtn" aria-label="התחל אימון במצב חי">/);
  assert.match(html, /<button type="button" class="action-btn" id="previewBtn" aria-label="פתח קישור אימון לתצוגת מתאמן">/);
  assert.match(html, /<button type="button" class="action-btn" id="shareBtn" aria-label="שתף אימון ללקוח">/);
  assert.match(html, /<button type="button" class="action-btn" id="pdfBtn" aria-label="דף להדפסה או שמירה כ־PDF">/);
  assert.match(html, /<button type="button" class="action-btn" id="saveBtn" aria-label="שמור אימון במאגר המקומי בדפדפן">/);
  assert.match(html, /<button type="button" class="action-btn" id="jsonBtn" aria-label="ייצא מבנה אימון כ־JSON">/);
  assert.match(html, /<button type="button" class="action-btn" id="copyBtn" aria-label="העתק טקסט אימון ללוח">/);
});

test('frontend/index.html static: input examples, clear button and conversion buttons have accessible labels', function () {
  assert.match(html, /role="group" aria-label="דוגמאות אימון למילוי מהיר"/);
  assert.match(html, /data-ex="1" aria-label="טען דוגמה: אימון פונקציונלי"/);
  assert.match(html, /data-ex="2" aria-label="טען דוגמה: אימון כוח"/);
  assert.match(html, /data-ex="3" aria-label="טען דוגמה: אימון HIIT"/);
  assert.match(html, /id="clearBtn" aria-label="נקה עורך טקסט"/);
  assert.match(html, /id="parseBtn" aria-label="המר תיאור אימון לכרטיסייה"/);
  assert.match(html, /id="netanyaBtn" aria-label="הוסף את חמשת אימוני הפתיחה של שלולית החורף נתניה למאגר השמור"/);
});

test('frontend/index.html static: live regions and status containers have polite announcement semantics', function () {
  assert.match(html, /<div id="saveToast" role="status" aria-live="polite">/);
  assert.match(html, /<div id="libraryStatus" role="status" aria-live="polite"><\/div>/);
  assert.match(html, /<div class="card-empty" id="cardEmpty" role="status" aria-live="polite">/);
});

test('frontend/index.html static: focus-visible and interactive styles are declared in CSS', function () {
  assert.match(html, /button:focus-visible,\s*a:focus-visible,\s*textarea:focus-visible,\s*\.history-item:focus-visible/);
  assert.match(html, /\.action-btn:focus-visible,\s*\.example-btn:focus-visible,\s*\.parse-btn:focus-visible/);
  assert.match(html, /\.history-item:focus\s*\{\s*border-color:\s*#7c3aed;\s*\}/);
});

test('frontend/index.html dynamic: parseWorkout with empty input displays empty message and hides card', function () {
  const page = mountFrontendIndex();
  page.el('workoutInput').value = '   ';
  page.click('parseBtn');

  assert.equal(page.el('cardEmpty').hidden, false);
  assert.equal(page.el('cardEmpty').textContent, 'כתבו תיאור אימון קודם.');
  assert.equal(page.el('cardContent').hidden, true);
  assert.equal(page.el('actionBar').hidden, true);
});

test('frontend/index.html dynamic: parseWorkout with valid text renders card and action bar', function () {
  const page = mountFrontendIndex();
  page.el('workoutInput').value = 'אימון פונקציונלי 45 דקות';
  page.click('parseBtn');

  assert.equal(page.el('cardEmpty').hidden, true);
  assert.equal(page.el('cardContent').hidden, false);
  assert.equal(page.el('actionBar').hidden, false);
  assert.match(page.el('cardContent').innerHTML, /אימון בדיקה/);
  assert.equal(page.el('libraryStatus').textContent, 'הכרטיסייה מוכנה. בדקו זמנים ותוכן לפני שמירה.');
});

test('frontend/index.html dynamic: parseWorkout error displays accessible error-card with role="alert"', function () {
  const page = mountFrontendIndex({
    parseWorkoutClient: function () {
      throw new Error('שגיאת פענוח');
    }
  });
  page.el('workoutInput').value = 'טקסט לא תקין לחלוטין';
  page.click('parseBtn');

  assert.equal(page.el('cardEmpty').hidden, true);
  assert.equal(page.el('cardContent').hidden, false);
  assert.equal(page.el('actionBar').hidden, true);
  assert.match(page.el('cardContent').innerHTML, /class="error-card"\s+role="alert"/);
  assert.match(page.el('cardContent').innerHTML, /ההמרה נכשלה/);
  assert.equal(page.el('libraryStatus').textContent, 'ההמרה נכשלה. הטקסט נשאר בעורך.');
});

test('frontend/index.html dynamic: clicking clearBtn resets input, status and focuses workoutInput', function () {
  const page = mountFrontendIndex();
  page.el('workoutInput').value = 'טקסט כלשהו';
  page.click('parseBtn');
  assert.equal(page.el('actionBar').hidden, false);

  page.click('clearBtn');
  assert.equal(page.el('workoutInput').value, '');
  assert.equal(page.el('actionBar').hidden, true);
  assert.equal(page.el('cardContent').hidden, true);
  assert.equal(page.el('cardEmpty').hidden, false);
  assert.equal(page.el('cardEmpty').textContent, 'העורך נוקה. הזינו תיאור חדש ולחצו «המר לכרטיסייה».');
  assert.equal(page.el('libraryStatus').textContent, 'העורך נוקה.');
  assert.equal(page.getFocusedId(), 'workoutInput');
});

test('frontend/index.html dynamic: history item has keyboard role and responds to Enter key', function () {
  const savedWorkout = {
    title: 'אימון שמור לדוגמה',
    source_text: 'אימון שמור טקסט מקור',
    savedAt: '17/10/2026',
    intensity: 'high',
    phases: []
  };
  const page = mountFrontendIndex({ savedStorage: [savedWorkout] });

  const historyHtml = page.el('historyList').innerHTML;
  assert.match(historyHtml, /class="history-item"\s+data-load="0"\s+role="button"\s+tabindex="0"\s+aria-label="טען אימון: אימון שמור לדוגמה"/);
  assert.match(historyHtml, /class="history-del"\s+data-del="0"\s+aria-label="מחק את אימון שמור לדוגמה מהאימונים השמורים"/);

  // Trigger keyboard activation (Enter key)
  const fakeItemNode = {
    getAttribute: function (k) { return k === 'data-load' ? '0' : null; },
    closest: function (sel) {
      if (sel === '[data-load]') return fakeItemNode;
      return null;
    }
  };

  const prevented = page.triggerHistoryKeydown('Enter', fakeItemNode);
  assert.equal(prevented, true);
  assert.equal(page.el('workoutInput').value, 'אימון שמור טקסט מקור');
  assert.equal(page.el('libraryStatus').textContent, 'האימון נטען מהדפדפן.');
  assert.equal(page.el('cardContent').hidden, false);
});
