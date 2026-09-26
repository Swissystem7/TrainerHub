

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseExerciseToken } = require('../js/ingest.js');

test('parseExerciseToken handles minute-based exercise durations correctly', () => {
  assert.deepStrictEqual(parseExerciseToken('פלאנק דקה', {}), { 
    name: 'פלאנק', 
    sets: 1, 
    reps: null, 
    duration_seconds: 60, 
    rest_seconds: null, 
    notes: null 
  });
  
  assert.deepStrictEqual(parseExerciseToken('3 דקות ריצה במקום', {}), { 
    name: 'ריצה במקום', 
    sets: 1, 
    reps: null, 
    duration_seconds: 180, 
    rest_seconds: null, 
    notes: null 
  });
  
  assert.deepStrictEqual(parseExerciseToken('פלאנק חצי דקה', {}), { 
    name: 'פלאנק', 
    sets: 1, 
    reps: null, 
    duration_seconds: 30, 
    rest_seconds: null, 
    notes: null 
  });
  
  assert.deepStrictEqual(parseExerciseToken('פלאנק דקה וחצי', {}), { 
    name: 'פלאנק', 
    sets: 1, 
    reps: null, 
    duration_seconds: 90, 
    rest_seconds: null, 
    notes: null 
  });
});
