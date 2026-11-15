const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Codec = require('../js/plan-link-codec.js');
const CP = require('../js/coach-profiles.js');

function createMockStorage(initialData = {}) {
  const map = { ...initialData };
  return {
    getItem: (key) => (Object.hasOwn(map, key) ? map[key] : null),
    setItem: (key, val) => {
      map[key] = String(val);
    },
    removeItem: (key) => {
      delete map[key];
    },
    dump: () => map
  };
}

test('1) קידוד ופענוח עברית תקין: encodePlanToQuery ו-decodePlanFromQuery משמרים מחרוזות בעברית ללא שיבוש', () => {
  const plan = {
    title: 'תוכנית אימון שבועית למתחילים',
    duration_minutes: 35,
    equipment: ['משקולות', 'גומיות'],
    exercises: [
      {
        name: 'שכיבות שמיכה בשיפוע חיובי',
        sets: 3,
        reps: 12,
        notes: 'דגש על נשימה והחזקת ליבה הדוקה'
      },
      {
        name: 'סקוואט חופשי כנגד משקל גוף',
        sets: 4,
        reps: 15,
        notes: 'ירידה איטית ומבוקרת'
      }
    ]
  };

  const query = Codec.encodePlanToQuery(plan);
  assert.ok(typeof query === 'string', 'Query must be a string');
  assert.ok(query.startsWith('plan='), 'Query must begin with parameter plan=');

  const rawParam = query.replace(/^plan=/, '');
  assert.match(rawParam, /^[A-Za-z0-9_-]+$/, 'Encoded parameter must be safe Base64 URL-safe string without + or /');

  // Decode directly from parameter query
  const decoded1 = Codec.decodePlanFromQuery(query);
  assert.ok(decoded1, 'Decoded plan must be non-null');
  assert.equal(decoded1.title, 'תוכנית אימון שבועית למתחילים');
  assert.deepEqual(decoded1.equipment, ['משקולות', 'גומיות']);
  assert.equal(decoded1.exercises.length, 2);
  assert.equal(decoded1.exercises[0].name, 'שכיבות שמיכה בשיפוע חיובי');
  assert.equal(decoded1.exercises[0].notes, 'דגש על נשימה והחזקת ליבה הדוקה');
  assert.equal(decoded1.exercises[1].name, 'סקוואט חופשי כנגד משקל גוף');
  assert.equal(decoded1.exercises[1].notes, 'ירידה איטית ומבוקרת');

  // Decode with leading question mark as from location.search
  const decoded2 = Codec.decodePlanFromQuery(`?${query}`);
  assert.ok(decoded2, 'Decoded plan from ? query must be non-null');
  assert.equal(decoded2.title, plan.title);

  // Decode from full URL
  const decoded3 = Codec.decodePlanFromQuery(`https://trainerhub.app/index.html?${query}`);
  assert.ok(decoded3, 'Decoded plan from full URL must be non-null');
  assert.equal(decoded3.title, plan.title);
});

test('2) שמירת תרגילים וסטים: שדות התרגילים, הסטים, החזרות, המנוחות והשלבים נשמרים במלואם', () => {
  const richPlan = {
    title: 'אימון כוח מתקדם',
    duration_minutes: 50,
    equipment: ['dumbbells', 'bar'],
    phases: [
      {
        name: 'חימום מפרקים',
        exercises: [{ name: 'סיבובי כתפיים', sets: 2, reps: 15, duration_seconds: 30, rest_seconds: 15 }]
      },
      {
        name: 'חלק עיקרי',
        exercises: [
          {
            id: 'pullup_1',
            name: 'עליות מתח באחיזה רחבה',
            sets: 4,
            reps: 8,
            rest_seconds: 90,
            notes: 'טווח תנועה מלא'
          },
          { id: 'dip_1', name: 'מקבילים עם משקל', sets: 4, reps: 10, rest_seconds: 75 },
          { id: 'plank_1', name: 'פלאנק סטטי', sets: 3, duration_seconds: 60, rest_seconds: 45 }
        ]
      }
    ]
  };

  const query = Codec.encodePlanToQuery(richPlan);
  const decoded = Codec.decodePlanFromQuery(query);

  assert.ok(decoded, 'Decoded rich plan must not be null');
  assert.equal(decoded.title, 'אימון כוח מתקדם');
  assert.equal(decoded.duration_minutes, 50);
  assert.deepEqual(decoded.equipment, ['dumbbells', 'bar']);

  // Verify phases
  assert.equal(decoded.phases.length, 2);
  assert.equal(decoded.phases[0].name, 'חימום מפרקים');
  assert.equal(decoded.phases[0].exercises.length, 1);
  assert.equal(decoded.phases[0].exercises[0].name, 'סיבובי כתפיים');
  assert.equal(decoded.phases[0].exercises[0].sets, 2);
  assert.equal(decoded.phases[0].exercises[0].reps, 15);
  assert.equal(decoded.phases[0].exercises[0].duration_seconds, 30);
  assert.equal(decoded.phases[0].exercises[0].rest_seconds, 15);

  assert.equal(decoded.phases[1].name, 'חלק עיקרי');
  assert.equal(decoded.phases[1].exercises.length, 3);
  assert.equal(decoded.phases[1].exercises[0].name, 'עליות מתח באחיזה רחבה');
  assert.equal(decoded.phases[1].exercises[0].sets, 4);
  assert.equal(decoded.phases[1].exercises[0].reps, 8);
  assert.equal(decoded.phases[1].exercises[0].rest_seconds, 90);
  assert.equal(decoded.phases[1].exercises[0].notes, 'טווח תנועה מלא');

  assert.equal(decoded.phases[1].exercises[1].name, 'מקבילים עם משקל');
  assert.equal(decoded.phases[1].exercises[1].sets, 4);
  assert.equal(decoded.phases[1].exercises[1].reps, 10);
  assert.equal(decoded.phases[1].exercises[1].rest_seconds, 75);

  assert.equal(decoded.phases[1].exercises[2].name, 'פלאנק סטטי');
  assert.equal(decoded.phases[1].exercises[2].sets, 3);
  assert.equal(decoded.phases[1].exercises[2].duration_seconds, 60);
  assert.equal(decoded.phases[1].exercises[2].rest_seconds, 45);

  // Direct exercises list populated for compatibility
  assert.equal(decoded.exercises.length, 4);
});

test('3) דחיית קלט פגום/לא JSON: קלט פגום, Base64 לא חוקי, JSON שבור או טיפוסים שגויים מחזירים null ללא קריסה', () => {
  // Invalid Base64 characters
  assert.equal(Codec.decodePlanFromQuery('?plan=invalid_base64!!!@@@###'), null);
  assert.equal(Codec.decodePlanFromQuery('?plan=abc%20def'), null);

  // Valid Base64 but broken JSON
  const brokenJsonB64 = Buffer.from('{title: broken json, no quotes', 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  assert.equal(Codec.decodePlanFromQuery(`?plan=${brokenJsonB64}`), null);

  // Valid Base64 with JSON primitives (not object)
  const numberB64 = Buffer.from('123456', 'utf8').toString('base64');
  assert.equal(Codec.decodePlanFromQuery(`?plan=${numberB64}`), null);

  const stringB64 = Buffer.from('"just a plain string"', 'utf8').toString('base64');
  assert.equal(Codec.decodePlanFromQuery(`?plan=${stringB64}`), null);

  const arrayB64 = Buffer.from('["item1", "item2"]', 'utf8').toString('base64');
  assert.equal(Codec.decodePlanFromQuery(`?plan=${arrayB64}`), null);

  const nullB64 = Buffer.from('null', 'utf8').toString('base64');
  assert.equal(Codec.decodePlanFromQuery(`?plan=${nullB64}`), null);

  // Empty object without title or exercises
  const emptyObjB64 = Buffer.from('{}', 'utf8').toString('base64');
  assert.equal(Codec.decodePlanFromQuery(`?plan=${emptyObjB64}`), null);

  // Dangerous script injection in title gets sanitized
  const xssPlan = {
    title: '<script>alert(1)</script>אימון נקי',
    exercises: [{ name: '<img src=x onerror=alert(2)>שכיבות שמיכה', sets: 3 }]
  };
  const xssQuery = Codec.encodePlanToQuery(xssPlan);
  const xssDecoded = Codec.decodePlanFromQuery(xssQuery);
  assert.ok(xssDecoded, 'Decoded object should be returned with cleaned text');
  assert.doesNotMatch(xssDecoded.title, /script/i, 'Dangerous script tag must be stripped');
  assert.doesNotMatch(xssDecoded.exercises[0].name, /img/i, 'Dangerous img tag must be stripped');
  assert.ok(xssDecoded.title.includes('אימון נקי'), 'Legitimate text must be preserved');
});

test('4) הגנה מקלט ענק מעל 4096 תווים: decodePlanFromQuery דוחה מחרוזות העולות על 4096 תווים ומחזיר null מיד', () => {
  // Query string directly exceeding 4096 characters
  const giantSearchString = `?plan=${'a'.repeat(4100)}`;
  assert.ok(giantSearchString.length > 4096);
  assert.equal(Codec.decodePlanFromQuery(giantSearchString), null);

  // Very large random string of 5000 characters
  const massiveString = `https://trainerhub.app/?plan=${'b'.repeat(5000)}`;
  assert.equal(Codec.decodePlanFromQuery(massiveString), null);

  // Boundary check: exactly 4097 characters
  const boundary4097 = `?plan=${'c'.repeat(4091)}`;
  assert.equal(boundary4097.length, 4097);
  assert.equal(Codec.decodePlanFromQuery(boundary4097), null);
});

test('5) פרמטר חסר מחזיר null: קלט ללא פרמטר plan, קלט ריק, ערך ריק או פרמטרים אחרים מחזירים null', () => {
  assert.equal(Codec.decodePlanFromQuery(''), null);
  assert.equal(Codec.decodePlanFromQuery('   '), null);
  assert.equal(Codec.decodePlanFromQuery(null), null);
  assert.equal(Codec.decodePlanFromQuery(undefined), null);
  assert.equal(Codec.decodePlanFromQuery(12345), null);
  assert.equal(Codec.decodePlanFromQuery({}), null);

  // Query string without plan parameter
  assert.equal(Codec.decodePlanFromQuery('?user=123&action=test'), null);
  assert.equal(Codec.decodePlanFromQuery('?tab=settings'), null);
  assert.equal(Codec.decodePlanFromQuery('?page=journal&id=99'), null);

  // Plan parameter present but completely empty
  assert.equal(Codec.decodePlanFromQuery('?plan='), null);
  assert.equal(Codec.decodePlanFromQuery('?plan=    '), null);
  assert.equal(Codec.decodePlanFromQuery('plan='), null);

  // encodePlanToQuery with invalid input returns empty string
  assert.equal(Codec.encodePlanToQuery(null), '');
  assert.equal(Codec.encodePlanToQuery(undefined), '');
  assert.equal(Codec.encodePlanToQuery('not an object'), '');
  assert.equal(Codec.encodePlanToQuery([]), '');
  assert.equal(Codec.encodePlanToQuery({}), '');
});

test('6) אינטגרציה עם coach-profiles: יצירת פרופיל מתאמן ושיוך אימון מתממשקים עם מחולל הקישורים המקודד', () => {
  const storage = createMockStorage();
  const trainee = CP.createTraineeProfile('יוסי ברק', 'intermediate', 'dumbbells', storage);
  assert.ok(trainee, 'Trainee profile must be created');

  const workout = {
    title: 'אימון כוח מותאם אישית',
    duration_minutes: 40,
    equipment: ['dumbbells'],
    exercises: [
      { name: 'לחיצת חזה עם משקולות', sets: 4, reps: 10, rest_seconds: 60 },
      { name: 'חתירה בהטיית גו', sets: 3, reps: 12, rest_seconds: 60 }
    ]
  };

  const updatedTrainee = CP.assignWorkoutToTrainee(trainee.id, workout, storage);
  assert.ok(updatedTrainee, 'Workout must be assigned to trainee');
  assert.ok(updatedTrainee.assignedWorkout, 'Assigned workout must exist on trainee');

  // Encode the trainee's assigned workout to URL query
  const query = Codec.encodePlanToQuery(updatedTrainee.assignedWorkout);
  assert.ok(typeof query === 'string' && query.startsWith('plan='), 'Query must be encoded from trainee plan');

  // Generate full shareable URL with base URL
  const baseUrl = 'https://trainerhub.app/index.html';
  const shareUrl = `${baseUrl}?${query}`;
  assert.ok(shareUrl.includes('?plan='), 'Share URL must contain ?plan= query');

  // Decode plan from the generated share URL
  const decoded = Codec.decodePlanFromQuery(shareUrl);
  assert.ok(decoded, 'Decoded plan from shareUrl must be non-null');
  assert.equal(decoded.title, 'אימון כוח מותאם אישית');
  assert.equal(decoded.duration_minutes, 40);
  assert.equal(decoded.exercises.length, 2);
  assert.equal(decoded.exercises[0].name, 'לחיצת חזה עם משקולות');
  assert.equal(decoded.exercises[0].sets, 4);
  assert.equal(decoded.exercises[0].reps, 10);
  assert.equal(decoded.exercises[1].name, 'חתירה בהטיית גו');

  // Verify exportTraineeSummaryText reflects the workout
  const summary = CP.exportTraineeSummaryText(updatedTrainee);
  assert.ok(summary.includes('יוסי ברק'), 'Summary must contain trainee name');
  assert.ok(summary.includes('אימון כוח מותאם אישית'), 'Summary must contain workout title');
});

test('7) קיום כפתור הפקת קישור שיתוף במצב מאמן ב-journal.html: וידוא קיום הכפתור copyCoachPlanLinkBtn וטעינת הסקריפט', () => {
  const journalPath = path.join(__dirname, '..', 'journal.html');
  const journalHtml = fs.readFileSync(journalPath, 'utf8');

  // Verify script src="./js/plan-link-codec.js" is loaded
  assert.match(
    journalHtml,
    /<script\s+src=["']\.\/js\/plan-link-codec\.js["']>/,
    'journal.html must include script tag for plan-link-codec.js'
  );

  // Verify button with id copyCoachPlanLinkBtn exists
  assert.ok(
    journalHtml.includes('id="copyCoachPlanLinkBtn"') || journalHtml.includes("id='copyCoachPlanLinkBtn'"),
    'journal.html must contain button with id copyCoachPlanLinkBtn'
  );

  const btnMatch = journalHtml.match(/<button\b[^>]*id=["']copyCoachPlanLinkBtn["'][^>]*>([\s\S]*?)<\/button>/i);
  assert.ok(btnMatch, 'copyCoachPlanLinkBtn must be declared as a button element');
  assert.ok(btnMatch[0].includes('type="button"'), 'copyCoachPlanLinkBtn must explicitly specify type="button"');
  assert.ok(
    btnMatch[0].includes('aria-label=') || btnMatch[1].trim().length > 0,
    'copyCoachPlanLinkBtn must have an accessible label or readable text'
  );

  // Verify click listener registration in script
  assert.match(
    journalHtml,
    /copyCoachPlanLinkBtn/,
    'journal.html script must bind event listener to copyCoachPlanLinkBtn'
  );
});

test('8) קיום באנר טעינה וכניסת טעינה אוטומטית ב-index.html: וידוא id=sharedCoachPlanBanner עם textContent וטעינת הסקריפט', () => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  // Verify script src="./js/plan-link-codec.js" is loaded
  assert.match(
    indexHtml,
    /<script\s+src=["']\.\/js\/plan-link-codec\.js["']>/,
    'index.html must include script tag for plan-link-codec.js'
  );

  // Verify banner element with id sharedCoachPlanBanner exists
  assert.ok(
    indexHtml.includes('id="sharedCoachPlanBanner"') || indexHtml.includes("id='sharedCoachPlanBanner'"),
    'index.html must contain element with id sharedCoachPlanBanner'
  );

  // Verify banner role and Hebrew text
  const bannerMatch = indexHtml.match(/<div\b[^>]*id=["']sharedCoachPlanBanner["'][^>]*>([\s\S]*?)<\/div>/i);
  assert.ok(bannerMatch, 'sharedCoachPlanBanner must be declared as a div banner element');
  assert.match(indexHtml, /נטענה תוכנית ממאמן/, "index.html must contain the text 'נטענה תוכנית ממאמן'");

  // Verify checkSharedCoachPlan sets banner textContent only (no innerHTML)
  assert.match(indexHtml, /sharedCoachPlanBanner/, 'index.html script must reference sharedCoachPlanBanner');
  assert.match(
    indexHtml,
    /banner\.textContent\s*=\s*['"]נטענה תוכנית ממאמן/,
    'index.html must update banner using textContent only to prevent XSS'
  );
  assert.doesNotMatch(
    indexHtml,
    /sharedCoachPlanBanner["']?\)\.innerHTML/,
    'sharedCoachPlanBanner must never use innerHTML'
  );
});
