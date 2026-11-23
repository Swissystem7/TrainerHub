const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { computeSetTimeUnderTension, summarizeSessionTut, DEFAULT_TEMPO } = require('../js/tempo-volume.js');
const Analyzer = require('../js/analyzer.js');

test('חישוב 10 חזרות בקצב 3-1-1', () => {
  // 10 reps with 3-1-1 tempo (3s eccentric + 1s pause + 1s concentric = 5s per rep -> 50s total)
  const tutString = computeSetTimeUnderTension(10, '3-1-1');
  assert.equal(tutString, 50);

  const tutObj = computeSetTimeUnderTension(10, { eccentric: 3, pause: 1, concentric: 1 });
  assert.equal(tutObj, 50);

  const tutTempoKey = computeSetTimeUnderTension(10, { tempo: '3-1-1' });
  assert.equal(tutTempoKey, 50);

  // Single rep and custom reps
  assert.equal(computeSetTimeUnderTension(1, '3-1-1'), 5);
  assert.equal(computeSetTimeUnderTension(8, '3-1-1'), 40);
});

test('קצב ברירת מחדל כשלא צוין', () => {
  // When tempo is not specified, default to 3-1-1 (5 seconds per rep)
  assert.equal(computeSetTimeUnderTension(10), 50);
  assert.equal(computeSetTimeUnderTension(10, null), 50);
  assert.equal(computeSetTimeUnderTension(10, undefined), 50);
  assert.equal(computeSetTimeUnderTension(10, {}), 50);
  assert.equal(computeSetTimeUnderTension(6), 30);

  assert.equal(DEFAULT_TEMPO.eccentric, 3);
  assert.equal(DEFAULT_TEMPO.pause, 1);
  assert.equal(DEFAULT_TEMPO.concentric, 1);
});

test('סיכום סטים מרובים', () => {
  // Multiple sets summing up to 120 seconds (2 minutes)
  const sets = [
    { reps: 10, tempo: '3-1-1' }, // 50s
    { reps: 10, tempo: '3-1-1' }, // 50s
    { reps: 4, tempo: '3-1-1' } // 20s
  ];
  assert.equal(summarizeSessionTut(sets), 2);

  // Multi-set structure with sets count and duration hold (150s + 30s = 180s = 3 minutes)
  const setsWithSets = [
    { sets: 3, reps: 10, tempo: '3-1-1' }, // 3 * 50 = 150s
    { duration_seconds: 30 } // 30s
  ];
  assert.equal(summarizeSessionTut(setsWithSets), 3);

  // Workout object structure with phases
  const workout = {
    phases: [
      {
        name: 'Main',
        exercises: [
          { sets: 2, reps: 10, tempo: '3-1-1' }, // 100s
          { duration_seconds: 20 } // 20s
        ]
      }
    ]
  };
  assert.equal(summarizeSessionTut(workout), 2);
});

test('קלט שלילי/null', () => {
  // Non-positive or non-numeric reps return 0
  assert.equal(computeSetTimeUnderTension(-10, '3-1-1'), 0);
  assert.equal(computeSetTimeUnderTension(0, '3-1-1'), 0);
  assert.equal(computeSetTimeUnderTension(null, '3-1-1'), 0);
  assert.equal(computeSetTimeUnderTension(undefined, '3-1-1'), 0);
  assert.equal(computeSetTimeUnderTension('invalid', '3-1-1'), 0);

  // Negative tempo properties handled safely (clamped to 0)
  assert.equal(computeSetTimeUnderTension(10, { eccentric: -3, pause: -1, concentric: -1 }), 0);

  // Null, empty or invalid setsList returns 0
  assert.equal(summarizeSessionTut(null), 0);
  assert.equal(summarizeSessionTut([]), 0);
  assert.equal(summarizeSessionTut([{ reps: -5, tempo: '3-1-1' }]), 0);
  assert.equal(summarizeSessionTut([null, undefined, {}]), 0);
});

test('אינטגרציה עם analyzer וקיום התצוגה ב-frontend/workout-mode.html', () => {
  // Integration with analyzer: totalTutSeconds field exists and is accurate
  const workout = {
    title: 'אימון מבחן TUT',
    phases: [
      {
        name: 'Main',
        exercises: [
          { name: 'שכיבות סמיכה', sets: 2, reps: 10, tempo: '3-1-1' } // 2 * 50 = 100s
        ]
      }
    ]
  };
  const session = Analyzer.analyzeSession(workout);
  assert.equal(typeof session.totalTutSeconds, 'number');
  assert.equal(session.totalTutSeconds, 100);

  // Presence in frontend/workout-mode.html
  const htmlPath = path.join(__dirname, '..', 'frontend', 'workout-mode.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(html, /id="liveTutReadout"/);
  assert.match(html, /זמן עבודה מבוקר \(TUT\)/);
  assert.match(html, /js\/tempo-volume\.js/);
  assert.match(html, /liveTutReadout/);
  assert.match(html, /\.textContent\s*=/);
});
