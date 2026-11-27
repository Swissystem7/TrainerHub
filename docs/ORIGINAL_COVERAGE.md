# Original clip coverage

Updated 27 Nov 2026. The app plays only TrainerHub-owned video: the 107 Meta AI demos, and OneDrive clips whose file is on the `trainerhub-media-v1` release and is not an Instagram or YouTube source. Instagram reels, YouTube embeds, and other third-party URLs stay in the catalog JSON as reference (`thirdParty` / `reference`) and are not rendered or linked.

## Counts

| | |
|---|---:|
| Meta AI originals in `videos/originals-catalog.json` | 107 |
| Match ids that play an original (`matches` in originals.json) | 83 |
| Exercises on the “הסרטון יעלה בקרוב” placeholder | 562 |
| TrainerHub-owned clips with no Meta AI original | 60 |
| Library cards whose own player is that original | 68 |

Playback URLs are `https://swissystem7.github.io/TrainerHub-media/<folder>/<id>.mp4`, then `https://cdn.jsdelivr.net/gh/Swissystem7/TrainerHub-media@v2/<folder>/<id>.mp4`. GitHub Pages serves the media repo default branch, so the originals play from jsDelivr until that branch is merged. The files are in Swissystem7/TrainerHub-media at those paths (tag `v2`).

Saved workouts keep their exercise ids. A covered id plays the original clip; the id itself is unchanged.

## Cross-check against THIRD_PARTY_GAPS

The attached gaps list has **593** deduped rows (it excluded inspiration items, compilations, the drinking challenge, and clips that already had a TrainerHub-owned file). Matching is by exact Hebrew name after folding quotes and dashes.

| Gaps list | |
|---|---:|
| Still only a placeholder under that exact name | 536 |
| Exact name now has a Meta AI original | 0 |
| Exact name is a TrainerHub-owned clip | 0 |
| Exact name not found in the catalog | 57 |

The machine-readable list of every catalog exercise still lacking an original is `data/original-gaps.json` (`placeholder`, plus `ownedWithoutMetaAi` for owned clips the gaps file did not count). Names in the gaps file that are not an exact catalog title — shortened with an ellipsis, or a knee-rehab row that was never given a catalog id — are under `gapCrossCheck.notFoundByExactName`.

Placeholder counts by folder:

- ידיים: 107
- חזה: 93
- בטן: 73
- כתפיים: 72
- גב: 69
- רגליים: 63
- קרדיו: 23
- חימום: 17
- יד קדמית: 17
- יד אחורית: 13
- מתיחות וגמישות: 11
- ללא תיקייה: 3
- גוף מלא HIIT: 1

## Name differences on covered ids

These existing exercises play an original whose Hebrew title is not the same string. The id is unchanged. The closest original among every clip that listed the id was chosen.

- `בטן_גומיות` «בטן גומיות» plays `metaai-05-g03` «בטן עם גומיות»
- `בטן_זוגות` «בטן זוגות» plays `metaai-05-09` «בטן בזוגות»
- `בטן_זוגות_2` «בטן זוגות» plays `metaai-05-09` «בטן בזוגות»
- `בטן_כדור_כדורסל` «בטן כדור כדורסל» plays `metaai-05-g02` «בטן עם כדור»
- `superman` «גב תחתון» plays `metaai-e03-05` «סופרמן»
- `גומיות_בטן` «גומיות בטן» plays `metaai-05-g03` «בטן עם גומיות»
- `זוגות_בטן` «זוגות בטן» plays `metaai-05-09` «בטן בזוגות»
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
- `drive_דיפס_על_ספסל_לילדים` «דיפס על ספסל לילדים» plays `metaai-04-13` «דיפס על ספסל»
- `drive_חתירה_כבדה_ביד_אחת_עם_משקולת` «חתירה כבדה ביד אחת עם משקולת» plays `metaai-e03-03` «חתירה יד אחת»
- `drive_דד_באג_עם_משקולות` «דד באג עם משקולות» plays `metaai-05-06` «דד באג»
- `drive_סקוואט_בולגרי_עם_משקולות_כבדות` «סקוואט בולגרי עם משקולות כבדות» plays `metaai-06-04` «בולגרי כבד»
- `drive_סקוואט_קפיצה_עם_משקולות` «סקוואט קפיצה עם משקולות» plays `metaai-07-hiit-04` «סקוואט קפיצה»
- `drive_חתירת_מוט_בכפיפה` «חתירת מוט בכפיפה» plays `metaai-e03-02` «חתירה בהטיה»
- `drive_חתירת_קטלבל_בכפיפה` «חתירת קטלבל בכפיפה» plays `metaai-e03-02` «חתירה בהטיה»
- `drive_גובלט_סקוואט_עם_קטלבל` «גובלט סקוואט עם קטלבל» plays `metaai-07-hiit-08` «סקוואט גובלט עם קטלבל»
- `drive_שכיבות_סמיכה_על_קיר` «שכיבות סמיכה על קיר» plays `metaai-04-10-1` «שלב 1 שכיבות מהקיר»
- `drive_טוויסט_רוסי_עם_כדורסל` «טוויסט רוסי עם כדורסל» plays `metaai-e04-11` «רוסי טוויסט»
- `yt_cat_cow` «חתול-פרה לניידות עמוד שדרה» plays `metaai-e03-13` «חתול פרה»
- `yt_lateral_raise` «הרמות צד עם משקולות» plays `metaai-e01-02` «הרחקת כתף»
- `yt_high_knees` «ברכיים גבוהות» plays `metaai-07-01` «אינטרוול ברך גבוהה במקום»
- `yt_goblet_squat` «סקוואט גביע עם משקולת» plays `metaai-07-hiit-08` «סקוואט גובלט עם קטלבל»
- `yt_rdl_db` «דדליפט רומני עם משקולות» plays `metaai-e03-01` «דדליפט רומני»
- `yt_walking_lunge` «לאנג'ים בהליכה» plays `metaai-06-05` «לאנגים בהליכה עם מוט»
- `yt_burpee` «ברפי» plays `metaai-07-02` «ברפי HIIT קלאסי»
- `yt_jumping_jacks` «ג'מפינג ג'קס» plays `metaai-07-hiit-01` «גאמפינג גקס»
- `yt_military_press` «לחיצה צבאית מעל הראש (Military Press)» plays `metaai-e01-01` «לחיצת כתפיים»
- `yt_db_shoulder_press` «לחיצת כתפיים עם משקולות» plays `metaai-e01-01` «לחיצת כתפיים»
- `yt_pike_push_up` «שכיבת סמיכה בפייק (Pike Push-Up)» plays `metaai-04-12` «שכיבות פייק»
- `yt_rear_delt_fly` «הרמת דלתא אחורית עם משקולות» plays `metaai-e03-12` «פרפר הפוך»
- `yt_cable_face_pull` «פייס פול בכבל» plays `metaai-e01-05` «משיכת פנים»
Fifteen other match ids are not their own library card (the catalog row was unavailable or dropped as a duplicate file, or the id is the reel `ig-DdthU1EtHnN`). Opening that id in a workout still plays the original.

## Knee-rehab rows called out in the gaps file

- `E04-13` שיקום ברך 2 — שלב המשך (שם ספציפי לא צוין) — early Meta AI curriculum, no demo yet — no catalog id and no Meta AI file.
- `E04-14` שיקום ברך 3 — שלב המשך (שם ספציפי לא צוין) — early Meta AI curriculum, no demo yet — no catalog id and no Meta AI file.
- `E04-15` שיקום ברך 4 — שלב המשך (שם ספציפי לא צוין) — early Meta AI curriculum, no demo yet — no catalog id and no Meta AI file.
