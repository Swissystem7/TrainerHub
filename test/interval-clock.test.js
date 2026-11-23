const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createIntervalClock, advanceIntervalClock, formatIntervalClock } = require('../js/interval-clock.js');
const root = path.join(__dirname, '..');

test('Tabata starts at 20 seconds of work and alternates work and rest for 8 rounds', () => {
  const clock = createIntervalClock('tabata');
  assert.equal(clock.mode, 'tabata');
  assert.equal(clock.phase, 'work');
  assert.equal(clock.round, 1);
  assert.equal(clock.remainingSeconds, 20);
  assert.equal(clock.config.workSeconds, 20);
  assert.equal(clock.config.restSeconds, 10);
  assert.equal(clock.config.rounds, 8);
  assert.equal(clock.totalSeconds, 240);

  let state = advanceIntervalClock(clock, 19);
  assert.equal(state.phase, 'work');
  assert.equal(state.remainingSeconds, 1);
  state = advanceIntervalClock(state, 1);
  assert.equal(state.phase, 'rest');
  assert.equal(state.round, 1);
  assert.equal(state.remainingSeconds, 10);
  state = advanceIntervalClock(state, 9);
  assert.equal(state.phase, 'rest');
  assert.equal(state.remainingSeconds, 1);
  state = advanceIntervalClock(state, 1);
  assert.equal(state.phase, 'work');
  assert.equal(state.round, 2);
  assert.equal(state.remainingSeconds, 20);

  const done = advanceIntervalClock(clock, 240);
  assert.equal(done.phase, 'finished');
  assert.equal(done.remainingSeconds, 0);
  assert.equal(clock.phase, 'work');
  assert.equal(clock.elapsedSeconds, 0);
});

test('EMOM repeats a new 60-second work minute each round', () => {
  const clock = createIntervalClock('emom');
  assert.equal(clock.phase, 'work');
  assert.equal(clock.round, 1);
  assert.equal(clock.remainingSeconds, 60);
  assert.equal(clock.totalSeconds, 600);
  assert.match(formatIntervalClock(clock), /EMOM/);

  assert.equal(advanceIntervalClock(clock, 59).remainingSeconds, 1);
  const second = advanceIntervalClock(clock, 60);
  assert.equal(second.phase, 'work');
  assert.equal(second.round, 2);
  assert.equal(second.remainingSeconds, 60);
  const half = advanceIntervalClock(clock, 90);
  assert.equal(half.round, 2);
  assert.equal(half.remainingSeconds, 30);
  const done = advanceIntervalClock(clock, 600);
  assert.equal(done.phase, 'finished');
  assert.equal(done.remainingSeconds, 0);
});

test('AMRAP finishes exactly when the configured time runs out', () => {
  const clock = createIntervalClock('amrap', { durationSeconds: 120, roundSeconds: 30 });
  assert.equal(clock.totalSeconds, 120);
  assert.equal(clock.phase, 'work');
  assert.equal(clock.round, 1);
  assert.equal(clock.remainingSeconds, 30);

  const nextRound = advanceIntervalClock(clock, 31);
  assert.equal(nextRound.phase, 'work');
  assert.equal(nextRound.round, 2);
  assert.equal(nextRound.remainingSeconds, 29);
  const almost = advanceIntervalClock(clock, 119);
  assert.equal(almost.phase, 'work');
  assert.equal(almost.remainingSeconds, 1);
  const done = advanceIntervalClock(clock, 120);
  assert.equal(done.phase, 'finished');
  assert.equal(done.remainingSeconds, 0);
  assert.equal(advanceIntervalClock(done, 5).phase, 'finished');
});

test('an invalid or missing mode produces a safe finished clock instead of throwing', () => {
  for (const mode of [null, undefined, 'crossfit', 7, {}]) {
    const clock = createIntervalClock(mode);
    assert.equal(clock.mode, 'unknown');
    assert.equal(clock.phase, 'finished');
    assert.equal(clock.remainingSeconds, 0);
    assert.equal(advanceIntervalClock(clock, 60).phase, 'finished');
  }
  assert.equal(advanceIntervalClock(null, 5).phase, 'finished');
  assert.equal(formatIntervalClock(null), 'בחרו סוג שעון מרווחים');
});

test('both the live workout and reserves pages expose a labelled interval clock panel wired to the module', () => {
  for (const file of ['frontend/workout-mode.html', 'reserves.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /id="intervalClockPanel"/, file);
    assert.match(html, /<label for="intervalModeSelect">/, file);
    assert.match(html, /<select id="intervalModeSelect"/, file);
    assert.match(html, /id="intervalClockDisplay"/, file);
    assert.match(html, /<option value="emom"/, file);
    assert.match(html, /<option value="tabata"/, file);
    assert.match(html, /<option value="amrap"/, file);
    assert.match(html, /THIntervalClock\.createIntervalClock\(/, file);
    assert.match(html, /THIntervalClock\.advanceIntervalClock\(/, file);
    assert.match(html, /intervalClockDisplay[^;]{0,120}\.textContent =/, file);
  }
});
