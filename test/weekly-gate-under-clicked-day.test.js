'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'weekly.html'), 'utf8');
const fn = page.slice(page.indexOf('function copyDayTraineeLink('), page.indexOf('function printDayWorkout('));

test('weekly.html uses standard th-nav and th-banner shared classes', function () {
  assert.match(page, /<nav class="th-nav" aria-label="ניווט ראשי">/);
  assert.match(page, /<div class="th-banner">/);
});

test('every day section in weekly builder carries its own gate host', function () {
  assert.match(page, /<section class="day">/);
  assert.match(page, /<div class="th-gate-host"><\/div><\/section>/);
});

test('the weekly share gate lands under the day whose button was clicked, not the whole result list', function () {
  assert.match(page, /onclick="copyDayTraineeLink\('\+i\+', this\)"/, 'the click handler passes the clicked button');
  assert.match(fn, /function copyDayTraineeLink\(dayIndex, sourceBtn\)/);
  assert.match(fn, /sourceBtn\.closest\('\.day'\)/, 'the host is resolved from the clicked day');
  assert.match(fn, /day\.querySelector\('\.th-gate-host'\)/);
  assert.doesNotMatch(fn, /\$\('result'\)\.insertAdjacentHTML\('afterbegin', TH\.gateMarkup/, 'never dumps gate at the top of result');
});

test('an older gate under another day is removed before the new one is shown in weekly builder', function () {
  assert.match(fn, /\$\('result'\)\.querySelectorAll\('\.th-gate'\)/);
  assert.match(fn, /host\.insertAdjacentHTML\('beforeend', TH\.gateMarkup\('share'\)\)/);
});
