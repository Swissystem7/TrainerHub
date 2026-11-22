const test = require('node:test');
const assert = require('node:assert/strict');
const VolumeLandmarks = require('../js/volume-landmarks.js');
const fs = require('node:fs');
const path = require('node:path');

test('classifyWeeklyVolume low', () => {
  assert.equal(VolumeLandmarks.classifyWeeklyVolume(4), 'low');
});

test('classifyWeeklyVolume effective', () => {
  assert.equal(VolumeLandmarks.classifyWeeklyVolume(10), 'effective');
});

test('classifyWeeklyVolume high_warning', () => {
  assert.equal(VolumeLandmarks.classifyWeeklyVolume(18), 'high_warning');
});

test('buildMuscleVolumeOverview calculation', () => {
  const sessions = [
    {
      phases: [
        {
          exercises: [
            { sets: 4, muscles: ['chest'] },
            { sets: 4, muscles: ['chest'] },
            { sets: 4, muscles: ['chest'] },
            { sets: 5, muscles: ['chest'] } // 17 sets total -> high_warning
          ]
        }
      ]
    }
  ];
  const overview = VolumeLandmarks.buildMuscleVolumeOverview(sessions);
  assert.equal(overview.chest.total, 17);
  assert.equal(overview.chest.classification, 'high_warning');
});

test('journal.html contains volumeLandmarksCard element', () => {
  const htmlPath = path.join(__dirname, '../journal.html');
  const content = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(content.includes('id="volumeLandmarksCard"'));
});
