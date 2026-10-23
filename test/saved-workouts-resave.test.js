const test = require('node:test');
const assert = require('node:assert/strict');
const { WorkoutLibrary } = require('../frontend/saved-workouts.js');

function memoryStore(initial) {
  let value = initial || [];
  return {
    get: () => structuredClone(value),
    set: (k, v) => { value = structuredClone(v); return true; },
    read: () => value
  };
}

const workout = { title: 'אימון בודד', phases: [{ name: 'Main', exercises: [{ name: 'סקוואט', sets: 3, reps: 10 }] }] };

test('pressing «שמור» twice on the same workout keeps one copy', () => {
  const store = memoryStore([{ title: 'ישן', phases: [{ name: 'Main', exercises: [] }], savedAt: '1.1.2026, 10:00:00' }]);
  WorkoutLibrary.save(store, 'k', [workout]);
  // A later save gets a different savedAt; it used to make the copy look new.
  store.set('k', store.read().map(w => w.title === workout.title ? Object.assign({}, w, { savedAt: '2.1.2026, 09:00:00' }) : w));
  WorkoutLibrary.save(store, 'k', [workout]);
  const titles = store.read().map(w => w.title);
  assert.deepEqual(titles, ['אימון בודד', 'ישן']);
  assert.notEqual(store.read()[0].savedAt, '2.1.2026, 09:00:00');
});

test('saving a workout loaded from the history (it carries the old savedAt) keeps one copy', () => {
  const loaded = Object.assign({}, workout, { savedAt: '2.1.2026, 09:00:00' });
  const store = memoryStore([loaded]);
  WorkoutLibrary.save(store, 'k', [loaded]);
  assert.equal(store.read().length, 1);
});

test('two different workouts with the same title are both kept', () => {
  const store = memoryStore([Object.assign({}, workout, { savedAt: '2.1.2026, 09:00:00' })]);
  const other = { title: workout.title, phases: [{ name: 'Main', exercises: [{ name: 'סקוואט', sets: 4, reps: 8 }] }] };
  WorkoutLibrary.save(store, 'k', [other]);
  assert.equal(store.read().length, 2);
});
