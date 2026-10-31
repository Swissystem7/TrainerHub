'use strict';

// The weekly builder printed every duration in seconds, so each day read
// «מעגלי ידיים 180 שנ׳» for the 3-minute warm-up and «מנוחה 120 שנ׳» between
// sets. Whole minutes now read «3 דק׳» / «מנוחה 2 דק׳», like the print sheet;
// «מנוחה 45 שנ׳» stays in seconds.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
TH.setCatalog(JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8')));

function extract(name) {
  const start = page.indexOf('function ' + name + '(');
  assert.ok(start !== -1, 'weekly.html defines ' + name);
  let depth = 0;
  for (let i = page.indexOf('{', start); i < page.length; i++) {
    if (page[i] === '{') depth++;
    else if (page[i] === '}' && --depth === 0) return page.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

function render(program) {
  const els = {
    result: { innerHTML: '', querySelectorAll: function () { return []; } },
    equipment: { value: 'none' }
  };
  const esc = function (s) { return String(s); };
  const renderProgram = new Function('TH', '$', 'esc', 'window', extract('renderProgram') + '\nreturn renderProgram;')(
    TH, function (id) { return els[id]; }, esc, { __lastMeta: {} });
  renderProgram(program);
  return els.result.innerHTML.replace(/<select[\s\S]*?<\/select>/g, '');
}

function rowOf(html, name) {
  const at = html.indexOf('<b>' + name + '</b>');
  assert.ok(at !== -1, 'the plan lists ' + name);
  return html.slice(at, html.indexOf('</div>', at));
}

const program = {
  dailyWorkouts: [{
    day: 1,
    warmUp: 'arm_circles',
    coolDown: 'hamstring_stretch',
    exercises: [
      { name: 'שכיבות סמיכה', sets: 4, reps: '4-6', restSeconds: 120 },
      { name: 'סקוואט', sets: 3, reps: 12, restSeconds: 45 }
    ]
  }]
};

test('the 3-minute warm-up and cool-down read «3 דק׳», not «180 שנ׳»', function () {
  const html = render(program);
  assert.doesNotMatch(html, /180 שנ׳/);
  assert.match(rowOf(html, TH.heName('arm_circles')), /<span>3 דק׳ /);
  assert.match(rowOf(html, TH.heName('hamstring_stretch')), /<span>3 דק׳ /);
});

test('a 2-minute rest reads «מנוחה 2 דק׳», a 45-second rest stays «מנוחה 45 שנ׳»', function () {
  const html = render(program);
  assert.match(rowOf(html, 'שכיבות סמיכה'), /4 סטים · 4-6 חזרות · מנוחה 2 דק׳/);
  assert.match(rowOf(html, 'סקוואט'), /3 סטים · 12 חזרות · מנוחה 45 שנ׳/);
});

test('a generated weekly plan shows no whole-minute durations in seconds', function () {
  const p = TH.generateWorkoutProgram({
    age: 31, gender: 'other', fitnessLevel: 'beginner', goals: ['strength'],
    availableEquipment: ['none'], targetMuscles: [], injuries: [], previousWorkouts: 8,
    audience: '', preferCatalog: true
  }, 1, 3);
  const html = render(p);
  assert.doesNotMatch(html, /\b(?:60|120|180|240|300) שנ׳/);
  assert.match(html, /3 דק׳/);
});
