# סוכן הרחבת ספריית התרגילים (library-gap-agent)

מרחיב את ספריית התרגילים כשחסר תרגיל, כשסרטון לא זמין, או כשאין חלופה לפי ציוד, רמה ותנאי שטח —
מתוך הצעות של משתמשים וחיפוש ב-YouTube דרך ה-API הרשמי. **האתר נשאר סטטי ב-GitHub Pages; אין שרת.**
הסוכן רץ ב-GitHub Actions, וכל תוצר שלו הוא Draft PR שאדם ממזג. שום דבר לא נכנס לספרייה לבד.

## הזרימה
1. **זיהוי חוסרים** (`scripts/library-agent/lib/gaps.js`): תרגיל בלי סרטון (`available:false` או ללא מקור),
   סרטון שלא נטען (בדיקת HEAD, רק 404/410 נחשבים "לא זמין"; שגיאת רשת = לא ידוע), ושילוב שריר × ציוד × רמה
   שיש לו תרגיל אחד בלבד (ל"החלף" אין מה להציע). דיווח ידני: issue עם התווית `exercise-gap`.
2. **הגשת רעיונות** (`suggest.html`): קישור YouTube/Drive, שם, תיאור, ציוד, קהל יעד, קטע זמן. לפני השליחה
   מוצג בדיוק מה יפורסם. השליחה פותחת issue מוכן מראש עם התווית `exercise-suggestion` (דורש חשבון GitHub);
   בלי חשבון אפשר להוריד JSON ולשלוח למדריך.
3. **סוכן מחקר** (`scripts/library-agent/run.js`): קורא את ה-issues, מאמת (רק YouTube/Drive, הסכמה חובה,
   שם חסום נדחה, טקסט מנוקה ומוגבל באורך), בודק כפילויות מול הקטלוג ומול התור (מזהה וידאו, מזהה Drive,
   שם עם סובלנות של שגיאת כתיב אחת), ומחפש ב-YouTube עד 5 חיפושים לריצה עם מטמון של 7 ימים.
4. **לכל מועמד**: `observed` = מה שהמקור אומר (כותרת, יוצר, קישור, משך, תיאור) עם `basis` שאומר מאיפה;
   `proposed` = מה שהסוכן מציע (שרירים, ציוד, רמה, לאיזה חוסר) עם `basis: title-and-description-only`.
   **הסוכן לא צופה בסרטונים ואינו טוען שצפה.** `surface` תמיד `null` אלא אם אדם כתב זאת, ו-
   `trainerApprovalRequired` תמיד `true`.
5. **GitHub**: התור נשמר ב-`data/library-agent/candidates.json` (+ `sources.json` לייחוס, `search-cache.json`,
   `last-run.json`). ה-workflow פותח או מעדכן Draft PR אחד בענף `library-agent/candidates`. אין מיזוג אוטומטי.
   מועמד שאושר ידנית נכנס לקטלוג רק דרך `node scripts/library-agent/run.js --apply-approved` שמריץ אדם.
6. **סטטוס באתר**: `suggest.html` (קוד ב-`js/suggest.js`, בדיקות ב-`test/suggest.test.js`) מציג לכל מועמד
   נשלחה / בבדיקה / אושרה / נדחתה. התור נקרא קודם מהענף `library-agent/candidates` (raw.githubusercontent.com,
   כך שהסטטוס חי בלי מיזוג), ואם אין — מהעותק שבאתר `data/library-agent/candidates.json`; issues פתוחים בלי
   מועמד מוצגים כ"נשלחה" מה-API הציבורי של GitHub (60 קריאות לשעה בלי התחברות; כשל מדווח, לא מוסתר).
   הטופס ממלא מראש את שדות תבנית ה-issue לפי ה-`id` שלהם (`url`, `exercise`, `description`, `equipment`,
   `audience`, `start`, `end`, `gap`); את תיבת ההסכמה מסמנים ב-GitHub עצמו. "חסר לי תרגיל" פותח את תבנית
   `exercise-gap.yml`. בכל כרטיס בספרייה בלי סרטון או בלי חלופה יש קישור `suggest.html?gap=<id>`.

`test/honesty.test.js` דרש בעבר "אין GitHub Actions"; עכשיו הוא דורש ש-**היחיד** הוא `library-gap-agent.yml`,
שהוא פותח Draft בלבד, ושאין בו מיזוג או פריסה. ה-README עודכן באותו קומיט.

## הפעלה (מה שצריך להגדיר)
| מה | איפה | חובה? |
|---|---|---|
| `YOUTUBE_API_KEY` | Settings → Secrets and variables → Actions | לא. בלעדיו הסוכן עדיין מעבד הצעות ומזהה חוסרים, ומדווח `not-configured` |
| הרשאה ל-Actions לפתוח PR | Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" | כן, אחרת שלב ה-PR נכשל (התור עדיין נשמר בענף) |
| תוויות `exercise-suggestion`, `exercise-gap` | חייבות להתקיים במאגר (GitHub לא יוצר תוויות מתבנית). נוצרו ב-`gh label create` בזמן ה-PR; אם חסרות: Issues → Labels | כן |
| הרצה ראשונה | ה-workflow פועל רק מהענף הראשי: אחרי המיזוג, Actions → library-gap-agent → Run workflow (אפשר לבחור מספר חיפושים ובדיקת קישורים) | כן, פעם אחת |

מקומית: `node scripts/library-agent/run.js --dry-run --no-issues` מריץ זיהוי חוסרים בלי רשת;
`node --test test/library-agent.test.js` מריץ את הבדיקות.

## מגבלות שנאכפות בקוד
- אין העתקת סרטונים: נשמר קישור + הטמעה + ייחוס ליוצר (`attribution`, `embedOnly:true`).
- הצעות, תיאורים ותמלילים הם נתונים, לא הוראות: מנוקים, נחתכים, ולעולם לא מופעלים.
- סודות רק ב-GitHub Secrets / סביבה; אין מפתח בקוד הדפדפן.
- עלות: עד 5 חיפושי YouTube לריצה, מטמון 7 ימים, ריצה יומית אחת, `concurrency` מונע ריצות מקבילות.
- כשל ספק: `provider-failed` / `quota-exceeded` נרשמים בדוח ולא מפילים את הריצה ולא ממציאים תוצאות.
- לא נטענת התאמה לשטח רטוב או אישור מקצועי על סמך שם תרגיל.
