'use strict';

// A weekly day never plays the same clip twice: a built-in id resolves to a
// catalog row by its Hebrew name, and that row also joins the pool under its own id.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = function (p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); };

function clipKey(e) {
  const c = TH.findExercise(e);
  return c ? (c.file || c.youtubeId || c.drivePlayId || c.driveId || c.id) : '';
}

test('no weekly day repeats a clip across warm-up and main', function () {
  TH.setCatalog(TH.mergeCatalogs(TH.mergeCatalogs(read('js/catalog.json'), read('videos/drive-catalog.json'), []), read('videos/youtube-catalog.json'), []));
  const repeats = [];
  ['full', 'legs', 'shoulders'].forEach(function (muscle) {
    ['strength', 'hypertrophy', 'endurance'].forEach(function (goal) {
      ['beginner', 'advanced'].forEach(function (lvl) {
        ['none', 'dumbbells'].forEach(function (eq) {
          const pr = TH.generateWorkoutProgram({ age: 31, fitnessLevel: lvl, goals: [goal], availableEquipment: [eq], targetMuscles: muscle === 'full' ? [] : [muscle], injuries: [], previousWorkouts: 8, preferCatalog: true }, 1, 5);
          pr.dailyWorkouts.forEach(function (d) {
            const seen = {};
            TH.toPhasesWorkout(d, {}).phases.forEach(function (ph) {
              if (ph.name === 'Cool-down') return;
              ph.exercises.forEach(function (e) {
                const k = clipKey(e);
                if (!k) return;
                if (seen[k]) repeats.push(seen[k] + ' + ' + e.name);
                seen[k] = e.name;
              });
            });
          });
        });
      });
    });
  });
  TH.setCatalog({});
  assert.deepEqual(repeats, []);
});
