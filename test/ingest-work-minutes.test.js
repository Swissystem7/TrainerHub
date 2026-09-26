

const test = require('node:test');
const assert = require('node:assert/strict');
const Ingest = require('../js/ingest.js');

test('parseExerciseToken with time-based exercises', () => {
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק דקה', {}), { 
    name: 'פלאנק', 
    sets: 1, 
    reps: null, 
    duration_seconds: 60, 
    rest_seconds: null, 
    notes: null,
    restOnly: undefined
  });
  
  assert.deepStrictEqual(Ingest.parseExerciseToken('3 דקות ריצה במקום', {}), { 
    name: 'ריצה במקום', 
    sets: 1, 
    reps: null, 
    duration_seconds: 180, 
    rest_seconds: null, 
    notes: null,
    restOnly: undefined
  });
  
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק חצי דקה', {}), { 
    name: 'פלאנק', 
    sets: 1, 
    reps: null, 
    duration_seconds: 30, 
    rest_seconds: null, 
    notes: null,
    restOnly: undefined
  });
  
  assert.deepStrictEqual(Ingest.parseExerciseToken('פלאנק דקה וחצי', {}), { 
    name: 'פלאנק', 
    sets: 1, 
    reps: null, 
    duration_seconds: 90, 
    rest_seconds: null, 
    notes: null,
    restOnly: undefined
  });
});
