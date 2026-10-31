'use strict';

// A count of one reads «תרגיל אחד» / «אימון אחד», not «1 תרגילים» / «1 אימונים».
// library.html: the draft box pill under «האימון שלך» after adding the first
// clip said «1 תרגילים · כ־… דקות» — every draft starts that way.
// weekly.html: the summary pills said «1 אימונים» when «ימי אימון בשבוע» is 1,
// and «1 תרגילים באימון» when a day has a single exercise.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const root = path.join(__dirname, '..');
const library = fs.readFileSync(path.join(root, 'library.html'), 'utf8');
const weekly = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
const TH = require('../js/core.js');
TH.setCatalog(JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8')));

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start !== -1, name + ' is defined');
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('unbalanced braces in ' + name);
}

function elements() {
  const byId = {};
  return function (id) {
    if (!byId[id]) {
      byId[id] = {
        id: id, value: '', textContent: '', innerHTML: '', hidden: false,
        addEventListener: function () {},
        insertAdjacentHTML: function (pos, html) { this.innerHTML += html; },
        querySelectorAll: function () { return []; },
        querySelector: function () { return null; }
      };
    }
    return byId[id];
  };
}

function draftPill(exercises) {
  const $ = elements();
  const stubTH = {
    esc: TH.esc,
    draftGet: function () {
      return { duration_minutes: 12, phases: [{ exercises: [] }, { exercises: exercises }, { exercises: [] }] };
    }
  };
  new Function('$', 'TH', extractFunction(library, 'renderDraft') + '; renderDraft();')($, stubTH);
  const pills = $('draftList').innerHTML.match(/<div class="pill">[^<]*<\/div>/g);
  return pills[pills.length - 1];
}

test('library draft pill: one exercise reads «תרגיל אחד»', function () {
  assert.equal(draftPill([{ name: 'סקוואט', sets: 3, reps: '10' }]),
    '<div class="pill">תרגיל אחד · כ־12 דקות</div>');
});

test('library draft pill: two exercises keep the number', function () {
  assert.equal(draftPill([{ name: 'סקוואט', sets: 3, reps: '10' }, { name: 'מתח', sets: 3, reps: '8' }]),
    '<div class="pill">2 תרגילים · כ־12 דקות</div>');
});

function weeklySummary(program) {
  const $ = elements();
  $('equipment').value = 'none';
  const win = { location: { href: 'https://swissystem7.github.io/TrainerHub/weekly.html' }, __lastProgram: program, __lastMeta: { equipment: ['משקל גוף'], tags: [] } };
  const open = weekly.lastIndexOf('<script>');
  const script = weekly.slice(open + '<script>'.length, weekly.indexOf('</script>', open));
  const render = new Function('document', 'TH', 'window', script + '; return renderProgram;')(
    { getElementById: $, querySelectorAll: function () { return []; } }, TH, win);
  render(program);
  return $('result').innerHTML.match(/<div class="summary">.*?<\/div><\/div>/)[0];
}

function day(n, names) {
  return { day: n, split: 'full', exercises: names.map(function (name) { return { name: name, reps: '10', sets: 3, rest_seconds: 45 }; }) };
}

test('weekly summary: one day with one exercise reads «אימון אחד» / «תרגיל אחד באימון»', function () {
  const out = weeklySummary({ programId: 'p1', durationWeeks: 1, dailyWorkouts: [day(1, ['שכיבות סמיכה'])] });
  assert.match(out, /<div class="pill"><b>אימון אחד<\/b><\/div>/);
  assert.match(out, /<div class="pill"><b>תרגיל אחד<\/b> באימון<\/div>/);
  assert.doesNotMatch(out, /<b>1<\/b> (אימונים|תרגילים)/);
});

test('weekly summary: several days and exercises keep the numbers', function () {
  const out = weeklySummary({ programId: 'p2', durationWeeks: 1, dailyWorkouts: [day(1, ['שכיבות סמיכה', 'סקוואט']), day(2, ['מתח', 'פלאנק'])] });
  assert.match(out, /<div class="pill"><b>2<\/b> אימונים<\/div>/);
  assert.match(out, /<div class="pill"><b>2<\/b> תרגילים באימון<\/div>/);
});
