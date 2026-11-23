'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { filterJournalSessions } = require('../js/journal-search.js');

const sessions = [
  { id: 'a', doneAt: '2026-11-05', exercises: [{ name: 'Squat', id: 'squat' }] },
  { id: 'b', doneAt: '2026-11-03', exercises: [{ name: 'Deadlift' }] },
  { id: 'c', doneAt: '2026-10-28', exercises: [{ name: 'SQUAT' }, { name: 'פלאנק' }] },
  { id: 'd', doneAt: '2026-10-20', exercises: [{ name: 'סקוואט' }] }
];

const ids = (rows) => rows.map((row) => row.id);

test('filterJournalSessions: exercise name is matched case-insensitively in names and set ids', () => {
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, { exerciseName: 'sqUaT' })), ['c', 'a']);
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, { exercise: 'פלאנק' })), ['c']);
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, 'deadlift')), ['b']);
  const recorded = [
    { id: 'sets', doneAt: '2026-11-01T12:00:00', sets: [{ exerciseId: 'squat', reps: 5 }] },
    { id: 'other', doneAt: '2026-11-02T12:00:00', sets: [{ exerciseId: 'row', reps: 5 }] }
  ];
  assert.deepStrictEqual(ids(filterJournalSessions(recorded, { exerciseName: 'SQUAT' })), ['sets']);
});

test('filterJournalSessions: start and end dates are inclusive calendar-day bounds', () => {
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, { startDate: '2026-11-01', endDate: '2026-11-05' })), [
    'b',
    'a'
  ]);
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, { startDate: '2026-11-01', endDate: '2026-11-04' })), [
    'b'
  ]);
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, { endDate: '2026-10-28' })), ['d', 'c']);
  assert.deepStrictEqual(filterJournalSessions(sessions, { startDate: '2026-11-06' }), []);
  assert.deepStrictEqual(filterJournalSessions(sessions, { endDate: '2026-10-19' }), []);
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, { from: new Date(2026, 10, 3, 12), to: '2026-11-05' })), [
    'b',
    'a'
  ]);
});

test('filterJournalSessions: exercise and date filters combine', () => {
  assert.deepStrictEqual(
    ids(filterJournalSessions(sessions, { exerciseName: 'squat', startDate: '2026-10-29', endDate: '2026-11-05' })),
    ['a']
  );
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, { exerciseName: 'deadlift', startDate: '2026-11-01' })), [
    'b'
  ]);
  assert.deepStrictEqual(filterJournalSessions(sessions, { exerciseName: 'squat', endDate: '2026-10-27' }), []);
  assert.deepStrictEqual(filterJournalSessions(sessions, { exerciseName: 'nonexistent', startDate: '2026-10-01' }), []);
});

test('filterJournalSessions: empty or null input returns a new, date-ordered array', () => {
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, null)), ['d', 'c', 'b', 'a']);
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, {})), ['d', 'c', 'b', 'a']);
  assert.deepStrictEqual(ids(filterJournalSessions(sessions, { exerciseName: '', startDate: '', endDate: '' })), [
    'd',
    'c',
    'b',
    'a'
  ]);
  assert.deepStrictEqual(filterJournalSessions(null, null), []);
  const copy = filterJournalSessions(sessions, null);
  copy.reverse();
  assert.deepStrictEqual(ids(sessions), ['a', 'b', 'c', 'd'], 'the input array is never mutated');
});

test('journal.html exposes a labelled history search panel wired to the filter engine', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'journal.html'), 'utf8');
  assert.match(html, /id="journalHistorySearchPanel"/);
  for (const id of ['historyExerciseSearch', 'historyDateFrom', 'historyDateTo']) {
    assert.match(html, new RegExp('<label for="' + id + '">'), id + ' has an explicit label');
    assert.match(html, new RegExp('id="' + id + '"'), id + ' field exists');
  }
  assert.match(html, /src="\.\/js\/journal-search\.js"/);
  assert.match(html, /filterJournalSessions\(/);
  assert.match(html, /createElement\(/);
  assert.match(html, /textContent/);
  assert.doesNotMatch(html, /<script[^>]+(chart|d3|cdn)/i);
  const TH = require('../js/core.js');
  assert.strictEqual(typeof TH.filterJournalSessions, 'function');
  assert.deepStrictEqual(ids(TH.filterJournalSessions(sessions, 'deadlift')), ['b']);
});
