# worker/site-scan — פרוקסי לסריקת שטח

Worker קטן ב-Cloudflare (תוכנית חינם) שמעביר 1–3 תמונות מהדף ל-Gemini vision ומחזיר את ה-JSON של המודל.
קיים כדי שמפתח ה-API **לא** יהיה בדפדפן ולא במאגר הציבורי: הוא Secret של ה-Worker.

הקוד כאן לא פרוס. **הפריסה והמפתח הם צעד של הבעלים** — השלבים למטה. בלי פריסה הפיצ'ר עובד במלואו
דרך הצ'קליסט הידני ("מה יש בשטח?"), בלי AI.

## חוזה

```
POST /  { "images": [ { "mime": "image/jpeg", "data": "<base64>" } ] }   // 1–3 תמונות
200 { "text": "<JSON של המודל כמו שהוא>" }
400 bad-json | images · 403 origin · 405 method · 413 too-large · 429 rate · 502 upstream | empty · 503 not-configured
```

הדף לא סומך על המודל: `THSiteProfile.parseAiResponse` (ב-`js/site-profile.js`) מאמת וחותך לסכימה, וכל תשובה
שאינה 200 מחזירה את המאמן לצ'קליסט הידני. אותו חוזה ואותו פרומפט ממש קיימים ב-`backend/site_scan.py`
לפיתוח מקומי (`tests/test_site_scan.py` מאמת שהפרומפטים זהים).

## פריסה (בעלים, פעם אחת)

```bash
npm install -g wrangler        # או npx wrangler
cd worker/site-scan
wrangler login
wrangler secret put GEMINI_API_KEY    # מדביקים את המפתח מ-https://aistudio.google.com/apikey
wrangler deploy
```

`wrangler deploy` מדפיס כתובת כמו `https://trainerhub-site-scan.<subdomain>.workers.dev`. מחברים אליה את הדף:

```html
<script>window.TH_SITE_SCAN_ENDPOINT = 'https://trainerhub-site-scan.<subdomain>.workers.dev';</script>
```

בדיקה מהירה (ה-Worker דורש `Origin` מורשה, לכן שולחים אותו ידנית):

```bash
curl -i -X POST https://trainerhub-site-scan.<subdomain>.workers.dev \
  -H 'Origin: https://swissystem7.github.io' -H 'Content-Type: application/json' \
  -d '{"images":[{"mime":"image/jpeg","data":"QUJD"}]}'
```

`503 not-configured` = המפתח לא הוגדר. `403 origin` = הכתובת שממנה נקראנו לא ברשימה.

## מה שמור ומה לא

* התמונות מועברות ל-Gemini ולא נשמרות: אין KV, אין D1, אין לוג של גוף הבקשה.
* CORS מוגבל ל-`https://swissystem7.github.io` ול-`http://localhost:*` לפיתוח. דומיין נוסף — `ALLOWED_ORIGINS`
  ב-`wrangler.toml` (מופרד בפסיקים), לא Secret.
* חסימת קצב: עד 6 בקשות לדקה לכל IP, בזיכרון ה-isolate. זה בלם לפרץ מהדף, לא הגנה גלובלית; החסם האמיתי
  על העלות הוא המדרגה החינמית של Gemini ושל Workers (100K בקשות ביום).
* מודל ברירת המחדל: `gemini-2.5-flash` (`GEMINI_MODEL` ב-`wrangler.toml` לשינוי).
* תוכנית חינם בלבד. אין להפעיל חיוב או credits.

## בדיקות

`npm test` מריץ את `test/site-scan-worker.test.js` מול הפונקציות כאן (אימות תמונות, CORS, חסימת קצב, מיפוי
שגיאות) עם `fetch` מוזרק — בלי רשת ובלי מפתח.
