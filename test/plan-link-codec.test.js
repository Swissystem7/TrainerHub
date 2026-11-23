const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const Codec = require('../js/plan-link-codec.js');
const CP = require('../js/coach-profiles.js');
const { readIndex } = require('./helpers/page-source');

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
  const indexHtml = readIndex();

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

test('9) sanitizeText מנקה תווי בקרה, תגיות מקוננות, סימני <> ומכבד גבולות אורך מקסימלי', () => {
  assert.equal(Codec.sanitizeText(null), '');
  assert.equal(Codec.sanitizeText(undefined), '');

  // Strip ASCII control characters: 0..8, 11..31, 127
  // Note: 9 (\t) and 10 (\n) become spaces via whitespace collapse
  const controlStr = '\x00a\x08b\tc\nd\x0be\x1ff g~h\x7f';
  assert.equal(Codec.sanitizeText(controlStr), 'ab c def g~h');
  assert.equal(Codec.sanitizeText('\x00'), '');
  assert.equal(Codec.sanitizeText('\x08'), '');
  assert.equal(Codec.sanitizeText('\x0b'), '');
  assert.equal(Codec.sanitizeText('\x1f'), '');
  assert.equal(Codec.sanitizeText('\x7f'), '');

  // Iterative stripping of nested tags, including a fragment that reassembles after one pass
  assert.equal(Codec.sanitizeText('<script><script>alert(1)</script></script>'), 'alert(1)');
  assert.equal(Codec.sanitizeText('<scr<script>ipt>alert(1)</script>'), 'alert(1)');
  assert.equal(Codec.sanitizeText('<div><span>טקסט פנימי</span></div>'), 'טקסט פנימי');
  assert.equal(Codec.sanitizeText('<scr<script>ipt>'), '');
  assert.equal(Codec.sanitizeText('<script'), 'script');
  assert.doesNotMatch(Codec.sanitizeText('<script'), /[<>]/);
  assert.equal(Codec.sanitizeText('>'), '');

  // Lingering angle brackets removal
  assert.equal(Codec.sanitizeText('משקל > 50 ק"ג וגם < 100'), 'משקל 50 ק"ג וגם 100');

  // Whitespace collapsing and trimming
  assert.equal(Codec.sanitizeText('   שלום    עולם   \t\n  בדיקה   '), 'שלום עולם בדיקה');

  // Length limit: default 200 vs custom vs boundary
  assert.equal(Codec.sanitizeText('1234567890', 5), '12345');
  assert.equal(Codec.sanitizeText('12345', 5), '12345');
  assert.equal(Codec.sanitizeText('1234', 5), '1234');

  // Invalid maxLen falls back to 200
  assert.equal(Codec.sanitizeText('12345', 0), '12345');
  assert.equal(Codec.sanitizeText('12345', -5), '12345');
  assert.equal(Codec.sanitizeText('12345', '5'), '12345');
  assert.equal(Codec.sanitizeText('12345', NaN), '12345');
  assert.equal(Codec.sanitizeText('12345', null), '12345');

  // 200 characters limit boundary
  const exact200 = 'x'.repeat(200);
  assert.equal(Codec.sanitizeText(exact200).length, 200);
  const over200 = 'x'.repeat(205);
  assert.equal(Codec.sanitizeText(over200).length, 200);
});

test('10) Base64 URL-safe קידוד ופענוח, טיפול בפדינג =, בדיקת תווים לא חוקיים והתנהגות ללא Buffer', () => {
  // Empty / non-string
  assert.equal(Codec.utf8ToBase64Url(''), '');
  assert.equal(Codec.utf8ToBase64Url(null), '');
  assert.equal(Codec.utf8ToBase64Url(123), '');
  assert.equal(Codec.base64UrlToUtf8(null), null);
  assert.equal(Codec.base64UrlToUtf8(123), null);

  // URL-safe replacement check: chars that produce + or / in standard Base64
  // '~?~\u07ff\u07ff' produces base64 'fj9+37/fvw==' containing '+', '/', and '=='
  const testUrlSafe = '~?~\u07ff\u07ff';
  const encodedUrlSafe = Codec.utf8ToBase64Url(testUrlSafe);
  assert.equal(encodedUrlSafe, 'fj9-37_fvw');
  assert.ok(!encodedUrlSafe.includes('+'), 'Must not contain +');
  assert.ok(!encodedUrlSafe.includes('/'), 'Must not contain /');
  assert.ok(!encodedUrlSafe.includes('='), 'Must not contain =');

  const decodedUrlSafe = Codec.base64UrlToUtf8(encodedUrlSafe);
  assert.equal(decodedUrlSafe, testUrlSafe);

  // Test padding lengths: length % 4 === 0, 2, 3
  const p0 = Codec.utf8ToBase64Url('abc'); // length % 4 === 0
  assert.equal(p0.length % 4, 0);
  assert.equal(Codec.base64UrlToUtf8(p0), 'abc');

  const p2 = Codec.utf8ToBase64Url('a'); // length % 4 === 2
  assert.equal(p2.length % 4, 2);
  assert.equal(Codec.base64UrlToUtf8(p2), 'a');

  const p3 = Codec.utf8ToBase64Url('ab'); // length % 4 === 3
  assert.equal(p3.length % 4, 3);
  assert.equal(Codec.base64UrlToUtf8(p3), 'ab');

  // Decoding with padding = or == stripped and decoded
  const sampleJson = JSON.stringify({ t: 'אימון מבחן' });
  const rawB64 = Buffer.from(sampleJson, 'utf8').toString('base64');
  const b64Url = rawB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(Codec.base64UrlToUtf8(b64Url), sampleJson);
  assert.equal(Codec.base64UrlToUtf8(b64Url + '='), sampleJson);
  assert.equal(Codec.base64UrlToUtf8(b64Url + '=='), sampleJson);

  // Invalid base64 characters at start, middle, end
  assert.equal(Codec.base64UrlToUtf8(`!${b64Url}`), null);
  assert.equal(Codec.base64UrlToUtf8(`${b64Url}!`), null);
  assert.equal(Codec.base64UrlToUtf8(`abc!xyz`), null);
  assert.equal(Codec.base64UrlToUtf8('a=b'), null);
  assert.equal(Codec.base64UrlToUtf8('abc=def'), null);
  assert.equal(Codec.base64UrlToUtf8(''), null);
  assert.equal(Codec.base64UrlToUtf8('   '), null);

  // Invalid UTF-8 bytes in base64 payload (fatal: true on TextDecoder)
  const invalidUtf8B64 = Buffer.from([0xff, 0xff, 0xff]).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  assert.equal(Codec.base64UrlToUtf8(invalidUtf8B64), null);

  // Environment without global Buffer (fallback to TextEncoder/btoa and atob/TextDecoder)
  const origBuffer = global.Buffer;
  try {
    delete global.Buffer;
    const encNoBuf = Codec.utf8ToBase64Url(testUrlSafe);
    assert.equal(encNoBuf, 'fj9-37_fvw');
    const decNoBuf = Codec.base64UrlToUtf8('fj9-37_fvw');
    assert.equal(decNoBuf, testUrlSafe);

    assert.equal(Codec.base64UrlToUtf8(p0), 'abc');
    assert.equal(Codec.base64UrlToUtf8(p2), 'a');
    assert.equal(Codec.base64UrlToUtf8(p3), 'ab');
    assert.equal(Codec.utf8ToBase64Url(''), '');
    assert.equal(Codec.utf8ToBase64Url(null), '');
    assert.equal(Codec.base64UrlToUtf8(''), null);
    assert.equal(Codec.base64UrlToUtf8(null), null);

    const testStr = 'בדיקה בעברית ללא Buffer גלובלי';
    const enc = Codec.utf8ToBase64Url(testStr);
    assert.ok(enc, 'Encoded string should be non-empty without Buffer');
    const dec = Codec.base64UrlToUtf8(enc);
    assert.equal(dec, testStr, 'Decoded string should match original without Buffer');

    const planWithoutBuffer = { title: 'אימון ללא Buffer', exercises: [{ name: 'מתח' }] };
    const q = Codec.encodePlanToQuery(planWithoutBuffer);
    const p = Codec.decodePlanFromQuery(q);
    assert.ok(p);
    assert.equal(p.title, 'אימון ללא Buffer');
  } finally {
    global.Buffer = origBuffer;
  }
});

test('11) compactPlan ו-compactEx: דחיסת תוכנית ותרגילים עם כל שדות הבחירה, שמות אלטרנטיביים וטיפוסי נתונים שונים', () => {
  // Non-object inputs return null
  assert.equal(Codec.compactPlan(null), null);
  assert.equal(Codec.compactPlan(undefined), null);
  assert.equal(Codec.compactPlan('not an object'), null);
  assert.equal(Codec.compactPlan(12345), null);
  assert.equal(Codec.compactPlan([]), null);
  assert.equal(Codec.compactPlan(true), null);
  assert.equal(Codec.compactPlan({}), null);

  // Title variations: name, t, title; empty/non-string titles
  assert.deepEqual(Codec.compactPlan({ name: 'כותרת משם' }), { t: 'כותרת משם' });
  assert.deepEqual(Codec.compactPlan({ t: 'כותרת מ-t' }), { t: 'כותרת מ-t' });
  assert.deepEqual(Codec.compactPlan({ title: 'כותרת מ-title' }), { t: 'כותרת מ-title' });
  assert.equal(Codec.compactPlan({ title: 12345 }), null);
  assert.equal(Codec.compactPlan({ title: '   ' }), null);

  // duration_minutes variations: 0, negative, string, float rounding, null, boolean
  assert.deepEqual(Codec.compactPlan({ title: 'בדיקת משך', duration_minutes: 0 }), { t: 'בדיקת משך' });
  assert.deepEqual(Codec.compactPlan({ title: 'בדיקת משך', duration_minutes: -10 }), { t: 'בדיקת משך' });
  assert.deepEqual(Codec.compactPlan({ title: 'בדיקת משך', duration_minutes: 'abc' }), { t: 'בדיקת משך' });
  assert.deepEqual(Codec.compactPlan({ title: 'בדיקת משך', duration_minutes: true }), { t: 'בדיקת משך' });
  assert.deepEqual(Codec.compactPlan({ title: 'בדיקת משך', durationMinutes: 42.4 }), { t: 'בדיקת משך', d: 42 });
  assert.deepEqual(Codec.compactPlan({ title: 'בדיקת משך', duration: '55' }), { t: 'בדיקת משך', d: 55 });

  // Equipment variations: single string, empty string, array, empty array, non-string
  assert.deepEqual(Codec.compactPlan({ title: 'ציוד מחרוזת', equipment: 'משקולת יד' }), {
    t: 'ציוד מחרוזת',
    q: ['משקולת יד']
  });
  assert.deepEqual(Codec.compactPlan({ title: 'ציוד ריק', equipment: '   ' }), { t: 'ציוד ריק' });
  assert.deepEqual(Codec.compactPlan({ title: 'ציוד מערך', equipment: ['גומיות', '   ', 'מתח', 123] }), {
    t: 'ציוד מערך',
    q: ['גומיות', 'מתח', '123']
  });
  assert.deepEqual(Codec.compactPlan({ title: 'ציוד מערך ריק', q: [] }), { t: 'ציוד מערך ריק' });

  // Exercises: string exercises vs object exercises with all fields
  const planWithEx = {
    title: 'תרגילים שונים',
    exercises: [
      'סקוואט חופשי',
      '   ', // empty string exercise dropped
      null, // invalid dropped
      123, // invalid dropped
      { name: 'שכיבות שמיכה', id: 'pushup', sets: 3, reps: 10, rest_seconds: 0, notes: 'ירידה איטית' },
      { name_he: 'מתח', s: '4', r: '8-10', ds: 30.8, rs: 90, notes: '   ' },
      { n: 'פלאנק', sets: 0, reps: 0, duration_seconds: 45, rest_seconds: -5 },
      { name: '   ' } // empty name dropped
    ]
  };
  const compacted = Codec.compactPlan(planWithEx);
  assert.ok(compacted);
  assert.equal(compacted.e.length, 4);
  assert.deepEqual(compacted.e[0], { n: 'סקוואט חופשי' });
  assert.deepEqual(compacted.e[1], { n: 'שכיבות שמיכה', id: 'pushup', s: 3, r: 10, rs: 0, no: 'ירידה איטית' });
  assert.deepEqual(compacted.e[2], { n: 'מתח', s: 4, r: '8-10', ds: 31, rs: 90 });
  assert.deepEqual(compacted.e[3], { n: 'פלאנק', ds: 45 });

  // Phases: valid phases, phase without name (defaults to 'עיקרי'), invalid phases filtered
  const planWithPhases = {
    title: 'שלבים',
    phases: [
      null,
      'not an object',
      [],
      { name: 'חימום', exercises: ['מתיחות'] },
      { n: '', e: [{ name: 'ספרינט', sets: 5 }] },
      { exercises: ['סקוואט'] }, // phase without name or n defaults to 'עיקרי'
      { name: 'שלב ללא תרגילים' }, // phase without exercises array produces e: []
      { name: 'שלב עם פסולים', exercises: [null, '   '] } // phase with invalid exercises produces e: []
    ]
  };
  const compactedPhases = Codec.compactPlan(planWithPhases);
  assert.ok(compactedPhases);
  assert.equal(compactedPhases.p.length, 5);
  assert.equal(compactedPhases.p[0].n, 'חימום');
  assert.equal(compactedPhases.p[1].n, 'עיקרי');
  assert.equal(compactedPhases.p[1].e[0].s, 5);
  assert.equal(compactedPhases.p[2].n, 'עיקרי');
  assert.deepEqual(compactedPhases.p[3].e, []);
  assert.deepEqual(compactedPhases.p[4].e, []);

  // String duration_minutes zero vs string rest_seconds
  assert.deepEqual(Codec.compactPlan({ title: 'משך אפס מחרוזת', duration_minutes: '0' }), { t: 'משך אפס מחרוזת' });
  const stringRsPlan = Codec.compactPlan({
    title: 'מנוחה מחרוזת',
    exercises: [
      { name: 'תרגיל1', rest_seconds: '45' },
      { name: 'תרגיל2', rest_seconds: '0' }
    ]
  });
  assert.equal(stringRsPlan.e[0].rs, 45);
  assert.equal(stringRsPlan.e[1].rs, 0);

  // Exercises with missing id has no id field
  assert.equal(compacted.e[0].id, undefined);
  // Exercise without name is dropped
  assert.deepEqual(Codec.compactPlan({ title: 'ללא שם', exercises: [{ sets: 3 }] }), { t: 'ללא שם' });
  // Plan with only empty phases: p is undefined
  const emptyPhasesPlan = Codec.compactPlan({ title: 'שלב ריק', phases: [null, 'string', []] });
  assert.equal(emptyPhasesPlan.p, undefined);
  // Plan with only empty exercises: e is undefined
  const emptyExPlan = Codec.compactPlan({ title: 'תרגיל ריק', exercises: [null, 123, []] });
  assert.equal(emptyExPlan.e, undefined);
});

test('12) expandPlan ו-expandEx: פריסת תוכנית ותרגילים, ברירות מחדל של כותרת ושלבים, וסנכרון תרגילים מול שלבים', () => {
  // Non-object input
  assert.equal(Codec.expandPlan(null), null);
  assert.equal(Codec.expandPlan(undefined), null);
  assert.equal(Codec.expandPlan('string'), null);
  assert.equal(Codec.expandPlan(123), null);
  assert.equal(Codec.expandPlan([]), null);
  assert.equal(Codec.expandPlan({}), null);

  // Plan with only title and no exercises
  const titleOnly = Codec.expandPlan({ t: 'אימון ריק' });
  assert.ok(titleOnly);
  assert.equal(titleOnly.title, 'אימון ריק');
  assert.equal(titleOnly.duration_minutes, null);
  assert.deepEqual(titleOnly.equipment, []);
  assert.deepEqual(titleOnly.exercises, []);
  assert.deepEqual(titleOnly.phases, []);

  // Plan with exercises but no title: title defaults to 'אימון', and phases default to [{ name: 'עיקרי', exercises }]
  const noTitle = Codec.expandPlan({ e: [{ n: 'שכיבות שמיכה', s: 3, r: 12 }] });
  assert.ok(noTitle);
  assert.equal(noTitle.title, 'אימון');
  assert.equal(noTitle.phases.length, 1);
  assert.equal(noTitle.phases[0].name, 'עיקרי');
  assert.equal(noTitle.phases[0].exercises.length, 1);
  assert.equal(noTitle.phases[0].exercises[0].name, 'שכיבות שמיכה');
  assert.equal(noTitle.phases[0].exercises[0].sets, 3);
  assert.equal(noTitle.phases[0].exercises[0].reps, 12);

  // Plan with phases but no direct exercises: exercises populated from phases, invalid phases filtered
  const phasesOnly = Codec.expandPlan({
    t: 'תוכנית שלבים בלבד',
    p: [null, 'invalid', [], { n: 'חימום', e: [{ n: 'סיבובים' }] }, { n: 'כוח', e: [{ n: 'סקוואט' }] }]
  });
  assert.ok(phasesOnly);
  assert.equal(phasesOnly.exercises.length, 2);
  assert.equal(phasesOnly.exercises[0].name, 'סיבובים');
  assert.equal(phasesOnly.exercises[1].name, 'סקוואט');

  // Both direct exercises and phases present: direct exercises preserved
  const bothExAndPh = Codec.expandPlan({
    t: 'שניהם',
    e: [{ n: 'ישיר' }],
    p: [{ n: 'שלב', e: [{ n: 'משלב' }] }]
  });
  assert.ok(bothExAndPh);
  assert.equal(bothExAndPh.exercises.length, 1);
  assert.equal(bothExAndPh.exercises[0].name, 'ישיר');
  assert.equal(bothExAndPh.phases.length, 1);
  assert.equal(bothExAndPh.phases[0].exercises[0].name, 'משלב');

  // expandEx with string item
  const stringExPlan = Codec.expandPlan({ t: 'מחרוזות', e: ['סקוואט', '  ', 123] });
  assert.equal(stringExPlan.exercises.length, 1);
  assert.equal(stringExPlan.exercises[0].name, 'סקוואט');
  assert.equal(stringExPlan.exercises[0].sets, 1);
  assert.equal(stringExPlan.exercises[0].reps, null);

  // expandEx field fallbacks & boundaries: rest_seconds: 0, sets/reps string or float
  const richExPlan = Codec.expandPlan({
    t: 'בדיקת שדות',
    e: [
      { n: 'תרגיל מלא', id: 'full1', s: '3', r: '10-12', ds: '45', rs: 0, no: 'הערה חשובה' },
      { name_he: 'תרגיל עברי', sets: 0, reps: 0, duration_seconds: 0, rest_seconds: -10 }
    ]
  });
  assert.equal(richExPlan.exercises[0].id, 'full1');
  assert.equal(richExPlan.exercises[0].sets, 3);
  assert.equal(richExPlan.exercises[0].reps, '10-12');
  assert.equal(richExPlan.exercises[0].duration_seconds, 45);
  assert.equal(richExPlan.exercises[0].rest_seconds, 0);
  assert.equal(richExPlan.exercises[0].notes, 'הערה חשובה');

  assert.equal(richExPlan.exercises[1].name, 'תרגיל עברי');
  assert.equal(richExPlan.exercises[1].id, undefined);
  assert.equal(richExPlan.exercises[1].sets, undefined);
  assert.equal(richExPlan.exercises[1].reps, undefined);
  assert.equal(richExPlan.exercises[1].duration_seconds, undefined);
  assert.equal(richExPlan.exercises[1].rest_seconds, undefined);

  // expandEx with durationSeconds and restSeconds camelCase aliases
  const camelExPlan = Codec.expandPlan({
    t: 'כינויים',
    e: [{ name: 'ריצה', durationSeconds: 60, restSeconds: 30, sets: 2, reps: 5 }]
  });
  assert.equal(camelExPlan.exercises[0].duration_seconds, 60);
  assert.equal(camelExPlan.exercises[0].rest_seconds, 30);

  // expandEx with string rest_seconds and zero rest_seconds
  const strRsExPlan = Codec.expandPlan({
    t: 'מנוחות מחרוזת',
    e: [
      { name: 'תרגיל1', rest_seconds: '45' },
      { name: 'תרגיל2', restSeconds: '0' },
      { name: 'תרגיל3', rs: '15' }
    ]
  });
  assert.equal(strRsExPlan.exercises[0].rest_seconds, 45);
  assert.equal(strRsExPlan.exercises[1].rest_seconds, 0);
  assert.equal(strRsExPlan.exercises[2].rest_seconds, 15);

  // Phases in expandPlan: phase without name defaults to 'עיקרי', phase without exercises or invalid
  const phExpandPlan = Codec.expandPlan({
    t: 'שלבים מורחבים',
    p: [
      { e: ['סקוואט'] }, // no name defaults to 'עיקרי'
      { name: 'שלב ריק' }, // no e produces exercises: []
      { name: 'שלב עם פסולים', e: [null, '   '] } // invalid exercises filtered
    ]
  });
  assert.equal(phExpandPlan.phases[0].name, 'עיקרי');
  assert.deepEqual(phExpandPlan.phases[1].exercises, []);
  assert.deepEqual(phExpandPlan.phases[2].exercises, []);

  // Duration aliases in expandPlan: durationMinutes, duration, d
  assert.equal(Codec.expandPlan({ t: 'דקות1', durationMinutes: 25 }).duration_minutes, 25);
  assert.equal(Codec.expandPlan({ t: 'דקות2', duration: 35 }).duration_minutes, 35);
  assert.equal(Codec.expandPlan({ t: 'דקות3', d: 45 }).duration_minutes, 45);

  // Equipment in expandPlan: string, array, empty
  const equipStr = Codec.expandPlan({ t: 'ציוד מחרוזת', q: 'מתח' });
  assert.deepEqual(equipStr.equipment, ['מתח']);
  const equipArr = Codec.expandPlan({ t: 'ציוד מערך', q: ['מתח', '   ', 'גומיות'] });
  assert.deepEqual(equipArr.equipment, ['מתח', 'גומיות']);
  const equipEmpty = Codec.expandPlan({ t: 'ציוד חסר' });
  assert.deepEqual(equipEmpty.equipment, []);
});

test('13) decodePlanFromQuery: פרסור שאילתות URL מורכבות, גבול אורך 4096 בדיוק ופרמטרים מרובים', () => {
  const basePlan = { title: 'אימון קצר', exercises: [{ name: 'פלאנק', sets: 3 }] };
  const query = Codec.encodePlanToQuery(basePlan);
  const paramVal = query.slice('plan='.length);

  // Multiple parameters with plan in different positions
  assert.equal(Codec.decodePlanFromQuery(`?foo=1&${query}&bar=2`).title, 'אימון קצר');
  assert.equal(Codec.decodePlanFromQuery(`?${query}&bar=2`).title, 'אימון קצר');
  assert.equal(Codec.decodePlanFromQuery(`?foo=1&${query}`).title, 'אימון קצר');

  // Query with ? at index 1: e.g. "a?plan=..."
  assert.equal(Codec.decodePlanFromQuery(`x?${query}`).title, 'אימון קצר');

  // Whitespace around parameter value: e.g. ?plan=%20...%20
  assert.equal(Codec.decodePlanFromQuery(`?plan=   ${paramVal}   `).title, 'אימון קצר');

  // Query length exactly 4096 characters boundary
  // Padded with additional harmless URL parameters to reach exactly 4096
  const baseStr = `?${query}&pad=`;
  const padLength = 4096 - baseStr.length;
  assert.ok(padLength > 0, 'Pad length must be positive');
  const exact4096 = baseStr + 'x'.repeat(padLength);
  assert.equal(exact4096.length, 4096);
  const decoded4096 = Codec.decodePlanFromQuery(exact4096);
  assert.ok(decoded4096, 'Query of exactly 4096 characters must succeed');
  assert.equal(decoded4096.title, 'אימון קצר');

  // Query of length 4097 characters must be rejected
  const over4096 = exact4096 + 'y';
  assert.equal(over4096.length, 4097);
  assert.equal(Codec.decodePlanFromQuery(over4096), null);

  // Param value exceeding 4096
  const giantParam = `?plan=${'A'.repeat(4097)}`;
  assert.equal(Codec.decodePlanFromQuery(giantParam), null);

  // Query without ? and with leading and trailing whitespace
  const dTrim = Codec.decodePlanFromQuery('   ' + query + '   ');
  assert.ok(dTrim);
  assert.equal(dTrim.title, 'אימון קצר');

  // Missing plan parameter returns null
  assert.equal(Codec.decodePlanFromQuery('?other=123'), null);
  assert.equal(Codec.decodePlanFromQuery('other=123'), null);
});

test('14) UMD ומודולריות: טעינה בסביבות דפדפן (window), Node (globalThis/module) ו-root.TH', () => {
  const codecFilePath = path.join(__dirname, '../js/plan-link-codec.js');
  const codecSource = fs.readFileSync(codecFilePath, 'utf8');

  // 1. Browser environment: window and window.TH exist
  const browserContext = { window: {}, TH: {} };
  browserContext.window = browserContext;
  vm.createContext(browserContext);
  vm.runInContext(codecSource, browserContext);

  assert.ok(browserContext.THPlanLinkCodec, 'window.THPlanLinkCodec should be defined');
  assert.equal(browserContext.TH.PlanLinkCodec, browserContext.THPlanLinkCodec);
  assert.equal(browserContext.TH.encodePlanToQuery, browserContext.THPlanLinkCodec.encodePlanToQuery);
  assert.equal(browserContext.TH.decodePlanFromQuery, browserContext.THPlanLinkCodec.decodePlanFromQuery);

  // 2. Browser environment where window.TH is not an object
  const nonObjectThContext = { window: {}, TH: 'not-an-object' };
  nonObjectThContext.window = nonObjectThContext;
  vm.createContext(nonObjectThContext);
  vm.runInContext(codecSource, nonObjectThContext);
  assert.ok(nonObjectThContext.THPlanLinkCodec);
  assert.equal(nonObjectThContext.TH, 'not-an-object');

  // 3. Node environment with globalThis and module.exports
  const nodeContext = {
    globalThis: {},
    module: { exports: {} },
    TextEncoder: globalThis.TextEncoder,
    TextDecoder: globalThis.TextDecoder,
    btoa: globalThis.btoa,
    atob: globalThis.atob
  };
  vm.createContext(nodeContext);
  vm.runInContext(codecSource, nodeContext);
  assert.ok(nodeContext.globalThis.THPlanLinkCodec);
  assert.equal(nodeContext.module.exports, nodeContext.globalThis.THPlanLinkCodec);

  // 4. Fallback when neither window nor globalThis is defined (this fallback)
  const bareContext = {
    module: { exports: {} },
    TextEncoder: globalThis.TextEncoder,
    TextDecoder: globalThis.TextDecoder,
    btoa: globalThis.btoa,
    atob: globalThis.atob
  };
  vm.createContext(bareContext);
  vm.runInContext(codecSource, bareContext);
  assert.ok(bareContext.module.exports.PARAM_KEY);
  assert.equal(bareContext.module.exports.PARAM_KEY, 'plan');

  // 5. In-process reloading to test globalThis.THPlanLinkCodec and globalThis.TH directly
  assert.equal(globalThis.THPlanLinkCodec, Codec);

  globalThis.TH = {};
  delete require.cache[require.resolve('../js/plan-link-codec.js')];
  const reloadedWithTH = require('../js/plan-link-codec.js');
  assert.equal(globalThis.TH.PlanLinkCodec, reloadedWithTH);
  assert.equal(globalThis.TH.encodePlanToQuery, reloadedWithTH.encodePlanToQuery);
  assert.equal(globalThis.TH.decodePlanFromQuery, reloadedWithTH.decodePlanFromQuery);

  globalThis.TH = 'not-an-object';
  delete require.cache[require.resolve('../js/plan-link-codec.js')];
  require('../js/plan-link-codec.js');
  assert.equal(globalThis.TH, 'not-an-object');

  globalThis.TH = null;
  delete require.cache[require.resolve('../js/plan-link-codec.js')];
  require('../js/plan-link-codec.js');
  assert.equal(globalThis.TH, null);
  delete globalThis.TH;

  const nullRootContext = {
    window: undefined,
    globalThis: null,
    module: { exports: {} },
    TextEncoder: globalThis.TextEncoder,
    TextDecoder: globalThis.TextDecoder,
    btoa: globalThis.btoa,
    atob: globalThis.atob
  };
  vm.createContext(nullRootContext);
  vm.runInContext(codecSource, nullRootContext);
  assert.equal(nullRootContext.module.exports.PARAM_KEY, 'plan');

  globalThis.window = {};
  delete require.cache[require.resolve('../js/plan-link-codec.js')];
  require('../js/plan-link-codec.js');
  assert.ok(globalThis.window.THPlanLinkCodec);
  delete globalThis.window;
  delete require.cache[require.resolve('../js/plan-link-codec.js')];
  require('../js/plan-link-codec.js');
});
