'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
const Journal = require('../js/journal-storage.js');
const Analyzer = require('../js/analyzer.js');

function reset() {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  Journal.clearJournal();
}

test('saveEntry persists to localStorage and returns volume from sets', function () {
  reset();
  const saved = Journal.saveEntry({
    title: 'אימון רגליים',
    doneAt: '2026-10-01T10:00:00.000Z',
    sets: [
      { exerciseId: 'squat', reps: 10, weightKg: 60 },
      { exerciseId: 'squat', reps: 8, weightKg: 60 }
    ]
  });
  assert.ok(saved);
  assert.equal(saved.volume, 1080);
  assert.equal(Journal.computeVolume(saved.sets), 1080);
  const raw = JSON.parse(mem[TH.KEYS.journal]);
  assert.equal(raw.entries.length, 1);
  assert.equal(raw.entries[0].volume, 1080);
});

test('listEntries and getJournalSnapshot return saved training data', function () {
  reset();
  Journal.saveEntry({
    doneAt: '2026-10-02T12:00:00.000Z',
    sets: [{ exerciseId: 'bench_press', reps: 5, weightKg: 80 }]
  });
  const list = Journal.listEntries();
  assert.equal(list.length, 1);
  assert.equal(list[0].sets[0].exerciseId, 'bench_press');
  const snap = Journal.getJournalSnapshot();
  assert.equal(snap.entries.length, 1);
  assert.deepEqual(snap.personalRecords.bench_press, {
    exerciseId: 'bench_press',
    reps: 5,
    weightKg: 80,
    tonnage: 400,
    doneAt: '2026-10-02T12:00:00.000Z'
  });
});

test('personal records keep the heaviest weight per exercise', function () {
  reset();
  Journal.saveEntry({
    doneAt: '2026-10-03T08:00:00.000Z',
    sets: [{ exerciseId: 'deadlift', reps: 5, weightKg: 100 }]
  });
  Journal.saveEntry({
    doneAt: '2026-10-04T08:00:00.000Z',
    sets: [{ exerciseId: 'deadlift', reps: 3, weightKg: 110 }]
  });
  const pr = Journal.getPersonalRecords().deadlift;
  assert.equal(pr.weightKg, 110);
  assert.equal(pr.reps, 3);
});

test('buildProgressGraph sums volume by calendar day over time', function () {
  reset();
  Journal.saveEntry({
    doneAt: '2026-10-05T09:00:00.000Z',
    sets: [{ exerciseId: 'squat', reps: 10, weightKg: 50 }]
  });
  Journal.saveEntry({
    doneAt: '2026-10-05T18:00:00.000Z',
    sets: [{ exerciseId: 'squat', reps: 5, weightKg: 50 }]
  });
  Journal.saveEntry({
    doneAt: '2026-10-07T09:00:00.000Z',
    sets: [{ exerciseId: 'squat', reps: 8, weightKg: 40 }]
  });
  const graph = Journal.getJournalSnapshot().progressGraph;
  assert.deepEqual(graph, [
    { date: '2026-10-05', volume: 750 },
    { date: '2026-10-07', volume: 320 }
  ]);
});

test('Analyzer.enrichJournalEntry annotates per-exercise tonnage', function () {
  const enriched = Analyzer.enrichJournalEntry({
    sets: [
      { exerciseId: 'squat', reps: 10, weightKg: 50 },
      { exerciseId: 'squat', reps: 5, weightKg: 60 }
    ]
  });
  assert.equal(enriched.volume, 800);
  assert.deepEqual(enriched.bestSetTonnageByExercise, { squat: 500 });
});

test('TH.journalStorage exposes the journal module from core', function () {
  assert.equal(typeof TH.journalStorage.saveEntry, 'function');
  assert.equal(typeof TH.journalStorage.buildProgressGraph, 'function');
});
