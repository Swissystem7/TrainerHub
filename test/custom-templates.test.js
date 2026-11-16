const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { saveCustomTemplate, listCustomTemplates, deleteCustomTemplate } = require('../js/custom-templates.js');

function createMemoryStorage(initial) {
  const store = initial ? Object.assign({}, initial) : {};
  return {
    getItem: (key) => (Object.hasOwn(store, key) ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    _raw: store
  };
}

test('שמירה ושליפת תבנית', () => {
  const storage = createMemoryStorage();
  const workout = {
    title: 'אימון פלג גוף עליון',
    phases: [
      {
        name: 'Main',
        exercises: [
          { name: 'שכיבות סמיכה', sets: 3, reps: 12 },
          { name: 'מתח', sets: 3, reps: 6 }
        ]
      }
    ]
  };

  const saved = saveCustomTemplate('תבנית כוח עליון', workout, storage);
  assert.ok(saved);
  assert.equal(saved.name, 'תבנית כוח עליון');
  assert.ok(saved.id.startsWith('tpl_'));
  assert.deepEqual(saved.workout.phases, workout.phases);

  const list = listCustomTemplates(storage);
  assert.equal(list.length, 1);
  assert.equal(list[0].id, saved.id);
  assert.equal(list[0].name, 'תבנית כוח עליון');
  assert.equal(list[0].workout.title, 'אימון פלג גוף עליון');
});

test('דחיית שם ריק/null', () => {
  const storage = createMemoryStorage();
  const workout = { title: 'אימון', exercises: [] };

  assert.equal(saveCustomTemplate('', workout, storage), null);
  assert.equal(saveCustomTemplate('   ', workout, storage), null);
  assert.equal(saveCustomTemplate(null, workout, storage), null);
  assert.equal(saveCustomTemplate(undefined, workout, storage), null);
  assert.equal(saveCustomTemplate(12345, workout, storage), null);

  const list = listCustomTemplates(storage);
  assert.equal(list.length, 0);
});

test('מחיקת תבנית לפי מזהה', () => {
  const storage = createMemoryStorage();
  const t1 = saveCustomTemplate('תבנית ראשונה', { title: '1' }, storage);
  const t2 = saveCustomTemplate('תבנית שנייה', { title: '2' }, storage);

  assert.equal(listCustomTemplates(storage).length, 2);

  const deleted = deleteCustomTemplate(t1.id, storage);
  assert.equal(deleted, true);

  const after = listCustomTemplates(storage);
  assert.equal(after.length, 1);
  assert.equal(after[0].id, t2.id);

  const deletedAgain = deleteCustomTemplate(t1.id, storage);
  assert.equal(deletedAgain, false);

  const deletedMissing = deleteCustomTemplate('missing_id', storage);
  assert.equal(deletedMissing, false);
});

test('עמידות לשגיאות storage', () => {
  const quotaErrorStore = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    }
  };
  const saveResult = saveCustomTemplate('תבנית חריגה', { title: 'חריגה' }, quotaErrorStore);
  assert.equal(saveResult, null);

  const readErrorStore = {
    getItem: () => {
      throw new Error('SecurityError: localStorage blocked');
    },
    setItem: () => {}
  };
  const listResult = listCustomTemplates(readErrorStore);
  assert.deepEqual(listResult, []);

  const delResult = deleteCustomTemplate('any_id', readErrorStore);
  assert.equal(delResult, false);

  const corruptedStore = {
    getItem: () => '{"invalid json syntax',
    setItem: () => {}
  };
  const listCorrupted = listCustomTemplates(corruptedStore);
  assert.deepEqual(listCorrupted, []);
});

test('קיום הממשק ב-index.html וב-exercises.html', () => {
  const root = path.join(__dirname, '..');
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const exercisesHtml = fs.readFileSync(path.join(root, 'exercises.html'), 'utf8');

  assert.match(indexHtml, /id=["']customTemplatesPanel["']/);
  assert.match(indexHtml, /id=["']saveTemplateBtn["']/);
  assert.match(indexHtml, /src=["']\.\/js\/custom-templates\.js["']/);
  assert.match(indexHtml, /שמור כתבנית אישית/);

  assert.match(exercisesHtml, /id=["']saveSelectionAsTemplateBtn["']/);
  assert.match(exercisesHtml, /src=["']\.\/js\/custom-templates\.js["']/);
  assert.match(exercisesHtml, /שמור כתבנית אישית/);
});
