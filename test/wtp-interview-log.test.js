'use strict';
// Ported from ext/grok-bot-20260906-213127 (Grok bot), rewritten: Hebrew,
// no access code in the served file, and the go rule next to the kill rule.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'docs', 'WTP_INTERVIEW_LOG.md');

test('the interview log has 10 empty rows to fill, one per trainer', function () {
  assert.ok(fs.existsSync(file), 'docs/WTP_INTERVIEW_LOG.md is missing');
  const md = fs.readFileSync(file, 'utf8');
  for (let i = 1; i <= 10; i++) {
    assert.match(md, new RegExp('^\\| ' + i + ' \\|', 'm'), 'row ' + i);
  }
});

test('the log states the same kill rule as MONETIZATION.md and the go rule', function () {
  const md = fs.readFileSync(file, 'utf8');
  const money = fs.readFileSync(path.join(__dirname, '..', 'MONETIZATION.md'), 'utf8');
  assert.match(money, /≥6/);
  assert.match(md, /6 מתוך 10/);
  assert.match(md, /3 מתוך 10/);
  assert.match(md, /לא אומת/);
  assert.doesNotMatch(md, /\d+\s*נרשמים/);
});
