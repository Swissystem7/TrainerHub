'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');
const track = JSON.parse(fs.readFileSync(path.join(root, 'content/reserves/miluim-track.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'css/app.css'), 'utf8');
const navJs = fs.readFileSync(path.join(root, 'js/th-nav.js'), 'utf8');

const PAGES = ['index.html', 'weekly.html', 'library.html', 'exercises.html', 'booklet.html', 'journal.html', 'reserves.html', 'offer.html', 'manage.html'];
const SAME_NAME = {
  'בנה אימון': /href="\.\/"(?:\s|>)/,
  'בונה שבועי': /href="\.\/weekly\.html"/,
  'יומן ביצוע': /href="\.\/journal\.html"/,
  'מדדי מילואים': /href="\.\/reserves\.html"/
};

function visibleCopy(trackData) {
  const bits = [
    trackData._meta.subtitle_he,
    trackData.plan.summary_he
  ];
  trackData.demos.forEach((d) => {
    bits.push(d.focus_he, ...(d.technique_he || []), ...(d.steps_he || []), ...(d.cues_he || []));
  });
  return bits.join('\n');
}

test('reserves page uses the same menu names as the rest of the app', () => {
  assert.match(html, /<a href="\.\/">בנה אימון<\/a>/);
  assert.match(html, /<a href="\.\/weekly\.html">בונה שבועי<\/a>/);
  assert.match(html, /<a href="\.\/journal\.html">יומן ביצוע<\/a>/);
  assert.doesNotMatch(html, /דף אימון|דף שבועי|יומן אימון/);
  for (const page of PAGES) {
    const src = fs.readFileSync(path.join(root, page), 'utf8');
    const nav = src.slice(src.indexOf('<nav class="th-nav"'), src.indexOf('</nav>'));
    for (const [label, href] of Object.entries(SAME_NAME)) {
      if (label === 'מדדי מילואים' && page === 'reserves.html') continue;
      if (label === 'בנה אימון' && page === 'index.html') continue;
      if (label === 'בונה שבועי' && page === 'weekly.html') continue;
      if (label === 'יומן ביצוע' && page === 'journal.html') continue;
      if (!href.test(nav)) continue;
      assert.match(nav, new RegExp('>' + label + '<'), page + ' should label that link ' + label);
    }
  }
});

test('reserves cards do not show verification flags or the unit-pending disclaimer', () => {
  assert.doesNotMatch(html, /verified:\s*false/i);
  assert.doesNotMatch(html, /ממתין לאישור/);
  assert.doesNotMatch(html, /לא מאומת/);
  assert.doesNotMatch(html, /RESERVE FITNESS|GoArmy|ACFT/);
  const shown = visibleCopy(track);
  assert.doesNotMatch(shown, /USMC/);
  assert.doesNotMatch(shown, /verified/i);
  assert.doesNotMatch(shown, /ממתין לאישור/);
  assert.doesNotMatch(shown, /GoArmy|ACFT|dead hang|Front Leaning|scapular|inverted rows/i);
  assert.match(track.demos[0].technique_he.join('\n'), /T/);
  assert.match(track.demos[0].steps_he.join('\n'), /50–70%/);
});

test('feedback still uses text nodes, and the nav row stays inside the screen', () => {
  assert.match(html, /host\.textContent = ''/);
  assert.doesNotMatch(html, /page-sub'\)\.innerHTML/);
  assert.match(css, /body\.th-ds \{\n[^}]*overflow-x:\s*hidden/);
  assert.match(css, /body\.th-ds \.th-nav \{[^}]*max-width:\s*100%/);
  assert.match(css, /body\.th-ds \.th-nav \{[^}]*min-width:\s*0/);
  assert.match(navJs, /inline:\s*'nearest'/);
  assert.doesNotMatch(navJs, /inline:\s*'center'/);
});
