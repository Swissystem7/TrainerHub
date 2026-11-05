# מפת דרכים – מה כבר קיים ב-TrainerHub ומה באמת חסר (עדי, 5.11.2026)

עיקרון מנחה (מאבירן): לא בונים מאפס. כל הרחבה נכנסת לקבצים ולמודולים הקיימים: `js/core.js`, `journal.html`, `weekly.html`, `frontend/workout-mode.html` ו-`booklet`/`site-*`. משתמשים באותה סכימת `phases`, באותו `TH.store` (localStorage תחת `TH.KEYS`) ובאותו קטלוג. בלי מסכים כפולים, בלי מסד נתונים חדש כשהקיים מספיק, ובלי דפים חדשים שחופפים לדפים קיימים.

## טבלת פערים לפי 9 השלבים

| # | יכולת | קיים היום (קובץ) | מה חסר |
|---|---|---|---|
| 1 | PWA: התקנה, אופליין, עדכון גרסה | אין manifest ואין service worker ב-master. מצב אימון כבר מציג טקסט במקום נגן כשאין רשת (`TH.isOnline`, `TH.mediaMarkup` ב-`js/core.js`) | הכול נמצא ב-**PR #551** (`manifest.json`, `icons/`, `sw.js`, `js/pwa.js`). זה קובץ תשתית חדש שאין לו מקבילה, והוא נוגע בדפים רק בשורות `<head>`. נשאר רק לעדכן את רשימת ה-PRECACHE בכל קובץ JS חדש |
| 2 | מודל נתונים מקומי ואחיד, גיבוי ושחזור | `TH.store` ו-`TH.KEYS` ב-`js/core.js`: `clients` (כולל `logs` מקוד TH1), `client_profiles` (ציוד ומגבלות, `js/profile.js`), `workouts`, `journal_entries` (`js/journal-storage.js` עם סטים, משקל ושיאים), `active_session` ו-`print`. pilot/feedback מייצאים JSON | **אין צורך ב-IndexedDB.** הנפח קטן ו-localStorage מספיק. חסרים: (א) ייצוא/ייבוא של כל מפתחות `TH.KEYS` לקובץ JSON מוצפן בסיסמה (AES-GCM + PBKDF2 ב-`crypto.subtle`), כשתי פונקציות ב-`js/core.js` וכפתור ב-`journal.html`; (ב) שדות `nickname`, `goal`, `level`, `days` ומדידות על רשומת הלקוח הקיימת. `js/journal-storage.js` לא נטען כרגע באף דף |
| 3 | מסך מתאמנים | `journal.html`: כרטיס לכל מתאמן, הוספה, ייבוא TH1, רשת 28 יום, אחוז התמדה, פתח כמתאמן, שיתוף, הדפסה, תזכורת והצע שבוע הבא | **לא יוצרים `clients.html`.** מרחיבים את `journal.html`: שדות מטרה, רמה, ציוד וימים בכרטיס (ציוד כבר קיים ב-`js/profile.js`), חיפוש וסינון ברשימה, וגרפי SVG קטנים של נפח, התמדה ושיפור. `buildProgressGraph` כבר קיים ב-`js/journal-storage.js` |
| 4 | פריודיזציה | `weekly.html`: תוכנית שבוע לפי מטרה (`GOAL_RX` ו-`generateWorkoutProgram` ב-`core.js`). `TH.suggestNextFromLog` משנה סטים לפי RPE ודילוגים. `js/analyzer.js` כבר מאזן דחיפה ומשיכה | חסרים: תוכנית של 4–12 שבועות עם עומס עולה ושבוע הקלה, התחשבות בכאב, איזון דחיפה/משיכה/רגליים לאורך השבוע, והסבר בעברית לכל החלטה. ייבנה כהרחבה של `suggestNextFromLog`/`generateWorkoutProgram` ב-`core.js` ובורר מספר שבועות ב-`weekly.html` |
| 5 | מצב אימון חי משודרג | `frontend/workout-mode.html`: טיימר לכל שלב, דילוג, חזרה, החלפה, סרטון, `js/session-tracker.js` (לא נטען) וסיכום TH1 | חסרים: רישום חזרות ומשקל לכל סט בזמן האימון, רטט וצליל בסוף מנוחה (`navigator.vibrate`/`AudioContext`), הקראה של התרגיל הבא (`speechSynthesis`, he-IL, עם מתג כיבוי) ושמירה ל-`journal_entries` |
| 6 | יומן ודוחות | `journal.html`: רשת 28 יום והתמדה. `js/journal-storage.js` (`getPersonalRecords`, `buildProgressGraph`) קיים אך לא מחובר לדף. `workout-print.html` לדף הדפסה ממותג | חסרים: heatmap חודשי בתוך `journal.html` (הרחבה של הרשת הקיימת), הצגת שיאים אישיים, מצב "דוח חודשי" ב-`workout-print.html` (בלי דף חדש) ותזכורות מקומיות עם Notification API. התזכורת הקיימת היא וואטסאפ בלבד |
| 7 | שיתוף למתאמן | קיים במלואו בסיסית: לינק `#TH.` (`encodeLink`/`decodeHash`), מסך מתאמן ב-workout-mode, קוד `TH1` (`encodeResult`) עם דקות, סטים, דילוגים, RPE כללי ותוכנית, ו-`wa.me` | חסרים: הרחבת TH1 תואמת לאחור (שדה אופציונלי של סטים, משקל ו-RPE לכל תרגיל, בלי לשבור v:1) וקוד QR ללינק. QR דורש מחולל קטן בלי ספרייה, בקובץ קיים או ב-`js/core.js` |
| 8 | סריקת שטח בלי AI | `site-scan.html` עם `js/site-profile.js`, `js/site-plan.js` ו-`js/site-scan.js`: צ'קליסט ידני, אזהרות לכל סכנה והסבר בעברית. `booklet.html` מכיל תבנית ריקה של תיק קבוצה (סקר שטח, טבלת סיכונים, תגובה לאירועים) | חסרים: מחשבון סיכונים (סבירות × חומרה) על בסיס הסכנות הקיימות בפרופיל, ומילוי אוטומטי של תבנית תיק הקבוצה מהחוברת לדף הדפסה, בתוך `site-scan.html`/`booklet.js` |
| 9 | E2E ונגישות | 1600+ בדיקות `node --test`, כולל בדיקות a11y סטטיות לכל דף (`*-a11y-ui.test.js`). ב-PR #551 יש Playwright ל-PWA בלבד | חסרים: E2E ב-Playwright לזרימה המלאה (journal: מתאמן ← weekly: תוכנית ← שיתוף ← workout-mode: ביצוע ← TH1 ← journal: הצע שבוע הבא) ובדיקות axe-core לדפים ששונו. axe ו-Playwright יהיו devDependencies מקומיים, וידלגו כשהם לא מותקנים |

## איך PR #551 (PWA) משתלב

- זה הפער היחיד שאין לו קוד קיים, ולכן הוא נשאר כקבצים חדשים: `sw.js`, `js/pwa.js`, `manifest.json` ו-`icons/`.
- הוא לא מוסיף מסך ולא נוגע ב-CSS. בכל דף נוספו 4 שורות ב-`<head>`.
- הוא משתמש באותו קטלוג ובאותם JSON-ים, ומאפשר להשתמש בכל הזרימות הקיימות אופליין (לינק מתאמן ומצב אימון נבדקו).
- כל הרחבה בהמשך שמוסיפה קובץ JS צריכה להוסיף אותו ל-`PRECACHE` ב-`sw.js`. `test/pwa.test.js` נכשל אם שוכחים.

## מה נעצר

- ענף `feat/store` (IndexedDB) נבנה חלקית ונשאר **מקומי בלבד**. הוא לא נדחף ולא ימשיך, כי `TH.store` הקיים מספיק.
- שלב 2 יתמקד רק בגיבוי מוצפן ובשדות לקוח נוספים, בתוך `js/core.js` ו-`journal.html`.

## סדר עבודה מוצע (רק הפערים)

1. גיבוי ושחזור מוצפן לכל `TH.KEYS` (`core.js` + `journal.html`) ושדות לקוח.
2. `journal.html`: חיפוש, סינון, גרפי SVG, heatmap ושיאים. מחברים את `js/journal-storage.js`.
3. `workout-mode`: רישום סטים ומשקל, רטט, צליל והקראה.
4. TH1 מורחב ו-QR.
5. פריודיזציה כהרחבה של `suggestNextFromLog` ו-`weekly.html`.
6. דוח חודשי ב-`workout-print.html` ותזכורות Notification.
7. מחשבון סיכונים ותיק קבוצה ב-`site-scan`.
8. E2E ו-axe.
