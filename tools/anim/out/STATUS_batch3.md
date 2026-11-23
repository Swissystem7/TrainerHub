# Batch 3 status

Last full batch: `node tools/anim/render.js --all` -> 61/61 rendered (41 from batches 1+2 + 20 new), every MP4
passed the built-in spec check (H.264 Main, yuv420p, CRF 28, 30 fps, 270 frames, 9.00 s, no audio, faststart,
720x1280 + 360x640). No pose warnings on any clip (floor clipping / unreachable hand or foot / frame edge).

Batches 1+2 are untouched: none of the 41 old `exercises/*.json` changed and **no shared code changed**
(`render.js` and `lib/*.js` are byte-for-byte as committed), so the old clips cannot have moved. After the
full re-render git reports no change in any committed MP4 / poster / contact sheet.

DONE = rendered + stills looked at (start, 3+ mid-movement points, end/loop) on a contact sheet in `contact/`
+ pose checks clean.

| # | id | View | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | `bear-crawl` | side | DONE | 4 small steps forward, 4 back, opposite hand + foot together; ends where it starts. Knees hover, back flat. |
| 2 | `skin-the-cat` | side | DONE | One slow cycle: hang -> tuck -> inverted tuck -> shallow back hang -> same path back. Hands stay on the bar. |
| 3 | `triceps-kickback` | side | DONE | 3 reps. Upper arm fixed along the torso, free hand on the far thigh. |
| 4 | `diamond-pushup` | side | DONE | 3 reps. Same framing as `pushups`, hands together under the chest, elbows track back. |
| 5 | `single-arm-cable-row` | side | DONE | 3 reps. Half-kneeling (near knee down, far foot forward), pulley at chest height. |
| 6 | `single-arm-db-row` | side | DONE | 3 reps. Far knee + far hand on the bench, near foot on the floor. |
| 7 | `reverse-hyperextension` | side | DONE | 3 reps. Belly on the ball, hands planted, legs lift to the torso line. |
| 8 | `negative-chin-up` | side | DONE | 2 reps. Box sits just behind the bar; feet step off, slow lower, step back on, stand up to the top (see below). |
| 9 | `barbell-floor-press` | side | DONE | 3 reps. Bar end-on with a round plate; upper arms touch the floor at the bottom. |
| 10 | `machine-chest-press` | side | DONE | 3 reps. Lever arm hangs from an overhead pivot and follows the hands. |
| 11 | `wall-walk` | side | DONE | One up-and-down cycle, small alternating hand / foot steps (see below). |
| 12 | `hanging-knee-raise` | side | DONE | 3 reps. Thighs finish above parallel with a slight pelvic tilt. |
| 13 | `walking-lunge` | side | DONE | 2 lunges forward, then 2 reverse lunges back to the start (see below). |
| 14 | `inverted-row` | side | DONE | 3 reps. Head on the left, heels planted, rigid body pivots on the heels. |
| 15 | `seal-row` | side | DONE | 3 reps. High bench; far arm and far dumbbell pass behind the bench. |
| 16 | `gorilla-row` | side | DONE | 3 rows per side, alternating; the other bell stays on the floor (see below). |
| 17 | `band-pulldown-kneeling` | side | DONE | 3 reps. Two gold bands from a high anchor on a frame, taut throughout. |
| 18 | `back-extension` | side | DONE | 3 reps. Toes anchored on the floor, legs straight, hands by the head. |
| 19 | `wall-curl` | side | DONE | 3 reps. Back and upper arms against the wall strip, feet slightly forward. |
| 20 | `pec-deck-fly` | front | DONE | 3 reps. Pads on pivoting arms follow the hands (see below). |

No id is in PROBLEM state.

## Engine changes

None. All 20 clips use the existing engine, props and views; adding them was "new JSON + render".
`wall-walk` and `walking-lunge` have many keyframes, so their JSON was produced with a small throw-away
script (not kept in the repo); the JSON files are the source of truth and render like any other.

## Still imperfect (judgement calls, not glitches)

- `negative-chin-up`: the brief asks for both "about 4 s" lowering and "2 reps in 9 s". With 2 reps the
  lowering is about 2.5 s per rep (the rest is step-off, hang, step back on, stand up). The box is drawn
  about 70 cm tall and slightly behind the bar, so the figure can hang with straight legs in front of it; to
  get back on, the figure swings the feet back onto the box and stands up. It is not a "small" box.
- `wall-walk`: with straight arms and a tight body the geometry leaves little room for steps, so the steps are
  small, the shoulders dip a few cm while a hand moves and the trailing knee bends a little. Hands and feet
  slide a few cm along the floor / wall between keys (a lifted mid-step is drawn, but it is small).
- `walking-lunge`: the camera is wider than the other clips (2.3 m) to fit the 1.6 m of travel, so the figure
  is a bit smaller. As in `barbell-back-squat`, the plate hides part of the neck / shoulder.
- `gorilla-row`: a strict profile cannot show the wide stance; both legs overlap and the two kettlebells are
  drawn 6 cm apart so both stay visible. When the far arm rows, only its elbow and bell show behind the torso.
- `pec-deck-fly`: a front view has no depth, so bringing the arms forward is shown by shortening them; mid-rep
  the arms look short (same limitation as `cable-woodchop`).
- `single-arm-db-row`: the supporting near leg stands in front of the bench in the picture (it is beside it).
- `seal-row`, `single-arm-db-row`: at the top of the row the near dumbbell overlaps the bench pad (the hand is
  beside the bench, in front of it for the camera).
- `back-extension`: the near forearm crosses the back of the head in the draped position.
- `skin-the-cat`, `hanging-knee-raise`, `negative-chin-up`: in strict profile the near arm covers part of the
  head in the hang (same as `dead-hang` / `pull-up`).
- `machine-chest-press`: the hand path is a straight line while the lever swings on an arc, so the lever length
  changes by about 1 cm during the rep (not visible at normal size).
- `triceps-kickback`, `wall-curl`, `barbell-floor-press`, `band-pulldown-kneeling`: both sides nearly overlap in
  profile, so mostly the near arm / dumbbell is visible.
- Motion was judged from contact sheets and stills, not by watching the MP4s play back.
