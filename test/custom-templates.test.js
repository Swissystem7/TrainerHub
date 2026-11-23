const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readIndex } = require('./helpers/page-source');
const {
  STORAGE_KEY,
  saveCustomTemplate,
  listCustomTemplates,
  deleteCustomTemplate
} = require('../js/custom-templates.js');

function createMemoryStorage(initial) {
  const store = initial ? Object.assign({}, initial) : {};
  return {
    getItem: (key) => (Object.hasOwn(store, key) ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    _raw: store
  };
}

test('שמירה ושליפת תבנית', () => {
  assert.equal(STORAGE_KEY, 'trainerhub_custom_templates');
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

  // שמירה ללא אובייקט workout - יצירת ברירת מחדל
  const defaultSaved = saveCustomTemplate('תבנית ברירת מחדל', null, storage);
  assert.ok(defaultSaved);
  assert.equal(defaultSaved.workout.title, 'תבנית ברירת מחדל');
  assert.deepEqual(defaultSaved.workout.exercises, []);

  // עדכון תבנית קיימת כאשר workoutCopy מכיל id
  const updateWorkoutWithCreatedAt = {
    id: saved.id,
    title: 'אימון פלג גוף עליון מעודכן',
    phases: []
  };
  const updated = saveCustomTemplate('תבנית כוח מעודכנת', updateWorkoutWithCreatedAt, storage);
  assert.equal(updated.id, saved.id);
  assert.equal(updated.name, 'תבנית כוח מעודכנת');
  assert.equal(updated.createdAt, saved.createdAt);

  // עדכון תבנית שאין לה createdAt מקורי
  const noCreatedStore = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify([{ id: 'tpl_old', name: 'ישנה' }])
  });
  const updatedOld = saveCustomTemplate('ישנה מחודשת', { id: 'tpl_old', title: 'ישנה' }, noCreatedStore);
  assert.equal(updatedOld.id, 'tpl_old');
  assert.ok(updatedOld.createdAt);

  // שימוש ב-localStorage גלובלי כשלא מועבר storage
  const globalStore = createMemoryStorage();
  globalThis.localStorage = globalStore;
  try {
    const globSaved = saveCustomTemplate('תבנית גלובלית', { title: 'גלובלי' });
    assert.ok(globSaved);
    const globList = listCustomTemplates();
    assert.equal(globList.length, 1);
    assert.equal(globList[0].name, 'תבנית גלובלית');
  } finally {
    delete globalThis.localStorage;
  }

  // שמירה עם מזהה שלא קיים ברשימה הקיימת
  const newWithId = saveCustomTemplate('תבנית עם מזהה חדש', { id: 'tpl_nonexistent', title: 'חדש' }, storage);
  assert.ok(newWithId);
  assert.notEqual(newWithId.id, 'tpl_nonexistent');

  // שליפה כאשר storage מחזיר אובייקט שאינו מערך ואינו string
  const objStore = {
    getItem: () => ({ not: 'array' })
  };
  assert.deepEqual(listCustomTemplates(objStore), []);

  // שליפה כאשר storage מחזיר מערך ישירות (לא string)
  const preParsedStore = {
    getItem: () => [{ id: 'tpl_direct', name: 'מערך ישיר' }]
  };
  const preParsedList = listCustomTemplates(preParsedStore);
  assert.equal(preParsedList.length, 1);
  assert.equal(preParsedList[0].name, 'מערך ישיר');

  // טעינת מודול בסביבת דפדפן מדומית עם window (ללא module.exports)
  const fakeWindow = {};
  const code = fs.readFileSync(path.join(__dirname, '../js/custom-templates.js'), 'utf8');
  new Function('window', code)(fakeWindow);
  assert.ok(fakeWindow.CustomTemplates);
  assert.equal(fakeWindow.STORAGE_KEY, 'trainerhub_custom_templates');
  assert.equal(typeof fakeWindow.saveCustomTemplate, 'function');
});

test('דחיית שם ריק/null', () => {
  const storage = createMemoryStorage();
  const workout = { title: 'אימון', exercises: [] };

  assert.equal(saveCustomTemplate('', workout, storage), null);
  assert.equal(saveCustomTemplate('   ', workout, storage), null);
  assert.equal(saveCustomTemplate(null, workout, storage), null);
  assert.equal(saveCustomTemplate(undefined, workout, storage), null);
  assert.equal(saveCustomTemplate(12345, workout, storage), null);
  assert.equal(saveCustomTemplate(false, workout, storage), null);
  assert.equal(saveCustomTemplate({}, workout, storage), null);

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

  // מזהה לא תקין או ריק
  assert.equal(deleteCustomTemplate('', storage), false);
  assert.equal(deleteCustomTemplate(null, storage), false);
  assert.equal(deleteCustomTemplate(undefined, storage), false);
  assert.equal(deleteCustomTemplate(0, storage), false);

  // רשימה עם איברים ריקים או ללא id
  const storeWithNulls = createMemoryStorage({
    [STORAGE_KEY]: JSON.stringify([null, { id: 'tpl_valid', name: 'תקינה' }, {}])
  });
  assert.equal(deleteCustomTemplate('tpl_valid', storeWithNulls), true);

  // מחיקה מ-localStorage גלובלי כשלא מועבר storage
  const globalStore = createMemoryStorage();
  globalThis.localStorage = globalStore;
  try {
    const globSaved = saveCustomTemplate('למחיקה גלובלית', { title: 'מחיקה' });
    const globDeleted = deleteCustomTemplate(globSaved.id);
    assert.equal(globDeleted, true);
  } finally {
    delete globalThis.localStorage;
  }
});

test('עמידות לשגיאות storage', () => {
  // אי-זמינות storage מוחלטת
  assert.equal(saveCustomTemplate('שם', {}, null), null);
  assert.deepEqual(listCustomTemplates(null), []);
  assert.equal(deleteCustomTemplate('tpl_any', null), false);

  // אובייקט ללא מתודות Web Storage תקינות
  const emptyObjStore = {};
  assert.equal(saveCustomTemplate('שם', {}, emptyObjStore), null);
  assert.deepEqual(listCustomTemplates(emptyObjStore), []);
  assert.equal(deleteCustomTemplate('tpl_any', emptyObjStore), false);

  // שגיאת חריגת נפח בשמירה
  const quotaErrorStore = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    }
  };
  assert.equal(saveCustomTemplate('תבנית חריגה', { title: 'חריגה' }, quotaErrorStore), null);

  // שגיאת קריאה באבטחה
  const readErrorStore = {
    getItem: () => {
      throw new Error('SecurityError: localStorage blocked');
    }
  };
  assert.deepEqual(listCustomTemplates(readErrorStore), []);

  // שגיאת כתיבה במחיקה
  const deleteFailStore = {
    getItem: () => JSON.stringify([{ id: 'tpl_fail', name: 'כישלון' }]),
    setItem: () => {
      throw new Error('Disk write failed');
    }
  };
  assert.equal(deleteCustomTemplate('tpl_fail', deleteFailStore), false);

  // שגיאת קריאה במחיקה
  assert.equal(deleteCustomTemplate('tpl_fail', readErrorStore), false);

  // JSON לא תקין ב-storage
  const corruptedStore = {
    getItem: () => '{"invalid json syntax'
  };
  assert.deepEqual(listCustomTemplates(corruptedStore), []);

  // מבנה JSON שאינו מערך (למשל אובייקט או מספר)
  const nonArrayStore = {
    getItem: () => '{"key": "not an array"}'
  };
  assert.deepEqual(listCustomTemplates(nonArrayStore), []);

  // אובייקט בעל הפניה מעגלית שאינו ניתן לסריאליזציה
  const circular = { title: 'מעגלי' };
  circular.self = circular;
  assert.equal(saveCustomTemplate('מעגלי', circular, createMemoryStorage()), null);

  // זריקת שגיאה בגישה ל-localStorage גלובלי
  Object.defineProperty(globalThis, 'localStorage', {
    get() {
      throw new Error('SecurityError on global localStorage');
    },
    configurable: true
  });
  try {
    assert.equal(saveCustomTemplate('שם', {}), null);
    assert.deepEqual(listCustomTemplates(), []);
    assert.equal(deleteCustomTemplate('tpl_id'), false);
  } finally {
    delete globalThis.localStorage;
  }
});

test('קיום הממשק ב-index.html וב-exercises.html', () => {
  const root = path.join(__dirname, '..');
  const indexHtml = readIndex();
  const exercisesHtml = fs.readFileSync(path.join(root, 'exercises.html'), 'utf8');

  // index.html
  assert.match(indexHtml, /id=["']customTemplatesPanel["']/);
  assert.match(indexHtml, /id=["']saveTemplateBtn["']/);
  assert.match(indexHtml, /src=["']\.\/js\/custom-templates\.js["']/);
  assert.match(indexHtml, /שמור כתבנית אישית/);

  // exercises.html
  assert.match(exercisesHtml, /id=["']saveSelectionAsTemplateBtn["']/);
  assert.match(exercisesHtml, /src=["']\.\/js\/custom-templates\.js["']/);
  assert.match(exercisesHtml, /שמור כתבנית אישית/);

  // בדיקת רינדור בטוח: שימוש ב-createElement ו-textContent
  assert.ok(indexHtml.includes('document.createElement('));
  assert.ok(indexHtml.includes('.textContent = '));
  assert.ok(exercisesHtml.includes('document.createElement('));
  assert.ok(exercisesHtml.includes('.textContent = '));

  // וידוא שאין שימוש ב-innerHTML על רשימת התבניות
  assert.equal(indexHtml.includes('customTemplatesList.innerHTML'), false);
  assert.equal(exercisesHtml.includes('customTemplatesList.innerHTML'), false);
});
