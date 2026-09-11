'use strict';

/* Round-2 item 4: the bytes weekly.html hands a trainer.
   DAY is a daily workout in the shape TH.generateWorkoutProgram produces;
   TH.toPhasesWorkout(DAY, META) is exactly what weekly.html calls, and
   exportModel() is the same two-field object the page passes to THExport.
   Every byte pinned below was derived by hand in a Python re-implementation of
   the rules in js/export-workout.js (RFC 5545 escaping, 75-octet folding,
   FNV-1a over the JSON, a set with no duration counted as 30 seconds) before
   this file was written. Nothing here reads the module to decide what to
   expect, and there is no clock: the start instant is a literal. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TH = require('../js/core.js');
const THExport = require('../js/export-workout.js');

TH.setCatalog({});

const weekly = fs.readFileSync(path.join(__dirname, '..', 'weekly.html'), 'utf8');

const DAY = {
  day: 1,
  split: 'full',
  title: 'אימון 1',
  warmUp: 'arm_circles',
  coolDown: 'hamstring_stretch',
  exercises: [
    { name: 'push_up', sets: 3, reps: '8-12', restSeconds: 60, notes: null },
    { name: 'plank', sets: 3, reps: null, duration_seconds: 40, restSeconds: 30, notes: null }
  ]
};
const META = { equipment: ['משקל גוף'], intensity: 'medium', tags: ['full', 'hypertrophy'] };
const START = "2026-09-20T18:00:00Z";

// weekly.html: exportModel(dayIndex)
function exportModel() {
  const w = TH.toPhasesWorkout(DAY, META);
  return { name: w.title, phases: w.phases };
}

const EXPECTED_SECONDS = 580;
const EXPECTED_UID = "trainerhub-33a8876f";
const EXPECTED_JSON = [
  "{\n  \"version\": 1,\n  \"name\": \"אימון 1\",\n  \"phases\": [\n    {\n      \"name\": \"Warm-up\",\n      \"exercises\": [\n        {\n          \"name\": \"מעגלי ידיים\",\n          \"id\": \"arm_circles\",\n          \"sets\": 1,\n          \"reps\": null,\n          \"duration_seconds\": 180,\n          \"rest_seconds\": null,\n          \"notes\": null\n        }\n      ]\n    },\n    {\n      \"name\": \"Main\",\n      \"exercises\": [\n        {\n          \"name\": \"שכיבות סמיכה\",\n          \"id\": \"push_up\",\n          \"sets\": 3,\n          \"reps\": \"8-12\",\n          \"duration_seconds\": null,\n          \"rest_seconds\": 60,\n          \"notes\": null\n        },\n        {\n          \"name\": \"פלאנק\",\n          \"id\": \"plank\",\n          \"sets\": 3,\n          \"reps\": null,\n          \"duration_seconds\": 40,\n          \"rest_seconds\": 30,\n          \"notes\": null\n        }\n      ]\n    },\n    {\n      \"name\": \"Cool-down\",\n      \"exercises\": [\n        {\n          \"name\": \"מתיחת מיתר\",\n          \"id\": \"hamstring_stretch\",\n          \"sets\": 1,\n          \"reps\": null,\n          \"duration_seconds\": 180,\n          \"rest_seconds\": null,\n          \"notes\": null\n        }\n      ]\n    }\n  ]\n}"
].join('\n');
const EXPECTED_ICS = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//TrainerHub//Workout//HE",
  "BEGIN:VEVENT",
  "UID:trainerhub-33a8876f",
  "DTSTAMP:20260920T180000Z",
  "DTSTART:20260920T180000Z",
  "DURATION:PT580S",
  "SUMMARY:אימון 1",
  "DESCRIPTION:Warm-up · מעגלי ידיים · 180 שניות\\nMain · ש",
  " כיבות סמיכה · 3×8-12\\nMain · פלאנק · 40 שניות\\nCoo",
  " l-down · מתיחת מיתר · 180 שניות",
  "END:VEVENT",
  "END:VCALENDAR",
  ""
].join('\r\n');

test('export integration: the weekly builder model becomes these exact JSON bytes', () => {
  const model = exportModel();
  assert.equal(model.name, 'אימון 1');
  assert.deepEqual(model.phases.map((p) => p.name), ['Warm-up', 'Main', 'Cool-down']);
  const json = THExport.workoutToJson(model);
  assert.equal(json, EXPECTED_JSON);
  assert.equal(json, THExport.workoutToJson(exportModel()), 'same day, same bytes');
  assert.equal(Buffer.byteLength(json, 'utf8'), 1166);
});

test('export integration: the same model becomes these exact calendar bytes', () => {
  const model = exportModel();
  const ics = THExport.workoutToIcs(model, { start: START });
  assert.equal(ics, EXPECTED_ICS);
  assert.equal(THExport.totalSeconds(model), EXPECTED_SECONDS);
  assert.match(ics, new RegExp('DURATION:PT' + EXPECTED_SECONDS + 'S'));
  assert.ok(ics.endsWith('\r\n'), 'RFC 5545 lines end with CRLF');
  for (const line of ics.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= THExport.LINE_LIMIT, line);
  }
});

test('export integration: the UID is stable for the same workout and moves when it changes', () => {
  const model = exportModel();
  const ics = THExport.workoutToIcs(model, { start: START });
  assert.ok(THExport.unfold(ics).includes('UID:' + EXPECTED_UID), 'UID drifted from the hand derivation');
  assert.equal(ics, THExport.workoutToIcs(exportModel(), { start: START }));

  const changed = exportModel();
  changed.phases[1].exercises[0].sets = 4;
  const other = THExport.unfold(THExport.workoutToIcs(changed, { start: START }));
  assert.equal(other.includes('UID:' + EXPECTED_UID), false, 'a changed plan must not keep the same UID');
});

test('export integration: weekly.html loads the module and wires one export path to it', () => {
  assert.match(weekly, /<script src="\.\/js\/export-workout\.js"><\/script>/);
  assert.match(weekly, /THExport\.workoutToJson/);
  assert.match(weekly, /THExport\.workoutToIcs/);
  assert.match(weekly, /function exportModel/);
  assert.match(weekly, /exportDayWorkout\(/);
  assert.match(weekly, /id="exportDate"/);
  assert.match(weekly, /id="exportTime"/);
  assert.match(weekly, /id="exportIcs"/);
  assert.match(weekly, /id="exportJson"/);
  assert.match(weekly, /ייצוא ליומן/);
  assert.doesNotMatch(weekly, /new Date\(\)/, 'the export must not read the clock');
  assert.doesNotMatch(weekly, /Math\.random/);
  assert.doesNotMatch(weekly, /fetch\(/);
});
