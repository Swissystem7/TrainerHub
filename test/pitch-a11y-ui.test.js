'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'pitch.html'), 'utf8');

function extractPageScript(src) {
  const match = src.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'page script block found');
  return match[1];
}

function mountPitchPage(options) {
  options = options || {};
  const els = {};
  const handlers = {};
  let printed = false;
  let copiedText = null;
  let execCommands = [];

  function el(id) {
    if (!els[id]) {
      const attrs = {};
      els[id] = {
        id: id,
        innerText: options.sheetText !== undefined ? options.sheetText : 'ספריית תרגילים בעברית. שלחו ללקוח אימון.',
        textContent: options.sheetText !== undefined ? options.sheetText : 'ספריית תרגילים בעברית. שלחו ללקוח אימון.',
        className: '',
        value: '',
        getAttribute: function (k) { return attrs[k] != null ? attrs[k] : null; },
        setAttribute: function (k, v) { attrs[k] = String(v); },
        removeAttribute: function (k) { delete attrs[k]; },
        addEventListener: function (type, fn) {
          handlers[id + ':' + type] = fn;
        }
      };
    }
    return els[id];
  }

  // Pre-seed elements
  ['printBtn', 'copyPitchBtn', 'copyStatus', 'sheet'].forEach(el);

  const documentMock = {
    getElementById: el,
    body: {
      appendChild: function (node) {},
      removeChild: function (node) {}
    },
    createElement: function (tagName) {
      return {
        value: '',
        style: {},
        setAttribute: function () {},
        select: function () {}
      };
    },
    execCommand: function (cmd) {
      execCommands.push(cmd);
      return true;
    }
  };

  const windowMock = {
    print: function () {
      printed = true;
    }
  };

  const navigatorMock = options.hasClipboard ? {
    clipboard: {
      writeText: function (txt) {
        copiedText = txt;
        return Promise.resolve();
      }
    }
  } : undefined;

  const scriptCode = extractPageScript(html);
  const runner = new Function('document', 'window', 'navigator', scriptCode);
  runner(documentMock, windowMock, navigatorMock);

  return {
    el: el,
    isPrinted: function () { return printed; },
    getCopiedText: function () { return copiedText; },
    getExecCommands: function () { return execCommands; },
    clickPrint: function () {
      if (handlers['printBtn:click']) handlers['printBtn:click']();
    },
    clickCopy: function () {
      if (handlers['copyPitchBtn:click']) handlers['copyPitchBtn:click']();
    }
  };
}

test('pitch.html static: document structure, language, direction and skip link', function () {
  assert.match(html, /<html\s+lang="he"\s+dir="rtl">/);
  assert.match(html, /<a\s+class="skip-link\s+no-print"\s+href="#sheet">דלג לדף<\/a>/);
  assert.match(html, /<article\s+class="sheet"\s+id="sheet"\s+tabindex="-1">/);
});

test('pitch.html static: nav has accessible label, full site links and active indicator', function () {
  assert.match(html, /<nav class="th-nav no-print" aria-label="ניווט ראשי">/);
  assert.match(html, /<span class="chip on">דף אחד להדפסה<\/span>/);
  assert.match(html, /<a href="\.\/">בנה אימון<\/a>/);
  assert.match(html, /<a href="\.\/weekly\.html">בונה שבועי<\/a>/);
  assert.match(html, /<a href="\.\/booklet\.html">חוברת הקורס<\/a>/);
  assert.match(html, /<a href="\.\/library\.html">ספריית סרטונים<\/a>/);
  assert.match(html, /<a href="\.\/journal\.html">יומן ביצוע<\/a>/);
  assert.match(html, /<a href="\.\/offer\.html">הצעה למאמנים<\/a>/);
  assert.match(html, /<a href="\.\/manage\.html">ניהול מאגר<\/a>/);
  assert.match(html, /<a href="\.\/frontend\/workout-mode\.html">מצב אימון חי<\/a>/);
});

test('pitch.html static: banner and accessible toolbar with action buttons', function () {
  assert.match(html, /<div class="th-banner no-print">/);
  assert.match(html, /<div class="toolbar no-print" role="toolbar" aria-label="פעולות דף אחד להדפסה">/);
  assert.match(html, /<button type="button" class="th-btn" id="printBtn" aria-label="הדפס או שמור כ־PDF">/);
  assert.match(html, /<button type="button" class="th-btn ghost" id="copyPitchBtn" aria-label="העתק טקסט ההצעה ללוח">/);
  assert.match(html, /<a class="th-btn ghost" href="\.\/offer\.html" aria-label="חזרה לדף ההצעה למאמנים">/);
  assert.match(html, /<div id="copyStatus" class="status-msg no-print" role="status" aria-live="polite"><\/div>/);
});

test('pitch.html static: section landmark associations with headings', function () {
  assert.match(html, /<section aria-labelledby="who-heading">/);
  assert.match(html, /<h2 id="who-heading">למי זה<\/h2>/);
  assert.match(html, /<h2 id="what-get-heading">מה הלקוח מקבל<\/h2>/);
  assert.match(html, /<ul aria-labelledby="what-get-heading">/);
  assert.match(html, /<section aria-labelledby="what-not-heading">/);
  assert.match(html, /<h2 id="what-not-heading">מה במכוון אין<\/h2>/);
  assert.match(html, /<ul aria-labelledby="what-not-heading">/);
  assert.match(html, /<section aria-labelledby="why-heading">/);
  assert.match(html, /<h2 id="why-heading">למה לא עוד AutoFit<\/h2>/);
});

test('pitch.html static: focus-visible and disabled button styles are defined in CSS', function () {
  assert.match(html, /button:focus-visible,\s*a:focus-visible\s*\{\s*outline:\s*2px solid var\(--lime\);/);
  assert.match(html, /\.th-btn\[disabled\],\s*\.th-btn\[aria-disabled="true"\]/);
});

test('pitch.html dynamic: clicking printBtn calls window.print()', function () {
  const page = mountPitchPage();
  assert.equal(page.isPrinted(), false);
  page.clickPrint();
  assert.equal(page.isPrinted(), true);
});

test('pitch.html dynamic: clicking copyPitchBtn with clipboard API writes text and displays status', async function () {
  const textContent = 'שלחו ללקוח אימון עם סרטון בעברית. 68 קליפים.';
  const page = mountPitchPage({ hasClipboard: true, sheetText: textContent });
  page.clickCopy();

  await Promise.resolve();
  assert.equal(page.getCopiedText(), textContent);
  assert.equal(page.el('copyStatus').textContent, 'טקסט ההצעה הועתק ללוח!');
});

test('pitch.html dynamic: fallback copy works when navigator.clipboard is unavailable', function () {
  const textContent = 'שלחו ללקוח אימון עם סרטון בעברית.';
  const page = mountPitchPage({ hasClipboard: false, sheetText: textContent });
  page.clickCopy();

  assert.deepEqual(page.getExecCommands(), ['copy']);
  assert.equal(page.el('copyStatus').textContent, 'טקסט ההצעה הועתק ללוח!');
});

test('pitch.html dynamic: empty sheet displays message in status', function () {
  const page = mountPitchPage({ hasClipboard: true, sheetText: '' });
  page.clickCopy();
  assert.equal(page.el('copyStatus').textContent, 'לא נמצא תוכן להעתקה.');
});
