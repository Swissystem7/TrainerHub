'use strict';

// Regression: the site scan page listed each exercise as sets · reps · seconds
// and dropped rest_seconds. A medium site gets the booklet's combined circuit
// (40 s work / 20 s rest) and every site drill rests 45 s, so the coach saw
// «40 שנ׳» with no rest at all, while booklet.html shows «מנוחה 20 שנ׳».

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');
const Plan = require('../js/site-plan.js');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'site-scan.html'), 'utf8');
B.setData(JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8')), null);

function extract(name) {
  const start = page.indexOf('function ' + name + '(');
  assert.ok(start !== -1, name);
  let depth = 0;
  for (let i = page.indexOf('{', start); i < page.length; i++) {
    if (page[i] === '{') depth++;
    else if (page[i] === '}' && --depth === 0) return page.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtEx = new Function('esc', extract('fmtEx') + '; return fmtEx;')(esc);

function mainRows(width, features) {
  const res = Plan.build({ width: width, features: features || [], hazards: [] }, { group: 1 });
  return res.workout.phases.filter((ph) => ph.name === 'Main')[0].exercises;
}

test('a combined-circuit station shows its 20-second rest', function () {
  const station = mainRows('medium').filter((x) => x.duration_seconds === 40 && x.rest_seconds === 20)[0];
  assert.ok(station, 'medium site uses the combined circuit');
  assert.match(fmtEx(station), /40 שנ׳ · מנוחה 20 שנ׳/);
});

test('a site drill shows its 45-second rest between sets', function () {
  const drill = mainRows('medium', ['bench']).filter((x) => x.name === 'עליות על ספסל')[0];
  assert.ok(drill);
  assert.match(fmtEx(drill), /3 סבבים · 12 חזרות · מנוחה 45 שנ׳/);
});

test('a row without a rest gets no rest bit', function () {
  assert.doesNotMatch(fmtEx({ name: 'ריצה קלה', sets: 1, reps: null, duration_seconds: 60, rest_seconds: null }), /מנוחה/);
});
