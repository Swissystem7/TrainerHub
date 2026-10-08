# backend

שרת FastAPI אופציונלי לפענוח טקסט עם AI. GitHub Pages לא מריץ אותו — בדמו הציבורי רץ פענוח כללים בדפדפן.

`POST /api/site-scan` (סריקת שטח, לפיתוח מקומי): אותו חוזה ואותו פרומפט כמו `worker/site-scan`. דורש `GEMINI_API_KEY` בסביבה; בלעדיו מחזיר 503 והדף נשאר בצ'קליסט הידני. כדי לחבר את הדף: `window.TH_SITE_SCAN_ENDPOINT = 'http://localhost:8000/api/site-scan'`. התמונות לא נשמרות. בדיקות: `python -m unittest discover -s tests`.
