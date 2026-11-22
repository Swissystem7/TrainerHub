const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { evaluatePolarizedBalance, isHighIntensitySession } = require('../js/polarized-balance.js');

test('זיהוי יחס 80/20 מאוזן - חלוקת עצימות שבועית תקינה של 80% מתון ו-20% עצימות גבוהה', () => {
  // 5 sessions: 4 moderate, 1 HIIT (exactly 80% moderate / 20% high intensity)
  const sessions = [
    { id: 's1', intensity: 'moderate', name: 'אימון נפח רגליים' },
    { id: 's2', intensity: 'moderate', name: 'אימון דחיפה מבוקר' },
    { id: 's3', intensity: 'moderate', name: 'ריצת נפח אירובית' },
    { id: 's4', intensity: 'moderate', name: 'אימון משיכה מתון' },
    { id: 's5', intensity: 'hiit', name: 'אימון הפוגות עצימות מרבית' }
  ];

  const result = evaluatePolarizedBalance(sessions);

  assert.equal(result.status, 'balanced_80_20', 'סטטוס האיזון צריך להיות balanced_80_20');
  assert.equal(result.isBalanced, true, 'isBalanced צריך להיות true');
  assert.equal(result.totalSessions, 5, 'סך האימונים צריך להיות 5');
  assert.equal(result.moderateCount, 4, 'מספר אימונים מתונים צריך להיות 4');
  assert.equal(result.highCount, 1, 'מספר אימוני קצה/HIIT צריך להיות 1');
  assert.equal(result.moderateRatio, 0.8, 'יחס אימונים מתונים צריך להיות 0.8 (80%)');
  assert.equal(result.highRatio, 0.2, 'יחס אימוני קצה צריך להיות 0.2 (20%)');
  assert.equal(result.moderatePct, 80, 'אחוז אימונים מתונים צריך להיות 80%');
  assert.equal(result.highPct, 20, 'אחוז אימוני קצה צריך להיות 20%');
  assert.equal(result.suggestion, null, 'כאשר האיזון תקין לא צריכה להיות הצעת החלפה');

  // Verify isHighIntensitySession helper classification
  assert.equal(isHighIntensitySession(sessions[4]), true);
  assert.equal(isHighIntensitySession(sessions[0]), false);

  // Also verify 100% moderate (0 HIIT) is balanced
  const allModerate = [{ intensity: 'moderate' }, { intensity: 'low' }, { intensity: 'controlled' }];
  const modResult = evaluatePolarizedBalance(allModerate);
  assert.equal(modResult.status, 'balanced_80_20');
  assert.equal(modResult.isBalanced, true);
  assert.equal(modResult.highCount, 0);
  assert.equal(modResult.suggestion, null);
});

test('זיהוי עודף אימוני HIIT - זיהוי חריגה מאיזון עצימות מעבר ל-20%', () => {
  // 5 sessions: 3 moderate, 2 HIIT (40% HIIT > 20%)
  const sessions = [
    { id: 's1', intensity: 'moderate', focus_he: 'אימון כוח בסיס' },
    { id: 's2', intensity: 'hiit', focus_he: 'אינטרוולים 6x200' },
    { id: 's3', intensity: 'moderate', focus_he: 'התאוששות וליבה' },
    { id: 's4', intensity: 'high', focus_he: 'אימון עצימות גבוהה ספרינטים' },
    { id: 's5', intensity: 'moderate', focus_he: 'ריצה קלה' }
  ];

  const result = evaluatePolarizedBalance(sessions);

  assert.equal(result.status, 'too_much_high_intensity', 'עודף אימוני קצה צריך להיות מסווג כ-too_much_high_intensity');
  assert.equal(result.isBalanced, false, 'isBalanced צריך להיות false');
  assert.equal(result.totalSessions, 5, 'סך האימונים צריך להיות 5');
  assert.equal(result.highCount, 2, 'מספר אימוני קצה צריך להיות 2');
  assert.equal(result.moderateCount, 3, 'מספר אימונים מתונים צריך להיות 3');
  assert.equal(result.highRatio, 0.4, 'יחס אימוני קצה צריך להיות 0.4');
  assert.equal(result.highPct, 40, 'אחוז אימוני קצה צריך להיות 40%');
  assert.ok(result.highRatio > 0.2, 'יחס אימוני עצימות גבוהה חורג מ-20%');

  // Also test text-based and isHiit flag recognition
  const flagSessions = [{ isHiit: true }, { type: 'sprint' }, { intensity: 'moderate' }];
  const flagResult = evaluatePolarizedBalance(flagSessions);
  assert.equal(flagResult.status, 'too_much_high_intensity');
  assert.equal(flagResult.highCount, 2);
});

test('הצעת החלפה לאימון מתון - המלצה אופרטיבית להחלפת אימון קצה אחד במתון למניעת שחיקה', () => {
  const overloadedSessions = [
    { intensity: 'hiit', name: 'אימון טבטה' },
    { intensity: 'hiit', name: 'אימון הפוגות' },
    { intensity: 'moderate', name: 'אימון נפח' },
    { intensity: 'moderate', name: 'אימון ליבה מבוקר' }
  ];

  const result = evaluatePolarizedBalance(overloadedSessions);

  assert.equal(result.status, 'too_much_high_intensity');
  assert.ok(result.suggestion, 'חייבת להיות הצעת החלפה');
  assert.equal(typeof result.suggestion, 'string', 'הצעת ההחלפה צריכה להיות מחרוזת טקסט');
  assert.match(result.suggestion, /להחליף|החלפ/, 'ההצעה חייבת לכלול מילת החלפה');
  assert.match(result.suggestion, /קצה/, 'ההצעה חייבת להתייחס לאימון קצה');
  assert.match(result.suggestion, /מתון|מתונה/, 'ההצעה חייבת להמליץ על אימון מתון');
  assert.equal(result.recommendation, result.suggestion, 'recommendation צריך להיות זהה ל-suggestion');
});

test('קלט ריק/null - טיפול בטוח ומניעת שגיאות על קלט ריק, null או בלתי מוגדר', () => {
  const nullResult = evaluatePolarizedBalance(null);
  assert.equal(nullResult.status, 'balanced_80_20', 'קלט null צריך להחזיר balanced_80_20 כברירת מחדל בטוחה');
  assert.equal(nullResult.isBalanced, true);
  assert.equal(nullResult.totalSessions, 0);
  assert.equal(nullResult.highCount, 0);
  assert.equal(nullResult.moderateCount, 0);
  assert.equal(nullResult.suggestion, null);

  const undefResult = evaluatePolarizedBalance(undefined);
  assert.equal(undefResult.status, 'balanced_80_20');
  assert.equal(undefResult.totalSessions, 0);

  const emptyResult = evaluatePolarizedBalance([]);
  assert.equal(emptyResult.status, 'balanced_80_20');
  assert.equal(emptyResult.totalSessions, 0);
  assert.equal(emptyResult.suggestion, null);

  const nonArrayResult = evaluatePolarizedBalance({ not: 'an array' });
  assert.equal(nonArrayResult.status, 'balanced_80_20');
  assert.equal(nonArrayResult.totalSessions, 0);
});

test('קיום הבאדג ב-weekly.html וב-reserves.html - בדיקת קיום polarizedBalanceBadge ושימוש ב-createElement ו-textContent', () => {
  const weeklyHtml = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
  const reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');

  // Verify scripts are loaded in both pages
  assert.match(
    weeklyHtml,
    /<script src="\.\/js\/polarized-balance\.js"><\/script>/,
    'weekly.html חייב לטעון את polarized-balance.js'
  );
  assert.match(
    reservesHtml,
    /<script src="\.\/js\/polarized-balance\.js"><\/script>/,
    'reserves.html חייב לטעון את polarized-balance.js'
  );

  // Verify the badge ID is referenced in both pages
  assert.ok(weeklyHtml.includes('polarizedBalanceBadge'), 'weekly.html חייב לכלול התייחסות ל-polarizedBalanceBadge');
  assert.ok(
    reservesHtml.includes('polarizedBalanceBadge'),
    'reserves.html חייב לכלול התייחסות ל-polarizedBalanceBadge'
  );

  // Verify that the badge is manipulated via createElement and textContent
  assert.ok(
    weeklyHtml.includes('createElement') && weeklyHtml.includes('textContent'),
    'weekly.html חייב להשתמש ב-createElement ו-textContent עבור הבאדג'
  );
  assert.ok(
    reservesHtml.includes('createElement') && reservesHtml.includes('textContent'),
    'reserves.html חייב להשתמש ב-createElement ו-textContent עבור הבאדג'
  );

  // Test dynamic creation with mock DOM element
  const mockWeeklyContainer = {
    children: [],
    appendChild(child) {
      this.children.push(child);
    }
  };
  const badgeEl = {
    id: '',
    className: '',
    textContent: ''
  };
  badgeEl.id = 'polarizedBalanceBadge';
  badgeEl.className = 'pill';
  const balance = evaluatePolarizedBalance([
    { intensity: 'moderate' },
    { intensity: 'moderate' },
    { intensity: 'moderate' },
    { intensity: 'moderate' },
    { intensity: 'hiit' }
  ]);
  badgeEl.textContent = balance.status === 'balanced_80_20' ? 'איזון 80/20 תקין' : 'עודף עצימות';
  mockWeeklyContainer.appendChild(badgeEl);

  assert.equal(mockWeeklyContainer.children.length, 1);
  assert.equal(mockWeeklyContainer.children[0].id, 'polarizedBalanceBadge');
  assert.equal(mockWeeklyContainer.children[0].textContent, 'איזון 80/20 תקין');
});
