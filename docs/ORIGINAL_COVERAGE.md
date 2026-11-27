# Original clip coverage

Updated 27 Nov 2026 after visual QA and a second pass on the six former mismatches. Five were regenerated and published again. `07-HIIT-10` stays the original shuttle run and is published as its own exercise. The app plays a Meta AI clip on an existing catalog id only when that clip is the same movement. Instagram, YouTube, and other third-party media stay in the catalog as reference and render **הסרטון יעלה בקרוב**.

## Counts

| | |
|---|---:|
| Meta AI originals published | 107 |
| Mismatch clips still withheld | 0 |
| Existing catalog ids that play an original | 50 |
| Library cards whose player is that original | 44 |
| Catalog ids unmapped back to the placeholder | 33 |
| Exercises on the placeholder | 581 |
| TrainerHub-owned clips with no Meta AI original | 65 |
| Covered ids whose Hebrew title still differs, same movement | 29 |

Playback is `https://swissystem7.github.io/TrainerHub-media/<folder>/<id>.mp4`, then jsDelivr `@v4`. `@v4` includes the five regenerated files and the shuttle run. None of these six is mapped to another catalog id: the chest opener, plank flow, wrestler core, side-lying crunch, and cone stations are their own exercises, and `ריצת שאטל` has no source reel.

## Restored clips

- `E01-06` «פתיחת חזה וכתפיים בעמידה» — dynamic standing chest opener. Partial against the static posture source, so it is not mapped to the doorway chest stretches.
- `05-08` «אימון בטן 3 דקות» — forearm, high, and side plank flow. Not mapped onto a single plank id.
- `E04-09` «ליבה של מתאבק» — seated wrestler core. No same-movement catalog id.
- `E04-10` «אלכסונים עם משקולת» — side-lying dumbbell oblique crunch. Not mapped to a standing side bend.
- `07-06` «תחנות עם קונוסים» — cone stations (plank, then sit-ups), filed under `full/` (גוף מלא HIIT). `קונוסים_תחנות` was not confirmed as this same station sequence, so it stays unmapped.
- `07-HIIT-10` «ריצת שאטל» — the original shuttle run, published as a no-source standalone in `cardio/`. Mapped to nothing.

## Unmapped back to the placeholder

The original remains its own exercise. The catalog id no longer plays that clip. Of these 33 ids, 19 show the placeholder, 5 already have a separate TrainerHub-owned file and play that file (`superman`, `בטן_זוגות`, `זוגות_בטן`, `בטן_כדור_כדורסל`, `גומיות_בטן`), and 9 are not a live library card.

- `yt_military_press` «לחיצה צבאית מעל הראש (Military Press)» was `E01-01` «לחיצת כתפיים». Dumbbell overhead press; military press is a barbell variation.
- `yt_cable_face_pull` «פייס פול בכבל» was `E01-05` «משיכת פנים». No source reel to confirm the face pull against the cable-face-pull id.
- `dumbbell_bench` «לחיצת חזה משקולות» was `E02-11` «לחיצת חזה». Bench press clip; the dumbbell-bench id is a different implement.
- `yt_rdl_db` «דדליפט רומני עם משקולות» was `E03-01` «דדליפט רומני». Barbell Romanian deadlift; the catalog row is with dumbbells.
- `drive_חתירת_מוט_בכפיפה` «חתירת מוט בכפיפה» was `E03-02` «חתירה בהטיה». Generic bent-over row; this id is specifically a barbell row.
- `drive_חתירת_קטלבל_בכפיפה` «חתירת קטלבל בכפיפה» was `E03-02` «חתירה בהטיה». Generic bent-over row; this id is specifically a kettlebell row.
- `superman` «גב תחתון» was `E03-05` «סופרמן». Superman; the catalog row is titled lower back, not this drill.
- `drive_דיפס_על_ספסל_לילדים` «דיפס על ספסל לילדים» was `04-13` «דיפס על ספסל». Adult bench dip; the catalog row is the kids variation.
- `drive_דד_באג_עם_משקולות` «דד באג עם משקולות» was `05-06` «דד באג». Unweighted dead bug; the catalog row adds dumbbells.
- `drive_בטן_זוגות` «בטן זוגות» was `05-09` «בטן בזוגות». Partner sit-ups with a high-five, not the partner-abs / partner-plank rows.
- `drive_בטן_זוגות_2` «בטן זוגות» was `05-09` «בטן בזוגות». Partner sit-ups with a high-five, not the partner-abs / partner-plank rows.
- `בטן_זוגות` «בטן זוגות» was `05-09` «בטן בזוגות». Partner sit-ups with a high-five, not the partner-abs / partner-plank rows.
- `בטן_זוגות_2` «בטן זוגות» was `05-09` «בטן בזוגות». Partner sit-ups with a high-five, not the partner-abs / partner-plank rows.
- `זוגות_בטן` «זוגות בטן» was `05-09` «בטן בזוגות». Partner sit-ups with a high-five, not the partner-abs / partner-plank rows.
- `drive_בטן_עם_כדור` «בטן עם כדור» was `05-G02` «בטן עם כדור». Stability-ball crunch, not medicine-ball or basketball abs.
- `בטן_עם_כדור` «בטן עם כדור» was `05-G02` «בטן עם כדור». Stability-ball crunch, not medicine-ball or basketball abs.
- `drive_בטן_כדור_כדורסל` «בטן כדור כדורסל» was `05-G02` «בטן עם כדור». Stability-ball crunch, not medicine-ball or basketball abs.
- `בטן_כדור_כדורסל` «בטן כדור כדורסל» was `05-G02` «בטן עם כדור». Stability-ball crunch, not medicine-ball or basketball abs.
- `drive_בטן_גומיות` «בטן גומיות» was `05-G03` «בטן עם גומיות». Floor band crunch, not the stability-ball band core rows.
- `בטן_גומיות` «בטן גומיות» was `05-G03` «בטן עם גומיות». Floor band crunch, not the stability-ball band core rows.
- `drive_גומיות_בטן` «גומיות בטן» was `05-G03` «בטן עם גומיות». Floor band crunch, not the stability-ball band core rows.
- `drive_גומיות_בטן_2` «גומיות בטן» was `05-G03` «בטן עם גומיות». Floor band crunch, not the stability-ball band core rows.
- `גומיות_בטן` «גומיות בטן» was `05-G03` «בטן עם גומיות». Floor band crunch, not the stability-ball band core rows.
- `glute_bridge` «גשר ישבן» was `E04-04` «גשר אגן». No source reel to confirm the glute bridge against the catalog id.
- `drive_טוויסט_רוסי_עם_כדורסל` «טוויסט רוסי עם כדורסל» was `E04-11` «רוסי טוויסט». Russian twist with a weight; this id uses a basketball.
- `dumbbell_step_up` «עליית מדרגה עם משקולות» was `06-07` «עלייה למדרגה למתחילים». Beginner step-up; the catalog row is a dumbbell step-up.
- `drive_מדרגות` «מדרגות» was `06-08` «מדרגות». Staircase climbing, not the step-box / step-up rows.
- `step_up` «מדרגות» was `06-08` «מדרגות». Staircase climbing, not the step-box / step-up rows.
- `yt_kids_burpees` «ברפי לילדים» was `07-02` «ברפי HIIT קלאסי». Adult burpee; the catalog row is the kids variation.
- `yt_kids_pull_ups` «עליות מתח לילדים» was `07-04` «מתח במעגל קבוצתי». Adult pull-up; the catalog row is the kids variation.
- `drive_סקוואט_קפיצה_עם_משקולות` «סקוואט קפיצה עם משקולות» was `07-HIIT-04` «סקוואט קפיצה». Bodyweight jump squat; the catalog row uses dumbbells.
- `yt_goblet_squat` «סקוואט גביע עם משקולת» was `07-HIIT-08` «סקוואט גובלט עם קטלבל». Kettlebell goblet squat; the catalog row is a dumbbell goblet squat.
- `ig-DdthU1EtHnN` «ig-DdthU1EtHnN» was `E04-08` «טפיחות לימפטיות». No catalog name for this reel id, so it is not the same drill.

## Kept despite a different Hebrew title

Same movement. Wording, a technique suffix, or a translation differs.

- `drive_שכיבות_סמיכה_בטכניקה_נכונה` «שכיבות סמיכה בטכניקה נכונה» plays `metaai-04-10-3` «שלב 3 שכיבות מלאות מהרצפה»
- `drive_שכיבות_סמיכה_עם_הפעלת_חזה` «שכיבות סמיכה עם הפעלת חזה» plays `metaai-04-10-3` «שלב 3 שכיבות מלאות מהרצפה»
- `drive_מתח_מושלם_-_טכניקה` «מתח מושלם - טכניקה» plays `metaai-04-01` «מתח מושלם טכניקה»
- `drive_חתירה_ביד_אחת_עם_משקולת` «חתירה ביד אחת עם משקולת» plays `metaai-e03-03` «חתירה יד אחת»
- `drive_שכיבות_סמיכה_פייק_-_מיקום_ידיים` «שכיבות סמיכה פייק - מיקום ידיים» plays `metaai-04-12` «שכיבות פייק»
- `drive_שכיבות_סמיכה_פייק_-_הדרכה_מונפשת` «שכיבות סמיכה פייק - הדרכה מונפשת» plays `metaai-04-12` «שכיבות פייק»
- `drive_דיפס_על_ספסל_-_הדרכה_מונפשת` «דיפס על ספסל - הדרכה מונפשת» plays `metaai-04-13` «דיפס על ספסל»
- `drive_סקוואט_אחורי_עם_מוט_-_טכניקה` «סקוואט אחורי עם מוט - טכניקה» plays `metaai-06-01` «סקוואט אחורי עם מוט»
- `drive_פלאנק_על_האמות_-_טכניקה` «פלאנק על האמות - טכניקה» plays `metaai-05-01` «פלאנק על האמות»
- `drive_דדליפט_רומני_על_רגל_אחת_עם_משקולות` «דדליפט רומני על רגל אחת עם משקולות» plays `metaai-06-06` «דדליפט רומני רגל אחת»
- `drive_חתירה_כבדה_ביד_אחת_עם_משקולת` «חתירה כבדה ביד אחת עם משקולת» plays `metaai-e03-03` «חתירה יד אחת»
- `drive_סקוואט_בולגרי_עם_משקולות_כבדות` «סקוואט בולגרי עם משקולות כבדות» plays `metaai-06-04` «בולגרי כבד»
- `drive_גובלט_סקוואט_עם_קטלבל` «גובלט סקוואט עם קטלבל» plays `metaai-07-hiit-08` «סקוואט גובלט עם קטלבל»
- `drive_שכיבות_סמיכה_על_קיר` «שכיבות סמיכה על קיר» plays `metaai-04-10-1` «שלב 1 שכיבות מהקיר»
- `yt_cat_cow` «חתול-פרה לניידות עמוד שדרה» plays `metaai-e03-13` «חתול פרה»
- `yt_lateral_raise` «הרמות צד עם משקולות» plays `metaai-e01-02` «הרחקת כתף»
- `yt_high_knees` «ברכיים גבוהות» plays `metaai-07-01` «אינטרוול ברך גבוהה במקום»
- `yt_walking_lunge` «לאנג'ים בהליכה» plays `metaai-06-05` «לאנגים בהליכה עם מוט»
- `yt_burpee` «ברפי» plays `metaai-07-02` «ברפי HIIT קלאסי»
- `yt_jumping_jacks` «ג'מפינג ג'קס» plays `metaai-07-hiit-01` «גאמפינג גקס»
- `yt_db_shoulder_press` «לחיצת כתפיים עם משקולות» plays `metaai-e01-01` «לחיצת כתפיים»
- `yt_pike_push_up` «שכיבת סמיכה בפייק (Pike Push-Up)» plays `metaai-04-12` «שכיבות פייק»
- `yt_rear_delt_fly` «הרמת דלתא אחורית עם משקולות» plays `metaai-e03-12` «פרפר הפוך»
- `bodyweight_squat` «סקוואט משקל גוף» plays `metaai-07-hiit-05` «סקוואט במשקל גוף»
- `push_up` «שכיבות סמיכה» plays `metaai-04-08` «שכיבות סמיכה טכניקה נכונה»
- `russian_twist` «טוויסט רוסי» plays `metaai-e04-11` «רוסי טוויסט»
- `front_raise` «הרמה קדמית» plays `metaai-e01-03` «הרמת כתף קדמית»
- `knee_push_up` «שכיבות סמיכה על ברכיים» plays `metaai-e02-06` «שכיבת סמיכה על ברכיים»
- `yt_band_assisted_pull_up` «מתח בסיוע גומייה» plays `metaai-04-02` «מתח עם גומייה»

## Cross-check against THIRD_PARTY_GAPS

The gaps list has **593** deduped names. Exact-title fold:

| | |
|---|---:|
| Still a placeholder | 536 |
| Exact name now has an original | 0 |
| Exact name is a TrainerHub-owned clip | 0 |
| Exact name not in the catalog | 57 |

Machine-readable list: `data/original-gaps.json`.

Placeholder counts by folder:

- ידיים: 108
- חזה: 94
- בטן: 75
- כתפיים: 74
- גב: 72
- רגליים: 68
- קרדיו: 24
- חימום: 17
- יד קדמית: 17
- יד אחורית: 13
- מתיחות וגמישות: 11
- ללא תיקייה: 7
- גוף מלא HIIT: 1

## Knee-rehab rows

- `E04-13`, `E04-14`, `E04-15` have no catalog id and no Meta AI file.
