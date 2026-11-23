# Batch 1 status

Last full batch: `node tools/anim/render.js --all` -> 21/21 rendered, every MP4 passed the built-in
spec check (H.264 Main, yuv420p, CRF 28, 30 fps, 270 frames, 9.00 s, no audio, faststart,
720x1280 + 360x640). No pose warnings (floor clipping / unreachable hand or foot / frame edge).

DONE = rendered + stills looked at (start, 3+ mid-movement points, end/loop) + contact sheet in `contact/`.

| # | id | View | Status | Notes |
| --- | --- | --- | --- | --- |
| - | `pushups` | side | DONE (approved sample) | Unchanged data; frames compared pixel-for-pixel with the approved render after the engine changes: identical. |
| 1 | `barbell-curl` | side | DONE | 3 reps. Plate drawn behind the near forearm so the grip stays visible. |
| 2 | `seated-cable-lat-pulldown` | side | DONE | 3 reps. Bar is seen end-on (round bar end at the hands). |
| 3 | `kettlebell-bent-row` | side | DONE | 3 reps. Staggered stance, far hand resting on the far thigh. |
| 4 | `wall-angels` | side | DONE | 3 reps. In profile the near arm necessarily passes in front of the head (see below). |
| 5 | `superman-hold` | side | DONE | 2 lift-hold-lower cycles with breathing. |
| 6 | `concentration-curl` | side | DONE | 3 reps. Dumbbell passes close to the near knee at the bottom (see below). |
| 7 | `kettlebell-floor-press` | side | DONE | 3 reps. |
| 8 | `floor-dumbbell-fly` | top | DONE | 3 reps. Top-down view on a mat (see below). |
| 9 | `hand-release-pushup` | side | DONE | 3 reps. Same framing and top pose as `pushups`. |
| 10 | `plank` | side | DONE | Knees down -> plank -> hold with breathing -> knees down. |
| 11 | `mountain-climber` | side | DONE | 12 knee drives. Hips sit a little higher than in the push-up plank so the driving knee clears the floor. |
| 12 | `dead-bug` | side | DONE | 6 alternating reps. |
| 13 | `kneeling-cable-crunch` | side | DONE | 3 reps. Rope is drawn as the cable ending in the hands. |
| 14 | `barbell-back-squat` | side | DONE | 3 reps. Bar path stays within about 5 cm of vertical. |
| 15 | `squat-knee-raise` | side | DONE | 3 reps, knee raise near / far / near. |
| 16 | `dead-hang` | side | DONE | Small jump to the bar -> hang with breathing and slight sway -> drop -> stand. |
| 17 | `cable-lateral-raise` | front | DONE | 3 reps. Cable crosses in front of the body. |
| 18 | `seated-kettlebell-overhead-press` | side | DONE | 3 reps. |
| 19 | `stability-ball-bench-dip` | side | DONE | 3 reps. |
| 20 | `single-leg-press` | side | DONE | 3 reps. Footplate + carriage follow the foot along the 45 degree rail. |

## Still imperfect (judgement calls, not glitches)

- `wall-angels`, `dead-hang`, `seated-kettlebell-overhead-press` (top of the press): a strict profile view puts
  the near arm in front of the head when the arm is overhead. It is anatomically right but busier than the
  other clips. A front view would read more clearly for `wall-angels` if the owner prefers it.
- `floor-dumbbell-fly`: in the top view the arms are foreshortened while they are above the chest, so they look
  short mid-rep and the dumbbells overlap the neck area at the top of the rep. The legs look short because the
  knees are bent towards the camera.
- `concentration-curl`: at the bottom of the rep the rear dumbbell plate overlaps the near knee by a few pixels.
- `barbell-back-squat` / `barbell-curl`: both hands and both legs overlap exactly in profile, so only the near
  side is visible; the plate is drawn behind the near forearm (a real plate would hide the hand).
- `dead-hang`: the clip starts with the hands about 20 cm below the bar (arms up) and jumps to it; the bar is a
  ceiling-mounted bar seen end-on rather than a rig with uprights.
- `plank`: toes slide about 1 cm while the knees lift (the hold itself is planted).
- Motion was judged from stills and contact sheets, not by watching the MP4s play back.
