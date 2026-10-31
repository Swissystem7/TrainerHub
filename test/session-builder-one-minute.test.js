'use strict';

// One minute is «דקה», not «1 דקות»: «אימון 1 דקה» was titled
// «אימון גוף מלא · 1 דקות» and its type line said «גוף מלא · 1 דקות».

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');

function entry(id, he, muscles) {
  return { id: id, he: he, muscles: muscles, equipment: ['none'], level: 'beginner', file: he + '.mp4', source: 'local' };
}

const CATALOG = {
  warmup: entry('warmup', 'חימום', ['core']),
  squat: entry('squat', 'סקוואט', ['legs']),
  pushup: entry('pushup', 'שכיבות סמיכה', ['chest'])
};

test('a 1-minute session says «דקה» in its title and type line', () => {
  const result = Engine.buildSession('אימון 1 דקה', CATALOG);
  assert.equal(result.workout.title, 'אימון גוף מלא · דקה');
  assert.equal(result.explanation.type, 'גוף מלא · דקה');
});

test('longer sessions keep «N דקות»', () => {
  const result = Engine.buildSession('אימון 2 דקות', CATALOG);
  assert.equal(result.workout.title, 'אימון גוף מלא · 2 דקות');
  assert.equal(result.explanation.type, 'גוף מלא · 2 דקות');
});
