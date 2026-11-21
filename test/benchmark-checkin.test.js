const test = require('node:test');
const assert = require('node:assert');
const BC = require('../js/benchmark-checkin.js');
const fs = require('node:fs');
const path = require('node:path');

test('1. compareBiWeeklyBenchmark detects improvement correctly', () => {
  const res = BC.compareBiWeeklyBenchmark({ score: 70 }, { score: 85 });
  assert.strictEqual(res.trend, 'improving');
  assert.strictEqual(res.scoreDiff, 15);
  assert.ok(res.message.includes('שיפור'));
});

test('2. compareBiWeeklyBenchmark detects steady level', () => {
  const res = BC.compareBiWeeklyBenchmark({ score: 80 }, { score: 80 });
  assert.strictEqual(res.trend, 'steady');
  assert.strictEqual(res.scoreDiff, 0);
});

test('3. compareBiWeeklyBenchmark detects decrease / needs adjustment', () => {
  const res = BC.compareBiWeeklyBenchmark({ score: 90 }, { score: 75 });
  assert.strictEqual(res.trend, 'needs_adjustment');
  assert.strictEqual(res.scoreDiff, -15);
  assert.ok(res.message.includes('ירידה'));
});

test('4. saveBenchmarkEntry handles storage failure gracefully with try/catch', () => {
  const faultyStorage = {
    getItem: () => { throw new Error('fail read'); },
    setItem: () => { throw new Error('fail write'); }
  };
  const ok = BC.saveBenchmarkEntry({ score: 100 }, faultyStorage);
  assert.strictEqual(ok, false);
});

test('5. reserves.html and journal.html contain biWeeklyBenchmarkPanel element and script tag', () => {
  const reservesHtml = fs.readFileSync(path.join(__dirname, '..', 'reserves.html'), 'utf8');
  const journalHtml = fs.readFileSync(path.join(__dirname, '..', 'journal.html'), 'utf8');
  assert.ok(reservesHtml.includes('id="biWeeklyBenchmarkPanel"'), 'reserves.html has panel');
  assert.ok(journalHtml.includes('id="biWeeklyBenchmarkPanel"'), 'journal.html has panel');
  assert.ok(reservesHtml.includes('js/benchmark-checkin.js'), 'reserves.html has script');
  assert.ok(journalHtml.includes('js/benchmark-checkin.js'), 'journal.html has script');
});
