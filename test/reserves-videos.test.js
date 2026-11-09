'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const track = require('../content/reserves/miluim-track.json');
const html = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');
const YT = /^[A-Za-z0-9_-]{11}$/;

const EXPECTED = {
  'miluim-run-3000': ['bMeXQfQJ36E', 'vdnzLRfbRK8'],
  'miluim-pullups': ['9yVGh3XbJ34', 'gTZRADe8cN8', 'EkpJkHpJXmM'],
  'miluim-dips': ['UiirN9zI-lw', 'VgnRwQcDsuA'],
  'miluim-hr-pushups': ['dFI0VWMqxIk']
};

function idsOf(row) {
  const ids = [];
  if (row.youtubeId) ids.push(row.youtubeId);
  (row.youtubeIds || []).forEach((id) => {
    if (id && ids.indexOf(id) === -1) ids.push(id);
  });
  return ids;
}

test('every reserves test and demo has a verified youtube id list', () => {
  track.tests.concat(track.demos).forEach((row) => {
    assert.match(row.youtubeId, YT, row.id);
    const ids = idsOf(row);
    assert.equal(ids[0], row.youtubeId, row.id);
    ids.forEach((id) => assert.match(id, YT, row.id + ' ' + id));
    assert.deepEqual(ids, EXPECTED[row.exercise_id], row.id);
    const markup = TH.mediaMarkup({
      he: row.name_he,
      youtubeId: row.youtubeId,
      available: true
    }, { className: 'ex-media' });
    assert.match(markup, new RegExp('https://www.youtube.com/embed/' + row.youtubeId));
    assert.doesNotMatch(markup, /<video/);
  });
});

test('demo cards put the title and focus before the technique steps', () => {
  const start = html.indexOf('function renderDemos()');
  const end = html.indexOf('function renderPlan()');
  const fn = html.slice(start, end);
  const titleAt = fn.indexOf('card.appendChild(h)');
  const focusAt = fn.indexOf('card.appendChild(focus)');
  const techAt = fn.indexOf("th.textContent = 'טכניקה'");
  assert.ok(titleAt !== -1 && focusAt !== -1 && techAt !== -1);
  assert.ok(titleAt < focusAt && focusAt < techAt);
  assert.match(fn, /appendEmbeds\(card, d\)/);
  assert.match(html, /TH\.mediaMarkup/);
  assert.match(html, /startReserveSession/);
  assert.match(html, /saveMetricsToJournal/);
  assert.match(html, /host\.textContent = ''/);
});
