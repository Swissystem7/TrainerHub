'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const THExport = require('../js/export-workout.js');
const { workoutToJson, totalSeconds, icsEscape, workoutToIcs, unfold, LINE_LIMIT } = THExport;

// 120+30 (warm-up) + 3*30+60 (main) + 1*30+0 (no numbers) = 330 seconds
const WORKOUT = {
  name: 'אימון בטן וליבה',
  phases: [
    { name: 'חימום', exercises: [{ name: 'חימום', id: 'warmup', duration_seconds: 120, rest_seconds: 30 }] },
    {
      name: 'עיקרי',
      exercises: [
        { name: 'בטן', id: 'crunches', sets: 3, reps: 12, rest_seconds: 60, notes: 'לאט' },
        { name: 'פלאנק' }
      ]
    }
  ]
};
const EXPECTED_SECONDS = 330;
const START = '2026-09-10T17:00:00Z';

test('export: workoutToJson is deterministic and fills every missing field with null', () => {
  const json = workoutToJson(WORKOUT);
  assert.equal(json, workoutToJson(WORKOUT), 'same input, same bytes');
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.name, 'אימון בטן וליבה');
  assert.deepEqual(parsed.phases.map((p) => p.name), ['חימום', 'עיקרי']);
  const plank = parsed.phases[1].exercises[1];
  assert.deepEqual(plank, {
    name: 'פלאנק', id: null, sets: null, reps: null,
    duration_seconds: null, rest_seconds: null, notes: null
  });
  assert.deepEqual(parsed.phases[1].exercises[0].reps, 12);
  assert.equal(JSON.parse(workoutToJson({})).phases.length, 0);
});

test('export: totalSeconds counts duration, sets and rest', () => {
  assert.equal(totalSeconds(WORKOUT), EXPECTED_SECONDS);
  assert.equal(totalSeconds({}), 0);
  assert.equal(totalSeconds({ phases: [] }), 0);
  assert.equal(totalSeconds({ phases: [{ exercises: [{ name: 'x' }] }] }), 30, 'one unstated set is 30s');
  assert.equal(totalSeconds({ phases: [{ exercises: [{ duration_seconds: -5, rest_seconds: 'abc' }] }] }), 0,
    'nonsense numbers never make the total negative');
});

test('export: icsEscape escapes exactly the RFC 5545 specials', () => {
  assert.equal(icsEscape('a;b,c\\d'), 'a\\;b\\,c\\\\d');
  assert.equal(icsEscape('שורה\nשנייה'), 'שורה\\nשנייה');
  assert.equal(icsEscape('שורה\r\nשנייה'), 'שורה\\nשנייה');
  assert.equal(icsEscape(undefined), '');
  assert.equal(icsEscape(null), '');
  assert.equal(icsEscape('נקי'), 'נקי');
});

test('export: workoutToIcs requires a usable start', () => {
  assert.throws(() => workoutToIcs(WORKOUT, {}), { message: 'start is required' });
  assert.throws(() => workoutToIcs(WORKOUT), { message: 'start is required' });
  assert.throws(() => workoutToIcs(WORKOUT, { start: 'not a date' }), { message: 'start is required' });
});

test('export: workoutToIcs writes a valid, CRLF-terminated VEVENT', () => {
  const ics = workoutToIcs(WORKOUT, { start: START });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'), ics.slice(0, 60));
  assert.ok(ics.includes('DTSTART:20260910T170000Z'), ics);
  assert.ok(ics.includes('DTSTAMP:20260910T170000Z'), 'DTSTAMP equals DTSTART so the export is stable');
  assert.ok(ics.includes('DURATION:PT' + EXPECTED_SECONDS + 'S'), ics);
  assert.ok(unfold(ics).includes('SUMMARY:אימון בטן וליבה'), ics);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'), JSON.stringify(ics.slice(-30)));
  assert.equal(ics.replace(/\r\n/g, '').indexOf('\n'), -1, 'no bare newline anywhere');
  assert.ok(ics.includes('UID:trainerhub-'), ics);
  assert.ok(workoutToIcs({ phases: [] }, { start: START }).includes('DURATION:PT0S'));
});

test('export: long content lines are folded to 75 octets and unfold losslessly', () => {
  const long = {
    name: 'אימון ארוך',
    phases: [{
      name: 'עיקרי מאוד ארוך עם שם שנועד לחצות את גבול שבעים וחמישה האוקטטים של התקן',
      exercises: [
        { name: 'תרגיל ראשון עם שם ארוך במיוחד לבדיקת קיפול שורות בעברית', sets: 3, reps: 12 },
        { name: 'תרגיל שני עם שם ארוך במיוחד לבדיקת קיפול שורות בעברית', duration_seconds: 45 }
      ]
    }]
  };
  const ics = workoutToIcs(long, { start: START });
  const lines = ics.split('\r\n');
  for (const line of lines) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= LINE_LIMIT,
      'line of ' + Buffer.byteLength(line, 'utf8') + ' octets: ' + line);
  }
  const description = unfold(ics).split('\r\n').find((l) => l.startsWith('DESCRIPTION:'));
  assert.ok(description, unfold(ics));
  assert.ok(description.includes('תרגיל ראשון עם שם ארוך במיוחד לבדיקת קיפול שורות בעברית'),
    'unfolding restores the original text: ' + description);
  assert.ok(description.includes('45 שניות'), description);
  assert.ok(lines.some((l) => l.startsWith(' ')), 'something was actually folded');
});

test('export: the same workout always exports the same bytes, different workouts get different UIDs', () => {
  assert.equal(workoutToIcs(WORKOUT, { start: START }), workoutToIcs(WORKOUT, { start: START }));
  const uidOf = (ics) => unfold(ics).split('\r\n').find((l) => l.startsWith('UID:'));
  const a = uidOf(workoutToIcs(WORKOUT, { start: START }));
  const b = uidOf(workoutToIcs(Object.assign({}, WORKOUT, { name: 'אימון אחר' }), { start: START }));
  assert.notEqual(a, b);
  assert.equal(uidOf(workoutToIcs(WORKOUT, { start: START, uid: 'fixed-uid' })), 'UID:fixed-uid');
});

test('export: text from a workout is escaped, never interpreted', () => {
  const nasty = { name: 'שם;עם,פסיקים\\ולוכסן', phases: [{ name: 'p', exercises: [{ name: 'a\nb' }] }] };
  const ics = workoutToIcs(nasty, { start: START });
  const unfolded = unfold(ics);
  assert.ok(unfolded.includes('SUMMARY:שם\\;עם\\,פסיקים\\\\ולוכסן'), unfolded);
  assert.ok(!/SUMMARY:[^\r\n]*[^\\];/.test(unfolded), 'no unescaped semicolon survives');
  assert.equal(unfolded.split('\r\n').filter((l) => l.startsWith('BEGIN:VEVENT')).length, 1,
    'a name cannot inject a second event');
});
