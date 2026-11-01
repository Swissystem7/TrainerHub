# backend

שרת FastAPI אופציונלי לפענוח טקסט עם AI. GitHub Pages לא מריץ אותו — בדמו הציבורי רץ פענוח כללים בדפדפן.

`POST /api/site-scan` (סריקת שטח, לפיתוח מקומי): אותו חוזה ואותו פרומפט כמו `worker/site-scan`. דורש `GEMINI_API_KEY` בסביבה; בלעדיו מחזיר 503 והדף נשאר בצ'קליסט הידני. כדי לחבר את הדף: `window.TH_SITE_SCAN_ENDPOINT = 'http://localhost:8000/api/site-scan'`. התמונות לא נשמרות. בדיקות: `python -m unittest discover -s tests`.

`POST /api/environment-scan` (סריקת סביבה לאימון): מעביר את התמונה ל־`TH_VISION_ENDPOINT` ומחזיר JSON של סביבה ותגיות ציוד. בלי הכתובת מחזיר 503, ודף `scan.html` מזהה בדפדפן (COCO-SSD) או לפי צ'יפים ידניים. ההתאמה לתרגילים נשארת בדפדפן (`js/scan-match.js`) כדי שתהיה קבועה. התמונה לא נשמרת.
