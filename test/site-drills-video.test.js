'use strict';

// Every drill the site-scan builder (js/site-plan.js) can put in a workout opens
// a video in workout mode, except drills the catalog has no clip for yet.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const SP = require('../js/site-plan.js');

const root = path.join(__dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
TH.setCatalog(TH.mergeCatalogs(TH.mergeCatalogs(read('js/catalog.json'), read('videos/drive-catalog.json'), []), read('videos/youtube-catalog.json'), []));

// No clip of the same movement in the catalog yet (reported, not faked).
const NO_CLIP = new Set([
  'ריצה צידית.', 'מקרבי ירך ישיבת כף אל כף (מעוין)', 'מקרבי ירך בשכיבת פרקדן (על הגב)',
  'שכיבת פרקדן ומשיכת צוואר לחזה.', 'מתיחת חזה בפתח', 'מתיחת ירך על מדרגה', 'מתיחה עם מגבת',
  'ריצות עלייה בשיפוע', 'כפיפת מרפקים בזוגות', "חלק א' – מרוץ שליחים", 'תופסת'
]);

const F = ['stairs', 'bench', 'wall', 'railing', 'pole', 'slope', 'grass', 'court', 'playground'];

function allNames() {
  const names = new Map();
  for (let m = 0; m < 1 << F.length; m++) {
    const features = F.filter((_, j) => m & (1 << j));
    [[], ['slippery'], ['cars', 'dark']].forEach((hazards) => {
      [1, 4, 12, 40].forEach((group) => {
        ['summer', 'winter'].forEach((season) => {
          const r = SP.build({ width: 'medium', surface: [], features, hazards, shade: false, source: 'manual', confidence: {} }, { group, season });
          r.workout.phases.forEach((p) => p.exercises.forEach((x) => names.set((x.id || '') + '|' + x.name, x)));
        });
      });
    });
  }
  return [...names.values()];
}

test('site-scan drills resolve to a playable clip', () => {
  const list = allNames();
  assert.ok(list.length >= 25, 'distinct drills: ' + list.length);
  list.forEach((x) => {
    if (NO_CLIP.has(x.name)) return;
    const hit = TH.findExercise(x);
    assert.ok(hit && TH.isPlayable(hit), x.name);
  });
});

test('site drills get the clip of the same movement', () => {
  const want = {
    'סקווט': 'bodyweight_squat', 'לאנג׳': 'lunges', 'ג׳אמפינג ג׳ק': 'yt_jumping_jacks',
    'ישיבה על הקיר': 'wall_sit', 'שכיבות סמיכה בשעינה על קיר': 'wall_push_up',
    'שכיבות סמיכה לאחור על ספסל (דיפס)': 'bench_dips', 'תלייה למתיחת גב': 'dead_hang',
    'ברכיים לחזה': 'tuck_jump', 'עליות בטן בזוגות': 'בטן_זוגות'
  };
  Object.keys(want).forEach((name) => {
    const hit = TH.findExercise({ name });
    assert.equal(hit && hit.id, want[name], name);
  });
});
