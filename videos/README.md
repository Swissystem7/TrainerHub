# ספריית סרטוני תרגיל

רוב הקליפים **לא בריפו** (גודל + פרטיות). בתיקייה הזו יש 7 קבצי mp4 לדוגמה (`פלאנק`, `בטן`, `מטפס הרים`, `גב תחתון`, `חימום`, `מדרגות`, `מתח אוסטרלי`). שאר 71 הרשומות ב־`js/catalog.json` דורשות העתקה מתיקיית המקור. יש שני מקורות מאחורי שכבת lookup אחת ב־`js/core.js`:

- מקומי: [`js/catalog.json`](../js/catalog.json) — `{id, he, muscles, equipment, level, file, source:"local"}`.
- דרייב: [`drive-catalog.json`](./drive-catalog.json) — `{id, driveId, he, muscles, equipment, level, source:"drive", folder}`. 44 סרטונים משותפים כ-anyone/reader, נגן: `https://drive.google.com/file/d/{id}/preview`.

הוספת סרטון דרייב = שורה חדשה ב־JSON (או דרך מסך «ניהול מאגר»). בלי שינוי קוד.

## איפה הקבצים באמת

ספריית המקור (מחוץ לריפו, לא להעלות):

`C:\Users\avira\migration-review\claude-node\trainerhub\videos`

שם הם מסודרים לפי תיקיות נושא (`בטן`, `רגליים`, `קונוסים` וכו׳). הקטלוג שומר רק את **שם הקובץ**.

## איך לשים קבצים מקומית (drop-in)

1. העתק לתיקייה הזו (`videos/`) את קבצי ה־mp4 ששמם מופיע בשדה `file` ב־`js/catalog.json`.
2. מצב האימון והספרייה (`library.html`) טוענים `videos/<file>` דרך `js/core.js` (`TH.catalogSrc`).
3. אפשר גם להגיש את התיקייה הזו יחד עם שאר האתר (`python -m http.server` משורש הריפו, או כל שרת סטטי).
4. לינק לקליפ בודד: `workout-mode.html#CLIP.…` — בלי שם קובץ בכתובת. הממשק מציג רק את `he`, לא את `file`.

בלי הקבצים כאן הנגן לא מציג אלמנט וידאו שבור: אם אין מיפוי — אין `<video>`; אם הקובץ חסר בשרת — האלמנט מוסר ב־`onerror`.

## מה לא נכנס לקטלוג

- קליפים אנונימיים: `VID_*` ושם-hash של וואטסאפ. ששת ה-VID_* מהדרייב נשארים מחוץ ל־`drive-catalog.json`.
- שם אדם או קבוצה בשם הקובץ (למשל מאמן, «נערים א ארצית»).
- שמות מספריים בלבד (`1.mp4`, `2.mp4`) — אין שם תרגיל.

המזהים `plank`, `mountain_climber`, `crunches`, `step_up`, `bodyweight_row`, `superman` (ו־`warmup`) תואמים למנוע התוכנית כשיש קליפ עם אותו שם עברי / שם נרדף מקובל. תרגיל בלי קליפ רץ כרגיל בלי וידאו.
