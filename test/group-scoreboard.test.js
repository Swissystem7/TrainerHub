const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  recordStationScore,
  rankStationParticipants,
  getStationScores,
  clearStationScores,
  STORAGE_KEY
} = require('../js/group-scoreboard.js');

test('שמירת תוצאת חזרות ב-trainerhub_group_board ללא מידע מזהה (Zero-PII)', () => {
  const store = new Map();
  const mockStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };

  const res = recordStationScore('תחנה 1 — שכיבות סמיכה', 'ברזל 12', 45, 'reps', mockStorage);
  assert.ok(res, 'recordStationScore should return created entry');
  assert.equal(res.stationName, 'תחנה 1 — שכיבות סמיכה');
  assert.equal(res.slotLabel, 'ברזל 12');
  assert.equal(res.scoreValue, 45);
  assert.equal(res.metricType, 'reps');

  const raw = mockStorage.getItem(STORAGE_KEY);
  assert.ok(raw, 'entry must be saved to trainerhub_group_board in storage');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].scoreValue, 45);

  // Test Zero-PII stripping (e.g. phone or email in nickname)
  const resPii = recordStationScore('תחנה 2', 'יוסי 052-1234567 yossi@mail.com', 30, 'reps', mockStorage);
  assert.ok(resPii, 'sanitized score should be recorded');
  assert.doesNotMatch(resPii.slotLabel, /052-1234567/);
  assert.doesNotMatch(resPii.slotLabel, /@/);
  assert.equal(resPii.slotLabel, 'יוסי');

  const retrieved = getStationScores('תחנה 1 — שכיבות סמיכה', mockStorage);
  assert.equal(retrieved.length, 1);
  assert.equal(retrieved[0].slotLabel, 'ברזל 12');

  const cleared = clearStationScores(mockStorage);
  assert.equal(cleared, true);
  assert.equal(getStationScores(null, mockStorage).length, 0);
});

test('דירוג זמן נמוך תחילה עבור מדד זמן (shorter time first)', () => {
  const entries = [
    { slotLabel: 'ברזל 1', scoreValue: 55, metricType: 'time' },
    { slotLabel: 'ברזל 2', scoreValue: 38, metricType: 'time' },
    { slotLabel: 'ברזל 3', scoreValue: 44, metricType: 'time' }
  ];

  const ranked = rankStationParticipants(entries, 'time');
  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].slotLabel, 'ברזל 2');
  assert.equal(ranked[0].scoreValue, 38);
  assert.equal(ranked[0].rank, 1);

  assert.equal(ranked[1].slotLabel, 'ברזל 3');
  assert.equal(ranked[1].scoreValue, 44);
  assert.equal(ranked[1].rank, 2);

  assert.equal(ranked[2].slotLabel, 'ברזל 1');
  assert.equal(ranked[2].scoreValue, 55);
  assert.equal(ranked[2].rank, 3);
});

test('דירוג חזרות גבוה תחילה עבור מדד חזרות (higher reps first)', () => {
  const entries = [
    { slotLabel: 'צוות א', scoreValue: 22, metricType: 'reps' },
    { slotLabel: 'צוות ב', scoreValue: 48, metricType: 'reps' },
    { slotLabel: 'צוות ג', scoreValue: 31, metricType: 'reps' }
  ];

  const ranked = rankStationParticipants(entries, 'reps');
  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].slotLabel, 'צוות ב');
  assert.equal(ranked[0].scoreValue, 48);
  assert.equal(ranked[0].rank, 1);

  assert.equal(ranked[1].slotLabel, 'צוות ג');
  assert.equal(ranked[1].scoreValue, 31);
  assert.equal(ranked[1].rank, 2);

  assert.equal(ranked[2].slotLabel, 'צוות א');
  assert.equal(ranked[2].scoreValue, 22);
  assert.equal(ranked[2].rank, 3);
});

test('עמידות לשגיאת storage וקלט null', () => {
  // Null and invalid inputs to recordStationScore
  assert.equal(recordStationScore(null, null, null, null, null), null);
  assert.equal(recordStationScore('תחנה 1', null, 20, 'reps', null), null);
  assert.equal(recordStationScore('תחנה 1', 'ברזל 1', null, 'reps', null), null);
  assert.equal(recordStationScore('תחנה 1', 'ברזל 1', 'not-a-number', 'reps', null), null);
  assert.equal(recordStationScore('תחנה 1', 'ברזל 1', -5, 'reps', null), null);

  // Storage throwing errors
  const failingStorage = {
    getItem: () => {
      throw new Error('StorageQuotaExceeded');
    },
    setItem: () => {
      throw new Error('StorageQuotaExceeded');
    }
  };
  assert.doesNotThrow(() => {
    const res = recordStationScore('תחנה 1', 'ברזל 1', 25, 'reps', failingStorage);
    assert.equal(res, null);
  });

  // rankStationParticipants edge cases
  assert.deepEqual(rankStationParticipants(null, 'reps'), []);
  assert.deepEqual(rankStationParticipants(undefined, 'time'), []);
  assert.deepEqual(rankStationParticipants('not an array', 'reps'), []);
  const safeRanked = rankStationParticipants(
    [null, undefined, { scoreValue: 15 }, { scoreValue: null }, { scoreValue: 'invalid' }],
    'reps'
  );
  assert.equal(safeRanked.length, 1);
  assert.equal(safeRanked[0].scoreValue, 15);
  assert.equal(safeRanked[0].rank, 1);
});

test('קיום הפאנל והתוויות ב-reserves.html', () => {
  const htmlPath = path.join(__dirname, '..', 'reserves.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Panel container existence
  assert.ok(html.includes('id="groupScoreboardPanel"'), 'reserves.html must include id="groupScoreboardPanel"');

  // Input fields existence
  assert.ok(html.includes('id="groupStationName"'), 'reserves.html must include input groupStationName');
  assert.ok(html.includes('id="groupSlotLabel"'), 'reserves.html must include input groupSlotLabel');
  assert.ok(html.includes('id="groupScoreValue"'), 'reserves.html must include input groupScoreValue');
  assert.ok(html.includes('id="groupMetricType"'), 'reserves.html must include select groupMetricType');

  // Explicit label for="..." for every input/select
  assert.match(html, /<label\b[^>]*\bfor=["']groupStationName["']/);
  assert.match(html, /<label\b[^>]*\bfor=["']groupSlotLabel["']/);
  assert.match(html, /<label\b[^>]*\bfor=["']groupScoreValue["']/);
  assert.match(html, /<label\b[^>]*\bfor=["']groupMetricType["']/);

  // Script tags in reserves.html
  assert.ok(html.includes('src="./js/group-scoreboard.js"'), 'reserves.html must load js/group-scoreboard.js');
  assert.ok(
    html.includes('src="./frontend/netanya-opening.js"'),
    'reserves.html must load frontend/netanya-opening.js'
  );

  // Netanya opening module connects scoreboard panel creation
  const netanya = require('../frontend/netanya-opening.js');
  assert.equal(typeof netanya.renderGroupScoreboardPanel, 'function');
});
