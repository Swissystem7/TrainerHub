# TrainerHub: השלמת הפערים במפרט ההתאמה האישית (Perplexity)

- מקור: חיפוש Perplexity Pro רגיל, 16.11.2026
- מטרה: המשך למחקר ההרכב הגופני. החיפוש עונה על הפערים שסומנו ב-⚠️ ב-personalization-spec.md (PR #720): זמני מנוחה, אחוזי 1RM/RIR, ספי אחוזי שומן, התאמות לפי גיל, פציעות, אימון אחד בשבוע וגירעון של 500 קק"ל.
- הערה: הטקסט נשמר כפי שהועתק מהעמוד, והטבלאות שוטחו.

```text
Perplexity (regular Search, Pro) - TrainerHub research
Thread URL: https://www.perplexity.ai/session/aa3e7edd-908b-4a3d-8b04-3c0fadf6916e
Date: 2026-11-16

QUESTION:
For a research-based personalized training app, give evidence-based guidance with sources on: (1) rest periods between sets for strength vs hypertrophy; (2) %1RM / RIR load ranges for hypertrophy and for beginners; (3) body-fat percentage thresholds (men/women) used to choose between fat-loss, recomposition and muscle-gain phases; (4) age-specific training dose adjustments (adolescents, 40+, 60+); (5) common injury/pain modifications (lower back, knee, shoulder) and when to refer to a professional; (6) what a 1-day-per-week full-body program can achieve; (7) whether a fixed 500 kcal/day deficit is appropriate vs percentage-based deficits and safe rates of weight loss. Prefer meta-analyses, ACSM/NSCA position stands.

ANSWER (verbatim, page text; tables flattened with tabs; inline citation labels as rendered):

For the app, use adjustable starting ranges—not rigid “optimal” values—and separate research findings from implementation choices. The strongest support is for progressive resistance training, adequate weekly volume, heavier loads when maximal strength is the priority, and individualization. Evidence does not support automatic cut/bulk decisions from body-fat percentage, a mandatory training-volume reduction at age 40, or a universal 500 kcal/day deficit. The updated ACSM position stand is a useful foundation: it synthesizes 137 systematic reviews involving more than 30,000 participants, primarily healthy adults.
pmc.ncbi.nlm.nih

Below, “app default” means a reasonable implementation of the evidence, not a precisely validated biological threshold.

1. Rest periods between sets: strength versus hypertrophy
Goal	Suggested app default	Interpretation
Maximal strength, especially heavy multijoint exercises	3 minutes; allow 3–5 minutes when needed	Prioritize recovery sufficient to reproduce the intended load, repetitions, and technique. Longer rests are a practical performance tool, not a requirement that every strength set needs five minutes.
Hypertrophy, demanding multijoint exercises	2 minutes; adjustable to 2–3+ minutes	Do not shorten rest simply to increase burning, sweating, or breathlessness.
Hypertrophy, smaller isolation exercises	90–120 seconds; extend if performance deteriorates	Shorter rests can work, but should not unnecessarily compromise subsequent sets.

These are programming defaults rather than proven optimal cutoffs. The ACSM 2026 synthesis found no consistent strength advantage across the rest-duration comparisons reviewed and insufficient evidence to establish a definitive hypertrophy optimum. Singer et al.’s 2024 meta-analysis—nine studies—suggested a small hypertrophy advantage for rests longer than 60 seconds, but did not detect appreciable additional benefit beyond 90 seconds; uncertainty was substantial. Neither finding proves that 90 seconds always provides sufficient recovery after demanding compound exercises.
pmc.ncbi.nlm.nih
+1

App implementation: provide an “extend rest” option and adjust rest using the user’s ability to repeat the prescribed work, rather than enforcing a countdown regardless of recovery.

2. %1RM and RIR: hypertrophy and beginners

1RM means the maximum load lifted once in a particular exercise. RIR means repetitions in reserve: the estimated number of additional repetitions possible before muscular failure. Load and proximity to failure are separate prescription variables.
link.springer
+1

Population or goal	Practical load range	Practical effort target
Hypertrophy: broad effective range	Approximately 30–85% 1RM is a useful working range; it is not an exclusive effective zone	Usually finish around 1–3 RIR; very light loads generally require greater effort to provide a meaningful stimulus
Hypertrophy: convenient default	Approximately 60–80% 1RM, often roughly 6–15 repetitions	Around 2 RIR, adjusted for exercise and experience
Beginner: initial learning	Light-to-moderate loads; approximately 40–60% of estimated 1RM may be a conservative familiarization choice	Stop comfortably before failure; approximately 3–4 RIR is an implementation choice
Beginner: established technique	Approximately 60–70% 1RM, commonly 8–12 repetitions	Progress toward approximately 2–3 RIR as control and confidence improve

The broad hypertrophy range follows evidence that muscle growth is possible across widely varying loads; the 2026 ACSM review found no consistent hypertrophy advantage from heavier loading within the studied ranges. In contrast, loads of at least approximately 80% 1RM better support maximal-strength development. The older ACSM 2009 stand specifically recommended 60–70% 1RM for novice-to-intermediate strength training. The narrower defaults and beginner familiarization targets above are practical choices, not uniquely superior prescriptions.
pmc.ncbi.nlm.nih
+1

How close to failure?

A 2024 exploratory meta-regression associated closer proximity to failure with greater hypertrophy, but not clearly greater strength gains. Its RIR values were estimated from study descriptions, so it cannot establish an exact optimum such as “2 RIR.” Separately, systematic-review evidence does not show that reaching momentary failure is necessary or reliably superior.
link.springer
+1

For the app:

Default to stopping short of failure rather than requiring it.

Avoid turning a given %1RM into an exact repetition or RIR prediction.

Let completed repetitions, technique, and reported effort refine the next prescription.

Do not require a true maximal test merely to generate a beginner’s program.

These choices implement the evidence without treating uncertain effort estimates as precise measurements.
link.springer
+1

3. Body-fat thresholds for fat loss, recomposition, or muscle gain

There are no well-validated male/female body-fat cutoffs that determine when someone should cut, recompose, or gain weight. A sports body-composition best-practice review found no unique body-composition cutoff conferring a performance advantage and cautioned against overstating its importance. That is not a direct trial of cut/bulk algorithms, but it does not support presenting such thresholds as established science.
pubmed.ncbi.nlm.nih

Commonly encountered rule	Evidence-based interpretation
“Men should cut above 15%; women above 25%”	A coaching convention, not an ACSM/NSCA-validated treatment threshold
“Men must reach 10–12%; women 18–20% before gaining”	Not an evidence-based prerequisite for muscle gain
“Recomposition only works above a particular body-fat percentage”	No validated threshold establishes eligibility

The 15%/25% and 10%/20% rules appear in popular coaching advice, but should not be promoted to the status of clinical or physiological boundaries.
legionathletics

Better app decision logic

Use a goal-led decision process rather than a sex-specific body-fat switch:

Fat-loss phase: an explicit weight/fat-loss goal or a professionally identified health reason, with resistance training to support lean-mass retention.

Recomposition-oriented phase: maintaining approximately stable weight, or using a conservative deficit, while prioritizing progressive training and monitoring waist, strength, and weight trends.

Muscle-gain phase: muscle growth is the main priority; avoid automatically imposing a deficit, because energy deficiency reduces average lean-mass gains.
pubmed.ncbi.nlm.nih
+1

These are proposed product categories, not validated diagnostic classifications. Body-fat estimates can inform the discussion, but the app should not say, for example, “25.1% means you must cut.”

4. Age-specific dose adjustments
Adolescents

The NSCA youth position statement emphasizes qualified instruction, supervision, technique, and gradual progression. Its general prescription includes:

2–3 sessions per week on nonconsecutive days.

Initially light loads.

1–3 sets of 6–15 repetitions for upper- and lower-body strength exercises.

Gradual resistance increases, commonly 5–10% as strength improves.

A 5–10-minute dynamic warm-up.
nsca

App default: use a technique-first youth pathway rather than a reduced-size adult bodybuilding program. Do not make unsupervised failure training or aggressive load progression the default. Supervision and exercise competence matter more than simply assigning a teenage age band.
nsca

Adults aged 40–59

There is no evidence-based rule to reduce loads or sets by a fixed percentage at age 40. The ACSM adult recommendations span adulthood; the review did not derive an age-40 dose breakpoint.
pmc.ncbi.nlm.nih

App default: retain the normal adult framework, then individualize using training history, recent inactivity, symptoms, medical conditions, and recovery. “40+” should trigger relevant screening questions—not an automatic low-intensity program.

Adults aged 60+

The NSCA older-adult position statement recommends working toward:

2–3 resistance-training sessions per week.

2–3 sets, with 1–2 multijoint exercises per major muscle group.

Approximately 70–85% 1RM when appropriate and tolerated.

Power work using approximately 40–60% 1RM with a fast intended lifting phase.

Lower initial doses for beginners and people with frailty, including starting with one set and progressing.
nsca

App default: distinguish a healthy, experienced 65-year-old from an inactive person with frailty. Older age alone is not a reason to prescribe only very light weights; frailty, disease, falls risk, and functional limitations require a different level of individualization.
nsca

5. Lower-back, knee, and shoulder pain: modifications and referral

The app should offer symptom-sensitive exercise adjustments, not diagnose an injury from its location. Exercise is supported for nonspecific low-back pain, knee osteoarthritis, and rotator-cuff tendinopathy, but these are distinct conditions—not explanations for every painful back, knee, or shoulder.
nice
+2

Conservative modification options

The substitutions below are examples to trial, not proven treatments for every diagnosis.

Region	Possible adjustments	Important limitation
Lower back	Reduce load, sets, or provoking range; trial a supported row instead of an unsupported bent-over row, or a tolerable squat/hinge variation	Encourage tolerable activity rather than blanket bed rest or permanent avoidance. NICE recommends exercise selected around needs and capabilities. 
nice

Knee	Reduce depth, resistance, or impact temporarily; trial a tolerable squat-to-box, sit-to-stand, or machine variation; rebuild loading progressively	For osteoarthritis, initial discomfort can occur and does not automatically mean harm. This does not establish that new traumatic knee pain is safe to train through. 
nice.org

Shoulder	Reduce load or provoking range; trial a different grip, pressing angle, or supported variation; continue tolerable strengthening	The 2025 rotator-cuff guideline supports active rehabilitation with motor-control and/or resistance exercise, but does not identify one universally best exercise or load. 
jospt

Avoid coding one universal rule such as “pain up to 5/10 is always safe.” A numerical threshold cannot replace the history, diagnosis, symptom trajectory, and functional assessment emphasized in clinical guidelines.
nice.org
+1

For an app, a conservative monitoring policy is to reduce or stop the provoking exercise when pain escalates, movement becomes substantially altered, swelling appears, or symptoms/function remain worse afterward. Label that as a safety policy, not a validated all-condition algorithm.

When to refer
Urgency	Examples
Emergency assessment	Back pain with new bladder dysfunction, altered saddle/genital sensation, or major/progressive neurological deficit. Do not wait for complete incontinence. 
pmc.ncbi.nlm.nih
+1

Urgent assessment	Significant trauma, suspected fracture/dislocation, inability to bear weight or use the limb, rapidly developing major swelling, or a hot swollen joint with fever/systemic illness. 
nice.org
+1

Prompt clinician/physiotherapist review	Recurrent or worsening pain, persistent swelling, meaningful weakness or loss of motion, symptoms limiting everyday activities, or symptoms not improving with sensible modification. 
jospt
+1

Medical assessment for possible systemic cause	Unexplained weight loss, fever/night sweats, relevant cancer history, or other concerning features accompanying pain. 
cks.nice
+1

A referral should not necessarily prohibit all exercise; it should prevent the app from independently managing a potentially significant condition.

6. What can one full-body session per week achieve?

One weekly session can improve strength and muscle size; it is not merely a maintenance option. However, two or more weekly sessions remain the usual recommendation, and make it easier to distribute volume and practice exercises. The ACSM review found that higher frequency supports strength, whereas hypertrophy differences are generally small or absent when weekly volume is matched.
pmc.ncbi.nlm.nih

A strength-frequency meta-analysis similarly found little independent frequency effect when volume was equated. This does not mean a short once-weekly session equals a higher-volume multiday program.
pmc.ncbi.nlm.nih

A reasonable one-day starting template

For a screened, healthy adult, an app could offer:

Movement	Example	Working sets
Knee-dominant	Squat or leg press	2–3
Hip-dominant	Romanian deadlift or hip thrust	2
Upper-body push	Chest press or push-up	2–3
Upper-body pull	Row or pulldown	2–3
Optional accessory	Calves, arms, trunk, or another priority	1–2 each

Use manageable loads, stop short of failure, and progress gradually. This is an illustrative minimum-dose program—not a trial-validated exact package. Multiple sets and progressive loading are supported by the adult evidence.
pmc.ncbi.nlm.nih

Expected positioning in the app:

“A useful starting dose with potential for real progress.”

Not “one-third as effective as three days”—the relationship is not a simple fraction.

Not “equivalent to an optimized multiday hypertrophy plan.”

Approximately 10 or more sets per muscle per week can enhance hypertrophy, but this is an optimization finding, not a minimum required to grow. Trying to compress that volume for every muscle into a beginner’s single session is unnecessary.
pmc.ncbi.nlm.nih

7. Fixed 500 kcal/day deficit versus percentage-based deficits

A fixed 500 kcal/day deficit is not universally appropriate. It represents 25% of a 2,000-kcal maintenance requirement but only 12.5% of a 4,000-kcal requirement. Percentage-based prescriptions scale better across energy requirements, but neither method replaces monitoring actual outcomes.

For preserving muscle during fat loss, a commonly cited target is approximately 0.5–1.0% of body weight per week, with more conservative rates as the individual becomes leaner. These recommendations come substantially from physique/sports nutrition literature; they are not a universal safety guarantee for every population.
pubmed.ncbi.nlm.nih
+1

Suggested app approach
Situation	Proposed starting policy
General adult fat-loss goal	Start around 10–20% below estimated maintenance; adjust using observed trends
Lean, trained user prioritizing performance and muscle retention	Start toward the smaller end; a slower rate such as 0.25–0.5% per week may be a conservative product choice
Higher adiposity with a fat-loss priority	Approximately 0.5–1% per week can be a working target, subject to health status and tolerance
Muscle-gain priority	Do not automatically assign a deficit; use approximately maintenance or a modest surplus according to progress

The percentage bands are implementation defaults, not proof that percentage-based deficits outperform fixed deficits in head-to-head trials. The evidence more directly supports controlling the rate of loss, being more conservative when lean, and avoiding excessive restriction when lean-mass gain is the priority.
pubmed.ncbi.nlm.nih
+1

What does the “500 kcal” meta-analysis actually show?

Murphy and Koehler’s meta-analysis found that energy deficiency impaired lean-mass gains from resistance training, while strength gains were not clearly impaired. Their meta-regression estimated that an approximately 500 kcal/day deficit prevented average lean-mass gains.
pubmed.ncbi.nlm.nih

That does not establish that:

499 kcal/day preserves everyone’s muscle;

501 kcal/day causes muscle loss;

preventing muscle gain is the same as losing existing muscle;

recomposition is impossible for an individual in a deficit.

It is a group-level estimate, not a personal metabolic threshold.
pubmed.ncbi.nlm.nih

App implementation: evaluate weight trends over several weeks alongside performance, recovery, and adherence; avoid promising that a nominal 500-kcal deficit always produces a fixed weekly loss. Static calorie-to-weight predictions ignore adaptation and changes in the composition of weight lost.
mdpi

Recommended evidence architecture for the app

For each rule, store its provenance and status:

Research finding: for example, heavier loads favor maximal-strength gains.

Professional guideline: for example, supervised, technique-first youth training.

App default: for example, a 120-second hypertrophy rest timer.

Safety policy: for example, disabling automated progression after a concerning pain report.

Unvalidated heuristic: for example, assigning a cutting phase from a male/female body-fat cutoff.

This distinction lets the product be genuinely research-based without implying that every number in its algorithm has been directly validated. The central evidence supports flexible, progressive programming—not false precision.
pmc.ncbi.nlm.nih

(59 sources)

SOURCES (Links tab, 59 links; all unique):
https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/
https://pmc.ncbi.nlm.nih.gov/articles/PMC11349676/
https://link.springer.com/article/10.1007/s40279-024-02069-2
https://www.ovid.com/jnls/acsm-msse/fulltext/10.1249/mss.0b013e3181915670~progression-models-in-resistance-training-for-healthy-adults
https://pmc.ncbi.nlm.nih.gov/articles/PMC9935748/
https://pubmed.ncbi.nlm.nih.gov/37752006/
https://legionathletics.com/cut-or-bulk-podcast/
https://www.mdpi.com/2072-6643/13/9/3255
https://pubmed.ncbi.nlm.nih.gov/34623696/
https://www.nsca.com/globalassets/about/position-statements/position_stand_youth_resistance_training---2009.pdf
https://www.nsca.com/contentassets/2a4112fb355a4a48853bbafbe070fb8e/resistance_training_for_older_adults__position.1.pdf
https://www.nice.org.uk/guidance/ng59/resources/low-back-pain-and-sciatica-in-over-16s-assessment-and-management-pdf-1837521693637
https://www.nice.org.uk/guidance/ng226/chapter/Recommendations
https://www.jospt.org/doi/pdf/10.2519/jospt.2025.13182
https://pmc.ncbi.nlm.nih.gov/articles/PMC12729032/
https://pain-management-cme.nejm.org/wp-content/uploads/2023/10/back-pain-algorithm.pdf
https://www.wpxi.com/contributor/understanding-signs/HLLEZCLSRQ6JXGILOXOXBSNOWQ/
https://cks.nice.org.uk/topics/chronic-pain/diagnosis/red-flag-signs-symptoms/
https://pmc.ncbi.nlm.nih.gov/articles/PMC8363540/
https://pubmed.ncbi.nlm.nih.gov/24864135/
https://acsm.org/resistance-training-guidelines-update-2026/
https://www.acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/
https://www.lunazone.com/blogs/posts/how-long-should-you-rest-between-sets
https://www.hotasanayogastudio.com/blog/acsm-strength-training-guidelines-2026
https://www.scribd.com/document/982766704/Attarieh-Et-Al-2026
https://www.menshealth.com/uk/building-muscle/train-smarter/a74373203/acsm-resistance-training-guidelines/
https://nutrola.app/en/blog/5-studies-that-changed-body-recomposition-advice-2026
https://waltersport.com/wp-content/uploads/2026/01/Expert-Consensus-on-Weight-Management-Strategies-for-Strength-and-Physique-Athletes-Before-and-After-Competition-Buechel-et-al.-2025.pdf
https://www.omnia-performance.com/blog/should-you-cut-or-bulk/
https://liftbigeatbig.com/body-recomposition-myth-study/
https://www.medrxiv.org/content/10.64898/2026.10.07.26365015v3.full
https://www.medrxiv.org/content/medrxiv/early/2026/10/17/2026.10.07.26365015.full.pdf
https://www.nsca.com/about-us/position-statements/
https://www.nsca.com/media-room/press-releases/nsca-position-statement-on-resistance-training-for-older-adults/
https://doctorjesss.substack.com/p/the-30-minute-strength-routine-for
https://www.katabolic.com/guides/how-to-cut-without-losing-muscle
https://www.studocu.com/en-us/document/the-ohio-state-university/lifetime-fitness-programs-weight-training/resistance-training-for-older-adults-nsca-position-statement-2019/140402606
https://athletebody.jp/wp-content/uploads/2014/07/Natural-BB-Contest-Prep-Recommendations.pdf
https://www.sciencedaily.com/releases/2019/07/190725162305.htm
https://www.nice.org.uk/guidance/ng59
https://cks.nice.org.uk/topics/back-pain-low-without-radiculopathy/diagnosis/assessment/
https://journals.sagepub.com/doi/10.1177/19417381261438760?int.sj-full-text.similar-articles.3
https://sci-sport.com/en/impact-of-energy-deficiency-on-resistance-training-gains/
https://examine.com/research-feed/study/9KGMB9/
https://www.guidelinecentral.com/insights/aug-2026-nice-lowbackpainsciaticaover16-guideline-spotlight/
https://www.strongerbyscience.com/master-list/muscle-growth/
https://www.linkedin.com/posts/ray-mc-kenna-b87941bb_murphy-koehler-2021-energy-deficiency-activity-7468988709120651264-neEK
https://evidenzbasis.dev/en/calorie-deficit/
https://www.scimex.org/newsfeed/tread-carefully-before-rushing-to-scan-your-dodgy-knee
https://www.medicinenet.com/osteoarthritis_knee_exercises_pictures_slideshow/article.htm
https://www.mendeley.com/catalogue/125511aa-e6e6-3c95-862e-570f0fd3dfbf/
https://www.ideafit.com/progression-models-in-resistance-training-for-healthy-adults/
https://www.bisp-surf.de/Record/ftdoajarticles:oai:doaj.org%2Farticle:18363f4031e0487793db2084bee23f38/Reference
https://tourniquets.org/wp-content/uploads/PDFs/ACSM-Progression-models-in-resistance-training-for-healthy-adults-2009.pdf
https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full
http://www.economictimes.indiatimes.com/magazines/panache/trying-to-walk-10000-steps-every-day-dont-ignore-these-warning-signs-from-your-knees/printarticle/133630355.cms
https://www.academia.edu/56652185/American_College_of_Sports_Medicine_position_stand_Progression_models_in_resistance_training_for_healthy_adults
http://www.economictimes.indiatimes.com/magazines/panache/struggling-with-knee-pain-new-study-says-the-cure-starts-with-movement-not-rest-try-these-exercises-to-ease-pain-within-weeks/printarticle/124743801.cms
https://www.sciencedaily.com/releases/2026/04/260430032411.htm

```
