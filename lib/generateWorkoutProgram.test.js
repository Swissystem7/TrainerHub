const assert = require('node:assert');
const { generateWorkoutProgram } = require('./generateWorkoutProgram.js');

// Normal case
const normalProfile = {
  age: 30,
  gender: 'male',
  fitnessLevel: 'intermediate',
  goals: ['strength'],
  availableEquipment: ['dumbbells'],
  injuries: [],
  previousWorkouts: 10
};
const normalResult = generateWorkoutProgram(normalProfile, 4, 3);
assert.strictEqual(typeof normalResult.programId, 'string');
assert.strictEqual(normalResult.programId.startsWith('prog_'), true);
assert.strictEqual(normalResult.durationWeeks, 4);
assert.strictEqual(normalResult.dailyWorkouts.length, 12);
normalResult.dailyWorkouts.forEach(day => {
  assert.strictEqual(typeof day.day, 'number');
  assert.strictEqual(typeof day.warmUp, 'string');
  assert.strictEqual(typeof day.coolDown, 'string');
  assert.strictEqual(Array.isArray(day.exercises), true);
  assert.strictEqual(day.exercises.length, 5);
  day.exercises.forEach(ex => {
    assert.strictEqual(typeof ex.name, 'string');
    assert.strictEqual(typeof ex.sets, 'number');
    assert.strictEqual(typeof ex.reps, 'string');
    assert.strictEqual(typeof ex.restSeconds, 'number');
    assert.strictEqual(typeof ex.notes, 'string');
  });
});

// Edge case: injuries includes 'all'
const allInjuriesProfile = {
  age: 25,
  gender: 'female',
  fitnessLevel: 'beginner',
  goals: ['weight_loss'],
  availableEquipment: ['none'],
  injuries: ['all'],
  previousWorkouts: 0
};
const allInjuriesResult = generateWorkoutProgram(allInjuriesProfile, 4, 3);
assert.strictEqual(allInjuriesResult.durationWeeks, 0);
assert.strictEqual(allInjuriesResult.dailyWorkouts.length, 0);
assert.strictEqual(typeof allInjuriesResult.programId, 'string');

// Edge case: missing optional fields
const minimalProfile = {};
const minimalResult = generateWorkoutProgram(minimalProfile, undefined, undefined);
assert.strictEqual(minimalResult.durationWeeks, 1);
assert.strictEqual(minimalResult.dailyWorkouts.length, 1);
assert.strictEqual(minimalResult.dailyWorkouts[0].exercises.length, 5);

// Edge case: age clamping (below 10)
const youngProfile = { age: 5, gender: 'male', fitnessLevel: 'beginner', goals: [], availableEquipment: [], injuries: [], previousWorkouts: 0 };
const youngResult = generateWorkoutProgram(youngProfile, 1, 1);
assert.strictEqual(youngResult.dailyWorkouts[0].exercises[0].notes.includes('focus on form'), true);

// Edge case: age clamping (above 120)
const oldProfile = { age: 150, gender: 'female', fitnessLevel: 'advanced', goals: [], availableEquipment: ['none'], injuries: [], previousWorkouts: 100 };
const oldResult = generateWorkoutProgram(oldProfile, 1, 1);
assert.strictEqual(oldResult.dailyWorkouts[0].exercises.length, 4);
assert.strictEqual(oldResult.dailyWorkouts[0].exercises[0].sets, 2);
assert.strictEqual(oldResult.dailyWorkouts[0].exercises[0].notes.includes('low intensity'), true);

// Edge case: invalid gender
const invalidGenderProfile = { age: 30, gender: 'alien', fitnessLevel: 'intermediate', goals: ['general_fitness'], availableEquipment: [], injuries: [], previousWorkouts: 5 };
const invalidGenderResult = generateWorkoutProgram(invalidGenderProfile, 1, 1);
assert.strictEqual(invalidGenderResult.dailyWorkouts.length, 1);

// Edge case: invalid fitness level
const invalidFitnessProfile = { age: 30, gender: 'male', fitnessLevel: 'expert', goals: [], availableEquipment: [], injuries: [], previousWorkouts: 5 };
const invalidFitnessResult = generateWorkoutProgram(invalidFitnessProfile, 1, 1);
assert.strictEqual(invalidFitnessResult.dailyWorkouts[0].exercises[0].sets, 3);

// Edge case: no equipment (equipment = ['none'])
const noEquipmentProfile = { age: 30, gender: 'female', fitnessLevel: 'beginner', goals: [], availableEquipment: ['none'], injuries: [], previousWorkouts: 0 };
const noEquipmentResult = generateWorkoutProgram(noEquipmentProfile, 1, 1);
assert.strictEqual(noEquipmentResult.dailyWorkouts[0].exercises.length, 5);

// Edge case: specific body part injuries
const injuredProfile = { age: 30, gender: 'male', fitnessLevel: 'intermediate', goals: [], availableEquipment: ['dumbbells'], injuries: ['chest', 'shoulders'], previousWorkouts: 10 };
const injuredResult = generateWorkoutProgram(injuredProfile, 1, 1);
injuredResult.dailyWorkouts[0].exercises.forEach(ex => {
  assert.strictEqual(ex.name.includes('bench_press'), false);
  assert.strictEqual(ex.name.includes('overhead_press'), false);
});

// Edge case: programDuration and workoutDaysPerWeek clamping
const clampProfile = { age: 30, gender: 'male', fitnessLevel: 'beginner', goals: [], availableEquipment: [], injuries: [], previousWorkouts: 0 };
const clampResult = generateWorkoutProgram(clampProfile, 0, 0);
assert.strictEqual(clampResult.durationWeeks, 1);
assert.strictEqual(clampResult.dailyWorkouts.length, 1);

const clampResult2 = generateWorkoutProgram(clampProfile, 100, 10);
assert.strictEqual(clampResult2.durationWeeks, 52);
assert.strictEqual(clampResult2.dailyWorkouts.length, 364);

// Edge case: empty goals
const emptyGoalsProfile = { age: 30, gender: 'female', fitnessLevel: 'intermediate', goals: [], availableEquipment: [], injuries: [], previousWorkouts: 5 };
const emptyGoalsResult = generateWorkoutProgram(emptyGoalsProfile, 1, 1);
assert.strictEqual(emptyGoalsResult.dailyWorkouts.length, 1);

// Edge case: new user (previousWorkouts < 5)
const newUserProfile = { age: 25, gender: 'male', fitnessLevel: 'beginner', goals: [], availableEquipment: [], injuries: [], previousWorkouts: 2 };
const newUserResult = generateWorkoutProgram(newUserProfile, 1, 1);
newUserResult.dailyWorkouts[0].exercises.forEach(ex => {
  assert.strictEqual(ex.notes.includes('focus on form'), true);
});

console.log('ok');