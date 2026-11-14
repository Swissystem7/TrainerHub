# Perplexity Computer task: מחקר מדעי לבניית TrainerHub
URL: https://www.perplexity.ai/session/7bb711b3-e0bf-4d0b-b735-b1464183ea4a
Captured 2026-11-14. Page shows 3 visible turns (older history of the thread not loaded; account hit usage limit, resets Nov 19 20:28).
Full research artifact: research-report.md (same dir). Artifact preview app: artifact-preview/ (index.html, app.css, index-live.html). Source URLs: sources.txt

## Turn 1 (assistant, 1m26s, 119 sources) — what a trainer sees on opening the live app
- Top nav with 13 links: בנה אימון, בונה שבועי, ספריית סרטונים, ספריית תרגילים, סריקת סביבה, תיק בטיחות, מדדי מילואים, מסלול כושר למילואים, יומן ביצוע, הצעה למאמנים, ניהול מאגר, טקסט לכרטיסייה, מצב אימון חי.
- Opening card "תגיד איזה אימון אתה רוצה", button "סרוק את השטח", 4 steps: כותבים ← מקבלים תוכנית ← מריצים ← פותחים כמתאמן. Banner: built in browser from real repo, no server, no guarantee of physical result.
- Request form, 3 tabs (build by request / paste existing workout / break down Drive video), free text "מה האימון?", time (default 20 min), equipment list, trainee count, "בנה אימון" + 4 ready examples.
- Where research fits: no trainee profile exists today. Proposed slices: (1) trainee profile step (waist circumference, WHR, est. body fat; WHO interpretation, no somatotype as plan determinant); (2) "התאמה אישית" section in every built workout incl. clarifying the spot-reduction myth; (3) cited knowledge base (ACSM 2026, ISSN, meta-analyses) matching the app's "rules with sources" approach.
- Asked: branch + PR on Swissystem7/TrainerHub with full UI slices and deterministic acceptance tests, or one visual example first?

## Turn 2 — user (8:30 PM): "תכין קודם דוגמה חזותית אחת לפיצ'ר ההתאמה האישית"
Assistant (3m15s, 100 sources): built a static visual example in TrainerHub's own design tokens (turquoise #00756A, orange #FF7A2F, Heebo, RTL). Artifact: "TrainerHub — התאמה אישית (דוגמה)".
- Arms workout from "אימון ידיים שישרוף שומן מהידיים, ביניים": 4 exercises with sets and rationale.
- "התאמה אישית למתאמן" section: waist 96 cm (above 94 men's threshold), WHR 0.94 (borderline), est. body fat ~22%, each with flag; WHO link.
- "What to focus on": ~10 sets/muscle/week, RIR 2–3, progression rule, protein 1.4–2.0 g/kg, sleep 7+ h; links ACSM 2026, ISSN, AASM.
- Orange myth box on spot reduction (meta-analysis + single-leg trial). Side panel "איך זה מחושב" with 5 sources. Checked desktop + 375px mobile; fixed bidi set numbers. Static sample data, not connected to real repo.
- Next steps offered: refine preview / publish permalink / real branch+PR.

## Turn 3 — user: "אתה לא אמור לרשום את הנתונים עם המחקרים אתה צריך להבין איזה סוג אימונים לפי הסוג גוף שיש לאדם הצורת גוף שלו תתאים לו יותר בשביל להגיע למטרה שלו"
Assistant (11m18s, 100 sources): rebuilt the example. Research now behind the scenes.
- Trainer profile entered once: height, weight, waist, hips, goal, experience, training days, equipment.
- Engine infers body shape from measures and chooses training type: example = strong build with abdominal fat → "כוח בסיסי + אירובי קצר": reps 8–12, rest 90 s, ~10 sets/muscle/week, 2 cardio sessions, 500 kcal deficit, full weekly schedule.
- Workout changes per profile: arms workout gets an 8-min interval cardio finisher labeled "נוסף בגלל צורת הגוף שלך". "על מה להתמקד היום": 3 plain-language points, no study names. Myth explained in one sentence.
- Side table for trainer: 4 body profiles → 4 training types (strength+cardio; hypertrophy only for lean; progressive loading for muscular; basics for beginners). Sources moved to one footnote.
- Asked whether to start real branch + PR with detection logic, deterministic tests per profile, hookup to existing output.

## Turn 4 — user (Thu Nov 12 9:07 PM): "אני לא אמרתי אבל לבנות אפליקציה חדשה אמרתי אמרתי להוסיף למה שקיים אני לא מבין את זה פשוט להוסיף שזה יהיה התאמה של מבנה גוף מה הבעיה בזה"
Assistant (4m37s): "כעת אחבר את המודול למנוע הקיים — ההתאמה משנה את המרשם שהמנוע כבר נותן, ומוסיפה את ההסבר לפלט." Then "Ran a command, edited a file" (tool steps collapsed, no details visible). Task stopped at usage limit: "הגעתם למגבלת השימוש שלכם ... יתאפס ב-19 בנובמבר בשעה 20:28 +0200".

## Artifacts (2)
1. "TrainerHub — התאמה אישית (דוגמה)" — HTML app preview; downloaded as ZIP → artifact-preview/
2. "TrainerHub: מבנה גוף, פיזור שומן והתאמת אימונים מבוססת מחקר" — research report (dated 12 Nov 2026) → research-report.md

## Links shown in chat
- https://swissystem7.github.io/TrainerHub/ (live site)
- https://iris.who.int/bitstream/handle/10665/44583/9789241501491_eng.pdf (WHO)
- https://journals.lww.com/acsm-msse/fulltext/2026/04000/american_college_of_sports_medicine_position.21.aspx (ACSM 2026)
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/ (ISSN)
- https://jcsm.aasm.org/doi/full/10.5664/jcsm.4758 (AASM)
- https://pdfs.semanticscholar.org/61f9/24900b4c2a023bb16822fd2a59abcde0c03b.pdf (spot-reduction meta-analysis)
Sources panel claims 610 total; not enumerated. Report-cited URLs: see sources.txt.
