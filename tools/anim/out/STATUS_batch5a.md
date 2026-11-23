# Batch 5A status

17 new exercises (the brief's title says 20, its list has 17 ids; all 17 are done). Total is now 98 clips.

Last full batch: `node tools/anim/render.js --all` -> 98/98 rendered, every MP4 passed the spec check, no pose
warnings; after it git reports no change in any committed MP4 / poster / contact sheet of the 81 old clips.

Every new clip: 9.00 s, 30 fps, 270 frames, 720x1280 + 360x640 MP4 (H.264 Main, yuv420p, CRF 28, no audio,
faststart, built-in ffprobe spec check passed) + poster PNG + `exercises/<id>.json`. No pose warnings on any
new clip (floor clipping / unreachable hand or foot / frame edge), checked on all 270 frames.

Batches 1-4 are untouched: none of the 81 old `exercises/*.json` changed. Two small optional engine additions
were made (below). Every 3rd frame of all 81 old clips was hashed before and after them: all identical.

DONE = rendered + stills looked at on a contact sheet (start, 3+ mid-movement points, end / loop; sampled every
0.375 s for 3 s cycles, every 0.5 s for the 9 s cycles, every 0.06 s for the rope) + pose checks clean.
Sheets are in `contact/<id>.png`.

| # | id | View | Status | Notes |
| --- | --- | --- | --- | --- |
| 1 | `towel-row` | side | DONE | 3 reps. Post on the right, white towel taut from the post to both hands, heels planted, body pivots as one line (about 60 to 76 degrees from the floor). |
| 2 | `chest-supported-row` | side | DONE | 3 reps. Prone on a 35 degree incline pad, toes on the floor behind, dumbbells row from a straight hang to the hips, torso does not move. |
| 3 | `straight-arm-pulldown` | side | DONE | 3 reps. High pulley on the right, slight hip hinge, near-straight arms sweep from above shoulder height to the thighs; cable always straight to the bar. |
| 4 | `dumbbell-superman-pull` | side | DONE | 3 reps. Chest and legs stay lifted; the sideways arc of the arms is shown by shortening the arm (see below). |
| 5 | `spider-curl` | side | DONE | 3 reps. Prone on a 48 degree incline pad, upper arms vertical and still, dumbbells drawn end-on (palms forward). |
| 6 | `hammer-curl` | side | DONE | 3 curls per arm, alternating near / far. Dumbbells side-on (neutral grip), elbows stay at the sides. |
| 7 | `jump-rope` | side | DONE | 18 jumps (0.5 s each), about 6 cm of flight on the balls of the feet. Rope turns once per jump and is under the feet at the top of the jump; shadow shrinks in the air. |
| 8 | `cable-chest-press` | side | DONE | 3 reps. Column behind (left), pulley at chest height, near knee down / far foot forward, near hand presses; cable taut. |
| 9 | `muscle-up` | side | DONE | 2 reps (4.5 s each): hang, pull, elbows over, lean over the bar, press to support, and back. Hands stay on the bar; the body passes behind and over the bar, not through it. |
| 10 | `plank-knee-to-chest` | side | DONE | 3 per leg, alternating, slow. Hands and the supporting foot stay planted. |
| 11 | `knee-plank` | side | DONE | One 9 s hold: from hips-back kneeling (forearms already down) into the knee plank, 3 breaths (hips rise under 1 cm), back to kneeling. Knees and forearms planted. |
| 12 | `high-plank` | side | DONE | One 9 s hold: from knees-down (knee push-up position) to the straight-arm plank, 3 breaths, knees back down. Hands and toes planted. |
| 13 | `ghd-sit-up` | side | DONE | 3 reps. Gray GHD: hip pad, foot plate, two ankle rollers. Legs straight, arms crossed on the chest, torso from just past vertical to parallel to the floor. |
| 14 | `hanging-windshield-wipers` | front | DONE | One 9 s set: raise, left, right, left, right, centre, lower (2 full left-right cycles). Legs together and straight, about 45 degrees each way. |
| 15 | `turkish-get-up` | side | DONE | One full up-and-down in 9 s: lying, elbow, hand, bridge, leg sweep to kneeling, half-kneeling, standing, and the same steps back. Bell arm vertical and straight in every frame; the front foot never moves. |
| 16 | `hanging-leg-raise` | side | DONE | 3 reps. Straight legs to about 15 degrees above horizontal with a pelvic tuck, short pause, controlled lowering. |
| 17 | `toes-to-bar` | side | DONE | 3 reps. Small back-swing, then straight legs up until the toes touch the bar, shoulders behind the bar; controlled lowering. |

## Engine additions (both optional, old clips unaffected)

- `lib/props.js`: new prop type `rope` (skipping rope seen from the side: a thin bowed line from the hand that
  turns once per `period` seconds and skims the floor instead of passing through it). `render.js` passes the
  frame time to the props for it.
- `lib/figure.js` + `render.js`: exercise option `"legsInFront": true` for front / top view, which draws the
  legs over the torso, head and arms (legs raised towards the camera). Used only by `hanging-windshield-wipers`.

## Still imperfect (judgement calls, not glitches)

- `turkish-get-up`: a real get-up leans sideways onto the support hand; a strict profile cannot show that, so
  the support hand is planted behind the hips in the plane of the picture and the bridge / kneeling steps
  lean back onto it (torso 20 degrees above the floor at the leg sweep). The kneeling far foot ends close to
  where the support hand was. The bell arm covers part of the head when the figure is upright (same as the
  other overhead clips). The steps run without long pauses to fit one cycle in 9 s.
- `hanging-windshield-wipers`: a front view has no depth, so the leg raise is shown by the legs shortening and
  then extending upwards; while they pass horizontal the shoes sit in front of the hips. At the top the legs
  cover the face and the shoes overlap the bar. The torso lean-back is not shown, only a small side swing.
- `dumbbell-superman-pull`: the arms sweep sideways (towards the camera), shown by shortening the arm; mid-rep
  the near arm is a short stub next to the head. Dumbbells are drawn end-on as small round plates. The camera
  is wide (2.45 m), so the figure is small, like `superman-hold`.
- `jump-rope`: in a true profile both halves of the rope overlap, so it is one bowed gold line (plus a gray
  one for the far hand), not a visible loop. The hands do not circle. The camera is 2.3 m wide to keep the
  whole rope in frame, so the figure is a bit smaller than in the standing clips.
- `muscle-up`: at the top the bar rests about 9 cm below the hip joint (arms are longer than the torso), and
  while the chest leans over the bar the torso overlaps it by about 1 cm (the bar is drawn in front). The
  camera is slightly wider (2.12 m, floor a little lower) than `pull-up` so the support position fits.
- `plank-knee-to-chest`: the hips rise about 3.5 cm while a knee comes through (otherwise the knee would go
  through the floor), and the swinging thigh is drawn slightly shortened.
- `cable-chest-press`: the cable runs from the pulley behind the figure across the chest to the hand (drawn
  over the shirt, behind the near arm). The far hand rests on the far thigh and is hidden by the torso. At
  the chest the elbow is shown tucked by shortening the upper arm.
- `hammer-curl`: feet hip-width cannot be shown in profile. When the far arm curls, only its forearm and
  dumbbell show in front of the chest.
- `spider-curl` / `chest-supported-row`: the top of the pad ends just below the shoulders so the arms hang
  free in front of it; the far arm is partly hidden behind the pad.
- `ghd-sit-up`: arms crossed on the chest (not behind the head); legs fully straight.
- `high-plank` / `knee-plank`: the entry is from a knees-down position with the hands / forearms already in
  place (not from all-fours with the hips over the knees), so that hands, toes and knees never slide.
- `toes-to-bar`, `hanging-leg-raise`, `muscle-up`: in the hang the near arm covers part of the head (same as
  `dead-hang` / `pull-up`).
- Motion was judged from stills and contact sheets, not by watching the MP4s play back.
