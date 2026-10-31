'use strict';

// Regression: a prompt naming two muscles was titled after the first one only
// («אימון רגליים וגב» → «אימון רגליים»), because the title used req.focus.

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');
const TH = require('../js/core.js');
const CATALOG = require('../js/catalog.json');

function title(text) {
  TH.setCatalog(CATALOG);
  return Engine.buildSession(text, CATALOG).workout.title;
}

test('two named muscles both appear in the title, in the order named', function () {
  assert.equal(title('אימון רגליים וגב'), 'אימון רגליים וגב');
  assert.equal(title('אימון חזה וכתפיים 30 דקות'), 'אימון חזה וכתפיים · 30 דקות');
  assert.equal(title('אימון חזה ותלת ראשי'), 'אימון חזה ותלת־ראשי');
});

test('biceps and triceps together read «ידיים»', function () {
  assert.equal(title('אימון ידיים ובטן'), 'אימון ידיים וליבה');
  assert.equal(title('אימון ידיים'), 'אימון ידיים');
});

test('one muscle and the body-part groups keep their label', function () {
  assert.equal(title('אימון רגליים'), 'אימון רגליים');
  assert.equal(title('אימון פלג גוף עליון'), 'אימון פלג גוף עליון');
  assert.equal(title('אימון גוף מלא'), 'אימון גוף מלא');
});
