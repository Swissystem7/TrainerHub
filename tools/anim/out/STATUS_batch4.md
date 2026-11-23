# Batch 4 status

Last full batch: `node tools/anim/render.js --all` -> 81/81 rendered (61 from batches 1-3 + 20 new), every MP4
passed the built-in spec check (H.264 Main, yuv420p, CRF 28, 30 fps, 270 frames, 9.00 s, no audio, faststart,
720x1280 + 360x640). No pose warnings on any clip (floor clipping / unreachable hand or foot / frame edge).

Batches 1-3 are untouched: none of the 61 old `exercises/*.json` changed. One small optional engine addition
was made (below); every 3rd frame of all 61 old clips was hashed before and after it: identical. After the
full re-render git reports no change in any committed MP4 / poster / contact sheet.

DONE = rendered + stills looked at (start, 3+ mid-movement points, end/loop) on a contact sheet in `contact/`
+ pose checks clean.

| # | id | View | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | `single-arm-db-bench-press` | side | DONE | 3 reps. Near arm presses, far hand rests on the belly. Elbow drop is shown by shortening the upper arm (see below). |
| 2 | `band-chest-press` | side | DONE | 3 reps. Split stance, gold band from a post behind at chest height to both hands, taut throughout. |
| 3 | `dumbbell-squeeze-press` | side | DONE | 3 reps. Dumbbells seen side-on (neutral grip), far one darker and just behind the near one. |
| 4 | `plyo-pushup` | side | DONE | 3 reps. Same framing as `pushups`; hands leave the floor about 9-10 cm, toes stay planted, soft catch with bent elbows. |
| 5 | `cable-crossover` | front | DONE | 3 reps. Two columns with top pulleys, cables always straight from pulley to handle. Symmetric stance (see below). |
| 6 | `knee-pushup` | side | DONE | 3 reps. Pivot on the knees, lower legs raised, straight line knees to head. |
| 7 | `wall-pushup` | side | DONE | 3 reps. Wall strip on the right, hands fixed on the wall, heels down, body one straight line. |
| 8 | `side-plank` | front | DONE | 2 lifts (4.5 s each): hips on the floor -> straight line -> hold with breathing -> lower. Free arm along the body. |
| 9 | `renegade-row` | side | DONE | 3 rows per side, alternating. Hex dumbbells side-on; the far dumbbell is 6 cm ahead so both stay visible. |
| 10 | `hack-squat-machine` | side | DONE | 3 reps. Back pad + sled + shoulder pad slide along a 60 degree rail with the figure; angled footplate. |
| 11 | `pistol-squat` | side | DONE | 2 slow reps. Near leg works, far leg held straight out in front, heel stays flat. |
| 12 | `step-up` | side | DONE | 3 reps, same (near) leg. 42 cm box on the right, far knee lifts to hip height at the top. |
| 13 | `jump-squat` | side | DONE | 3 reps. About 18 cm of flight, arm swing, toe-first landing; the floor shadow shrinks and fades in the air. |
| 14 | `single-leg-rdl` | side | DONE | 3 reps. Torso and free leg form one line near horizontal; free foot never touches down. |
| 15 | `standing-barbell-ohp` | side | DONE | 3 reps. Bar path within about 2.5 cm of vertical, head back then through. |
| 16 | `band-triceps-extension` | side | DONE | 3 reps. Upper arms pinned, only the forearms move, band taut from the high anchor. |
| 17 | `jm-press` | side | DONE | 3 reps. Bar arcs back towards the chin and stays clear above the throat at the lowest point. |
| 18 | `stair-dip` | side | DONE | 3 reps. Hands on the edge of a 45 cm step, heels on the floor, elbows point back to about 90 degrees. |
| 19 | `goblet-squat` | side | DONE | 3 reps. Kettlebell at the chest, hips drop below the knees, heels flat. |
| 20 | `barbell-deadlift` | side | DONE | 3 reps. Starts and ends gripping the bar on the floor (see below). |

No id is in PROBLEM state.

## Engine changes

- `render.js`: optional `"shadow": { "air": k }` in an exercise file. The automatic floor shadow shrinks and
  fades with the height of the figure's lowest point (used only by `jump-squat`). Without the key nothing
  changes, so the 61 old clips render identically (checked by frame hashes).
- No new props and no new views. README updated for the option and the exercise count.

## Still imperfect (judgement calls, not glitches)

- `barbell-deadlift`: the loop starts and ends in the grip position on the floor; the figure does not first stand
  and bend down to the bar. "Pulling the slack out" is a small chest-up shift before the lift. The 22 cm plate
  hides the shins and knees as the bar passes them, and the hands hold the bar about 9 cm in front of the hip
  line at lockout.
- `standing-barbell-ohp`, `jm-press`: the end-on plate covers part of the face / neck while the bar is near
  them (same as `barbell-back-squat`). The plates are drawn smaller (14-15 cm) to limit this.
- `single-arm-db-bench-press`, `dumbbell-squeeze-press`, `knee-pushup`, `plyo-pushup`: elbows that move towards
  the camera are shown by shortening the upper arm, as in `pushups`; the arm looks short at the bottom.
- `cable-crossover`: a front view has no depth, so the split stance and forward lean asked for in the brief
  are not shown; the figure stands square with the feet slightly apart.
- `side-plank`: the feet slide a few cm along the floor while the hips lift (the hold itself is planted).
  The supporting forearm points at the camera, so it is drawn as a short stub.
- `band-chest-press`: the band is drawn as two straight lines from the anchor to the hands, crossing the
  torso; it does not wrap around the back.
- `hack-squat-machine`: the footplate is angled (perpendicular to the rail) rather than flat on the floor, so
  the ankles stay neutral. The near shoulder pad slightly overlaps the jaw line.
- `goblet-squat`: the kettlebell sits behind the near forearm and the near thigh, so only part of it shows.
- `step-up`: the trailing foot passes close above the front edge of the box on the way up and down (no contact
  in the sampled stills), and the motion has more keyframes than the other clips, so it may look less fluid.
- `renegade-row`, `band-triceps-extension`, `stair-dip`, `goblet-squat`: both sides nearly overlap in profile,
  so mostly the near arm / leg is visible. When the far arm rows, only its elbow and dumbbell show.
- `standing-barbell-ohp`, `jump-squat`: the near arm passes in front of the head when overhead.
- Motion was judged from contact sheets and stills, not by watching the MP4s play back.
