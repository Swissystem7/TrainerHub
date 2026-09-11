'use strict';

/* Round-2 follow-up: the export card in weekly.html, driven as the page drives it.
   The page's own inline script is executed in a node:vm context over a small
   hand-written DOM, so what is asserted here is the card's RUNTIME behaviour —
   which bytes land in the two boxes, which bytes the two download links actually
   carry, and what happens to all of that when the plan changes — not which
   substrings the file contains.

   No new dependency, no clock, no randomness, no network: the fake DOM, the fake
   Blob and the fake URL.createObjectURL are all in this file, the start instant
   comes from the two literal form fields, and TH.generateWorkoutProgram is the
   same deterministic generator the page calls.

   The card writes the start instant in the local zone of the machine that renders
   it, so the zone is pinned here and the pinned instant is then the same on every
   machine. node:test gives each file its own process, so this affects nothing else. */

process.env.TZ = 'UTC';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const TH = require('../js/core.js');
const THExport = require('../js/export-workout.js');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

const html = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
const CRLF = '\r\n';

function pageScript() {
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, 'weekly.html should carry exactly one inline script');
  return blocks[0][1];
}

const FIELDS = {
  muscle: 'full',
  goal: 'hypertrophy',
  level: 'beginner',
  equipment: 'none',
  audience: 'general',
  days: '3',
  exportDate: '',
  exportTime: '18:00'
};

const IDS = ['muscle', 'goal', 'level', 'equipment', 'audience', 'days', 'form', 'result',
  'exportCard', 'exportFor', 'exportDate', 'exportTime', 'exportIcs', 'exportJson',
  'exportIcsLink', 'exportJsonLink'];

function makeElement(id) {
  return {
    id: id,
    value: Object.prototype.hasOwnProperty.call(FIELDS, id) ? FIELDS[id] : '',
    textContent: '',
    innerHTML: '',
    hidden: id === 'exportCard',
    href: '#',
    download: '',
    dataset: {},
    events: {},
    scrolled: 0,
    addEventListener: function (type, fn) { (this.events[type] = this.events[type] || []).push(fn); },
    removeAttribute: function (name) { if (name === 'href') this.href = null; },
    scrollIntoView: function () { this.scrolled += 1; },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    insertAdjacentHTML: function (where, markup) { this.innerHTML += markup; },
    remove: function () {}
  };
}

function loadPage() {
  const els = {};
  IDS.forEach(function (id) { els[id] = makeElement(id); });

  const blobs = new Map();
  const revoked = [];
  let issued = 0;
  function FakeBlob(parts, opts) {
    this.text = (parts || []).join('');
    this.type = (opts && opts.type) || '';
  }
  const URLStub = {
    createObjectURL: function (blob) {
      issued += 1;
      const url = 'blob:trainerhub/' + issued;
      blobs.set(url, blob);
      return url;
    },
    revokeObjectURL: function (url) { revoked.push(url); blobs.delete(url); }
  };

  const context = {
    document: {
      getElementById: function (id) { return els[id] || null; },
      addEventListener: function () {},
      readyState: 'complete'
    },
    TH: TH,
    THExport: THExport,
    URL: URLStub,
    Blob: FakeBlob,
    navigator: { clipboard: { writeText: function () { return Promise.resolve(); } } },
    console: console
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(pageScript(), context, { filename: 'weekly.html' });

  return {
    ctx: context,
    els: els,
    blobs: blobs,
    revoked: revoked,
    // exactly what a trainer downloads from a link, or null when the link carries nothing
    download: function (id) {
      const link = els[id];
      if (!link.href || !blobs.has(link.href)) return null;
      return blobs.get(link.href).text;
    },
    mime: function (id) {
      const link = els[id];
      return link.href && blobs.has(link.href) ? blobs.get(link.href).type : null;
    },
    rebuild: function (fields) {
      Object.keys(fields || {}).forEach(function (id) { els[id].value = fields[id]; });
      context.run();
    }
  };
}

function dayJson(ctx, index) {
  const day = ctx.__lastProgram.dailyWorkouts[index];
  const w = TH.toPhasesWorkout(day, ctx.__lastMeta || {});
  return THExport.workoutToJson({ name: w.title, phases: w.phases });
}

test('the export card hands over the bytes of the day it was opened for', function () {
  const page = loadPage();
  assert.ok(page.ctx.__lastProgram, 'the page builds a plan on load');
  assert.equal(page.els.exportCard.hidden, true, 'the card stays closed until a day is exported');

  page.ctx.exportDayWorkout(1);
  assert.equal(page.els.exportCard.hidden, false);
  const expected = dayJson(page.ctx, 1);
  assert.equal(page.els.exportJson.value, expected, 'the JSON box shows day 2');
  assert.equal(page.download('exportJsonLink'), expected, 'the link downloads exactly what is shown');
  assert.equal(page.mime('exportJsonLink'), 'application/json;charset=utf-8');
  assert.equal(page.els.exportJsonLink.download, 'trainerhub-workout-2.json');
  assert.equal(page.els.exportIcs.value, '', 'no date yet, so no calendar file');
  assert.equal(page.download('exportIcsLink'), null);
  assert.match(page.els.exportFor.textContent, /בחרו תאריך/);

  page.els.exportDate.value = '2026-09-20';
  page.ctx.renderExport();
  const ics = page.els.exportIcs.value;
  assert.equal(page.download('exportIcsLink'), ics, 'the calendar link downloads exactly what is shown');
  assert.equal(page.mime('exportIcsLink'), 'text/calendar;charset=utf-8');
  assert.equal(page.els.exportIcsLink.download, 'trainerhub-workout-2.ics');
  const lines = ics.split(CRLF);
  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  assert.ok(lines.indexOf('DTSTART:20260920T180000Z') !== -1, '18:00 in the two fields, that instant');
  assert.ok(lines.indexOf('DTSTAMP:20260920T180000Z') !== -1);
  assert.ok(ics.endsWith(CRLF));
  for (const line of lines) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= THExport.LINE_LIMIT, line);
  }
  assert.equal(page.els.exportFor.textContent.indexOf('בחרו תאריך'), -1);
});

test('rebuilding the plan cannot leave a downloadable workout from the old plan', function () {
  const page = loadPage();
  page.els.exportDate.value = '2026-09-20';
  page.ctx.exportDayWorkout(0);
  const stale = page.els.exportJson.value;
  const staleUrl = page.els.exportJsonLink.href;
  assert.ok(stale.length > 0);

  page.rebuild({ muscle: 'legs', goal: 'strength', level: 'advanced', equipment: 'dumbbells' });

  assert.equal(page.els.exportCard.hidden, true, 'a rebuilt plan closes the export card');
  assert.equal(page.els.exportJson.value, '', 'the old JSON must not stay in the box');
  assert.equal(page.els.exportIcs.value, '', 'the old calendar file must not stay in the box');
  assert.equal(page.download('exportJsonLink'), null, 'the old JSON must not stay downloadable');
  assert.equal(page.download('exportIcsLink'), null, 'the old calendar file must not stay downloadable');
  assert.ok(page.revoked.includes(staleUrl), 'the stale object URL is released');
  assert.notEqual(stale, dayJson(page.ctx, 0), 'the fixture must really produce a different plan');
});

test('a day that the new plan no longer has cannot stay in the card', function () {
  const page = loadPage();
  page.ctx.exportDayWorkout(2);
  assert.equal(page.els.exportCard.hidden, false);
  const stale = page.els.exportJson.value;
  assert.ok(stale.length > 0);

  page.rebuild({ days: '1' });
  assert.equal(page.ctx.__lastProgram.dailyWorkouts.length, 1);
  assert.equal(page.els.exportCard.hidden, true, 'day 3 no longer exists, so the card must close');
  assert.equal(page.els.exportJson.value, '');
  assert.equal(page.download('exportJsonLink'), null);
});

test('editing the open day in place refreshes the card instead of serving the old version', function () {
  const page = loadPage();
  page.els.exportDate.value = '2026-09-20';
  page.ctx.exportDayWorkout(0);
  const before = page.els.exportJson.value;
  const beforeIcs = page.els.exportIcs.value;

  // what the swap handler does: mutate the open day, then re-render the same plan
  const day = page.ctx.__lastProgram.dailyWorkouts[0];
  day.exercises = day.exercises.slice(0, 1);
  delete day.phases;
  page.ctx.renderProgram(page.ctx.__lastProgram);

  assert.equal(page.els.exportCard.hidden, false, 'an in-place edit keeps the card open');
  const after = page.els.exportJson.value;
  assert.notEqual(after, before, 'the card follows the edit');
  assert.equal(after, dayJson(page.ctx, 0));
  assert.equal(page.download('exportJsonLink'), after);
  assert.notEqual(page.els.exportIcs.value, beforeIcs);
  assert.equal(page.download('exportIcsLink'), page.els.exportIcs.value);
});

test('the date and the time fields are wired to the card, not only to a function', function () {
  const page = loadPage();
  page.ctx.exportDayWorkout(0);
  assert.equal(page.els.exportIcs.value, '', 'no date yet');

  page.els.exportDate.value = '2026-09-20';
  page.els.exportDate.events.change.forEach(function (fn) { fn({}); });
  const evening = page.els.exportIcs.value;
  assert.ok(evening.split(CRLF).indexOf('DTSTART:20260920T180000Z') !== -1, 'the default 18:00');
  assert.equal(page.download('exportIcsLink'), evening);

  page.els.exportTime.value = '06:30';
  page.els.exportTime.events.change.forEach(function (fn) { fn({}); });
  const morning = page.els.exportIcs.value;
  assert.ok(morning.split(CRLF).indexOf('DTSTART:20260920T063000Z') !== -1, 'the time field moves the event');
  assert.notEqual(morning, evening);
  assert.equal(page.download('exportIcsLink'), morning, 'the link follows the box');
});

test('clearing the date takes the calendar file off the card and leaves the JSON', function () {
  const page = loadPage();
  page.els.exportDate.value = '2026-09-20';
  page.ctx.exportDayWorkout(0);
  const json = page.els.exportJson.value;
  assert.ok(page.download('exportIcsLink'));

  page.els.exportDate.value = '';
  page.els.exportDate.events.change.forEach(function (fn) { fn({}); });
  assert.equal(page.els.exportIcs.value, '', 'no date, no calendar file');
  assert.equal(page.download('exportIcsLink'), null, 'and nothing left to download');
  assert.equal(page.els.exportJson.value, json, 'the JSON does not need a date');
  assert.equal(page.download('exportJsonLink'), json);
  assert.match(page.els.exportFor.textContent, /בחרו תאריך/);
  assert.equal(page.els.exportCard.hidden, false);
});

test('every render releases the object URL it replaces', function () {
  const page = loadPage();
  page.els.exportDate.value = '2026-09-20';
  page.ctx.exportDayWorkout(0);
  page.ctx.exportDayWorkout(1);
  page.ctx.exportDayWorkout(2);
  const live = [page.els.exportIcsLink.href, page.els.exportJsonLink.href].filter(Boolean);
  assert.equal(page.blobs.size, live.length, 'only the two live files are still held');
  assert.ok(page.revoked.length >= 4, 'the earlier renders were released');
  live.forEach(function (url) { assert.equal(page.revoked.includes(url), false); });
});

test('the card names the day the export button was pressed on', function () {
  const page = loadPage();
  page.ctx.exportDayWorkout(2);
  const title = page.ctx.__lastProgram.dailyWorkouts[2].title;
  assert.ok(title, 'the fixture day has a title');
  assert.equal(page.els.exportFor.textContent.indexOf(title) !== -1, true, page.els.exportFor.textContent);
  assert.equal(page.els.exportJsonLink.download, 'trainerhub-workout-3.json');
  assert.equal(page.els.exportCard.scrolled, 1, 'the card is brought into view once');
  assert.equal(page.els.exportJson.value, dayJson(page.ctx, 2));
  assert.equal((page.els.exportFor.textContent.match(new RegExp(title, 'g')) || []).length, 1,
    'the day is named once, not twice');
});
