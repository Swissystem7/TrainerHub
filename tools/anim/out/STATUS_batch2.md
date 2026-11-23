# Batch 2 status

Last full batch: `node tools/anim/render.js --all` -> 41/41 rendered (21 from batch 1 + 20 new), every MP4
passed the built-in spec check (H.264 Main, yuv420p, CRF 28, 30 fps, 270 frames, 9.00 s, no audio, faststart,
720x1280 + 360x640). No pose warnings on any clip (floor clipping / unreachable hand or foot / frame edge).

Batch 1 is untouched: none of the 21 old `exercises/*.json` changed, and after the two small engine
additions (below) every 3rd frame of all 21 old clips was hashed before and after: identical. The
re-rendered batch 1 MP4s / posters are byte-identical to the ones already staged in git.

DONE = rendered + contact sheet looked at (8 frames across one cycle: start, mid-movement points, end/loop)
+ pose checks clean. Contact sheets are in `contact/`.

| # | id | View | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | `incline-pushup` | side | DONE | 3 reps. Hands on the edge of a 50 cm bench, toes planted. |
| 2 | `decline-pushup` | side | DONE | 3 reps. Toes on a 45 cm bench. Body is close to level at the top and slopes down to the head at the bottom (see below). |
| 3 | `bar-dip` | side | DONE | 3 reps. Bars drawn as a side-on rail on an upright, not end-on (see below). |
| 4 | `overhead-triceps-extension` | side | DONE | 3 reps. Dumbbell stays vertical under the hands. |
| 5 | `wall-sit` | side | DONE | Slide down -> hold with breathing -> slide up, one 9 s cycle. Hands rest on the thighs throughout. |
| 6 | `band-curl` | side | DONE | 3 reps. Gold band from under the foot to the handle, stretches with the hand. |
| 7 | `pike-pushup` | side | DONE | 3 reps. Hands and feet planted (IK). |
| 8 | `skull-crusher` | side | DONE | 3 reps. Flat bench, feet on the floor, two dumbbells (far one darker, slightly offset). |
| 9 | `preacher-curl` | side | DONE | 3 reps. Seat + angled pad; free arm rests on the pad. |
| 10 | `cable-curl` | side | DONE | 3 reps. Low pulley in front, bar seen end-on at the hands. |
| 11 | `band-row` | side | DONE | 3 reps. Band looped around the soles. |
| 12 | `pull-up` | side | DONE | 3 reps. Starts and ends in the hang, hands never leave the bar. Ceiling-mounted bar seen end-on. |
| 13 | `barbell-bent-row` | side | DONE | 3 reps. Torso fixed at 45 degrees. |
| 14 | `bulgarian-split-squat` | side | DONE | 3 reps. Near leg in front, far (darker) leg on the bench. |
| 15 | `seated-v-up` | side | DONE | 3 reps on a mat. |
| 16 | `band-overhead-press` | side | DONE | 3 reps. |
| 17 | `landmine-rotation` | front | DONE | 3 left-right cycles, continuous through the middle. |
| 18 | `cable-woodchop` | front | DONE | 3 reps, high pulley on the left of the frame. |
| 19 | `bayesian-cable-curl` | side | DONE | 3 reps. Low pulley behind, staggered stance. |
| 20 | `bottoms-up-kb-curl` | side | DONE | 3 reps. Bell stays upright above the fist. |

No id is in PROBLEM state.

## Engine changes (both optional, defaults keep old clips identical)

- `lib/skeleton.js`: pose `scale: { shoulders, hips }` for the front / top view, to show a turned torso
  (used by `landmine-rotation` and `cable-woodchop`).
- `lib/props.js`: new `band` prop (taut gold / red line with a thin dark rim).
- README updated for both.

## Still imperfect (judgement calls, not glitches)

- `bar-dip`: the brief asked for the bars seen end-on as one bar. An end-on bar sat in front of the hips and
  read as "hands on hips", so the bars are drawn as one side-on rail on an upright, which is how parallel
  bars actually look from the side. Easy to switch back if the owner prefers the end-on dot.
- `decline-pushup`: with straight arms and a 45 cm bench the shoulders and ankles are at almost the same
  height, so the downward slope towards the head is slight at the top and clear only at the bottom.
- `bottoms-up-kb-curl`: the bottom position is a nearly straight arm (elbow about 135 degrees), not fully
  straight: with the arm hanging straight down an upright bell would sit on the forearm.
- `pull-up`: halfway up, the near elbow passes slightly in front of the bar before tucking down and back at
  the top. In strict profile the near arm also covers part of the head in the hang (same as `dead-hang`).
- `cable-woodchop` / `landmine-rotation`: a front view has no depth, so the torso turn is shown by narrowing
  the shoulders and shortening the arms. As the hands cross the middle of the body the arms look short and
  folded for a few frames. Feet pivot only as a small heel lift.
- `overhead-triceps-extension`, `band-overhead-press`: the near arm passes in front of the head when
  overhead (same as batch 1 profile clips).
- `wall-sit`: the start pose leans back against the wall with the feet already 45 cm out, so the feet never
  slide; it looks more tilted than a normal standing pose.
- `band-curl`, `band-overhead-press`, `cable-curl`, `barbell-bent-row`, `bulgarian-split-squat`: both sides
  overlap in profile, so only the near band / hand / dumbbell is visible.
- Motion was judged from contact sheets and stills, not by watching the MP4s play back.
