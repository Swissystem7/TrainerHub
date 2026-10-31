const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
B.setData(
  JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(root, B.TEAM_PATH), 'utf8'))
);

// The cool-down passed the stretch's timing as the default note, but every
// stretch has notes of its own, so «15 שניות בכל רגל ולחילופין 3 פעמים» never
// reached the card and a per-side stretch read as one hold for both legs.
test('cool-down stretch cards carry the timing and the cue', () => {
  const ex = B.sessionWorkout('opening-1', {}).phases[2].exercises[0];
  assert.strictEqual(ex.name, 'תאומים – שריר שוק אחוריים');
  assert.match(ex.notes, /^15 שניות בכל רגל ולחילופין 3 פעמים · /);
  assert.match(ex.notes, /כף רגל אחורי מקבילה/);
});

test('every cool-down card names its timing', () => {
  const timings = {};
  B.drills({ category: 'flexibility' }).forEach((d) => { timings[d.he] = d.timing; });
  const ex = B.sessionWorkout('opening-1', {}).phases[2].exercises;
  assert.ok(ex.length >= 3);
  ex.forEach((e) => {
    assert.ok(timings[e.name], e.name);
    assert.ok(e.notes.indexOf(timings[e.name]) === 0, e.name + ': ' + e.notes);
  });
});
