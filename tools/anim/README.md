# Code-drawn exercise animations

Standalone generator that draws a flat-design adult figure from pose keyframes
and renders a looping exercise clip. Nothing here is used by the app at
runtime, and no existing TrainerHub media is read: every frame is drawn by code.

- One data file per exercise: `exercises/<id>.json`
- Output per exercise, in `out/`:
  - `<id>_720x1280.mp4` (master, 9:16)
  - `<id>_360x640.mp4` (app size)
  - `<id>_poster.png` (single still, same framing)
- `out/contact/<id>.png`: contact sheet (8 frames across one cycle) for a quick visual check
- `out/STATUS.md` (batch 1), `out/STATUS_batch2.md` (batch 2) and `out/STATUS_batch3.md` (batch 3): per-exercise status

Exercises (61): `pushups` (the approved sample), batch 1 (20 exercises, listed in
`out/STATUS.md`), batch 2 (20 exercises, listed in `out/STATUS_batch2.md`) and batch 3
(20 exercises, listed in `out/STATUS_batch3.md`; no engine changes, only new JSON).
Every clip is 9 s, 30 fps, seamless loop.

## Requirements

- Node.js 18 or newer. **No npm packages** (no `npm install` step).
- `ffmpeg` and `ffprobe` on `PATH`, with `libx264`.

## Run

```bash
node tools/anim/render.js pushups                  # one exercise
node tools/anim/render.js --all                    # batch: every exercises/*.json (parallel)
node tools/anim/render.js --all --quiet            # batch, one line per exercise + warnings
node tools/anim/render.js --all --jobs 2           # limit parallel renders (default: up to 4)
node tools/anim/render.js pushups plank            # several named exercises
node tools/anim/render.js pushups --out /tmp/preview

# checking poses
node tools/anim/render.js pushups --still 1.4 --out /tmp/preview   # one PNG at t = 1.4 s
node tools/anim/render.js pushups --sheet                          # out/contact/pushups.png, 8 frames
node tools/anim/render.js pushups --sheet 0,0.5,1.0,1.5            # contact sheet at chosen times
node tools/anim/render.js --all --sheet                            # contact sheets for everything
node tools/anim/render.js pushups --joints 1.4                     # print joint positions (metres)
```

Each render ends with an automatic `ffprobe` spec check and fails if an MP4 is
not: H.264 Main, CRF 28, 30 fps, yuv420p, no audio track, `+faststart`,
expected size and frame count. The batch exits non-zero if any exercise fails.

Renders and contact sheets also print pose warnings: figure below the floor,
a hand / foot that cannot reach its IK target, figure too close to the frame edge.

## How it works

```
exercises/<id>.json  ->  lib/skeleton.js  ->  lib/figure.js + lib/props.js  ->  lib/raster.js  ->  ffmpeg
pose keyframes,          interpolate,         joints to filled shapes,          anti-aliased       MP4s +
props                    FK / IK              equipment shapes                  RGB frames         poster
```

- `render.js` is the CLI: camera, background, draw order, encode, spec check, contact sheets.
- `lib/skeleton.js` holds body proportions, easing, keyframe interpolation and kinematics.
- `lib/figure.js` holds the figure's look (limb thickness, clothing, palette) for all views.
- `lib/props.js` draws equipment (plates, dumbbells, kettlebells, cables, benches, machines).
- `lib/raster.js` is a small shape rasterizer (rounded limbs, polygons, rings, ellipses, clipping).

Palette (in `lib/figure.js`): red `#C22826`, gold `#E6B731`, white and grays only.
Far-side limbs use the same colors mixed towards dark gray. Props can only use
palette names (`steel`, `metal`, `frame`, `iron`, `pad`, `dark`, `gold`, `red`, `white`),
so no other colour can slip in.

## Views

| `view` | What you see | Sides |
| --- | --- | --- |
| `side` (default) | Profile, figure faces right. Far limbs are drawn darker. | `near`, `far` |
| `front` | Figure faces the viewer (used for `cable-lateral-raise`, `landmine-rotation`, `cable-woodchop`, `pec-deck-fly`). | `right`, `left` as seen on screen |
| `top` | Straight down on a lying figure, head towards the top of the frame (used for `floor-dumbbell-fly`). No ground line: the whole frame is floor. | `right`, `left` |

`front` and `top` share one solver: hips and shoulders are spread sideways, and
limb values given at the top level of a pose describe the **right** side and are
mirrored for the left (`angle -> 180 - angle`, IK targets mirrored around the
pelvis x or `axis`). Values inside `right: {...}` / `left: {...}` are taken as written.
In `top` view a limb pointing at the camera is shown with `scale` (a negative
scale flips it, e.g. arms crossing above the chest). The same works in `front` view:
`pec-deck-fly` brings the arms forward by taking the forearm `scale` from `1` to a negative value.
A torso turned away from the camera (rotation exercises) is shown with
`scale: { "shoulders": 0.72, "hips": 0.85 }`: the shoulder / hip joints move
towards the spine, as they do when the body is seen at an angle (1 = square on).

## Add an exercise

1. Copy the closest existing `exercises/*.json` to `exercises/<id>.json` and set `"id"` to the file name.
2. Edit `name`, `view`, `camera`, `props`, `poses` and `timeline`.
3. Check poses with `--sheet` / `--still` / `--joints`, fix any warning, then run
   `node tools/anim/render.js <id>` for the MP4s and poster.

No renderer changes are needed: a new exercise is new JSON + one command.

### Exercise file

| Field | Meaning |
| --- | --- |
| `id` | Must match the file name. Used for output file names. |
| `name` | `{ "en": ..., "he": ... }` metadata. |
| `view` | `side`, `front` or `top`. |
| `equipment` | List of equipment names (metadata). |
| `fps` | Frames per second (30). |
| `camera` | `centerX` (m) at the frame centre, `width` (m) visible across the frame, `groundY` (0..1) floor height in the frame. Fixed for the whole clip. |
| `props` | Equipment, see below. |
| `poses` | Named poses, see below. |
| `timeline` | One cycle: `[{ "t": seconds, "pose": name, "ease": name }]`. Starts at `t = 0`; the first and last pose must be the same so the loop closes (the renderer checks). `ease` shapes the move *into* that key: `linear`, `inOutSine` (default), `inOutQuad`, `inOutCubic`, `inQuad`, `outQuad`, `inCubic`, `outCubic`. |
| `repeat` | How many times the cycle plays. Duration = last `t` x `repeat` (keep it 9 s). |
| `poster` | `{ "t": seconds }` moment used for the poster. |
| `body` | Optional overrides of the proportions in `lib/skeleton.js`. |
| `shadow` | Optional: `false`, or `{ center, rx, ry, alpha, soft }` (world units) instead of the automatic floor shadow. |
| `checks` | Optional: `{ "reach": false }` / `{ "floor": false }` silences a pose warning that is intended. |

### Poses

Units are metres, x to the right, y up, floor at `y = 0`. Angles are absolute
degrees, counter-clockwise from +x, and give the direction a segment points
from parent joint to child joint. Standing upright is `torso 90`, `neck 90`,
`thigh -90`, `shin -90`, `foot 0`, `upperArm -90`, `foreArm -90`, `hand -90`.

| Key | Meaning |
| --- | --- |
| `base: "<pose>"` | Start from another pose and override only what changes. |
| `pelvis: [x, y]` | Hip joint position. Use this **or** `pin`. |
| `pin: { point, at: [x, y] }` | Places the body with its angles, then slides it so `point` sits exactly at `at`. Points: `near.toe`, `near.heel`, `near.ankle`, `near.knee`, `near.elbow`, `near.wrist`, `hip`, `shoulder` (also `far.*`). Keeps a planted foot / elbow fixed while the body pivots. |
| `torso`, `neck` | Body angles (`neck` defaults to `torso`). |
| `waist` | Optional spine bend: direction of the lower half of the torso (`torso` is then the upper half). |
| `thigh`, `shin`, `foot` | Leg angles. |
| `upperArm`, `foreArm`, `hand` | Arm angles. |
| `wrist: [x, y]`, `elbowBend` | Inverse kinematics: plant the wrist at a point; the arm angles are then solved. `elbowBend` is `1` or `-1` and picks which way the elbow points. |
| `ankle: [x, y]`, `kneeBend` | Same for a leg. |
| `wristTo: { at, along, offset }` | The wrist follows a body point instead of a world point, e.g. a hand resting on the thigh (`at: "far.knee", along: "far.thigh"`) or holding a bar on the upper back (`at: "shoulder", along: "torso"`). `offset` is `[along the segment, to its left]`, or a world offset without `along`. |
| `scale: { upperArm, foreArm, hand, thigh, shin, neck }` | Optional foreshortening (1 = full length) for a limb angled towards the camera; `hand: 0.65` reads as a closed fist. |
| `scale: { shoulders, hips }` | Front / top view only: narrows the shoulder / hip line of a turned torso (1 = square to the camera). |
| `near: {...}`, `far: {...}` | Per-side overrides of any limb key (`right` / `left` in front and top view). Without them both sides share the same values. |

Rules: all poses of one exercise must use the same `pin` point and the same set
of IK targets. Keep angles continuous between poses (use `198`, not `-162`, if
the neighbour pose is `183`) because values are interpolated numerically.
Bone lengths never change between frames, so limbs stay attached by construction.

### Props (equipment)

`props` is a list of simple shapes. A **point** is a world position `[x, y]`, a
joint name (`"near.grip"`, `"near.wrist"`, `"far.knee"`, `"shoulder"`, ...), or
`{ at, offset }` / `{ at, along, offset }`. Props attached to joints follow the
figure every frame, so held equipment cannot drift away from the hands
(`near.grip` is the middle of the hand).

| `type` | Fields | Notes |
| --- | --- | --- |
| `rect` | `from`, `to`, `r`, `color` | Bench, wall, mat, machine frame. |
| `poly` | `points`, `r`, `color` | Free shape (inclined pads, footplate). |
| `line` | `a`, `b`, `width`, `color` | Strut / bar with round ends. |
| `cable` | `a`, `b`, `width` | Thin line, always straight between its two points (taut). |
| `band` | `a`, `b`, `width`, `color` | Resistance band: taut gold (default) or red line with a thin dark rim so it stays readable over the figure. Stretches with the hands because its ends are points. |
| `circle` / `ring` | `at`, `r`, `width`, `color` | Pulley, ball, handle loop. |
| `plate` | `at`, `r` | Barbell seen end-on: round plate with gold ring. |
| `barEnd` | `at`, `r`, `color` | Bar seen end-on (pull-up bar, cable bar). |
| `dumbbell` | `at`, `angle`, `along`, `length`, `plate: [thickness, height]` | Handle + two plates. `angle` is absolute, or relative to the `along` segment. |
| `kettlebell` | `at`, `angle`, `along`, `r`, `bodyLayer` | Handle loop at the grip + round body; `angle` points from the grip to the body. |

`layer` places a prop in the figure's draw order: `back` (behind the figure,
default for static shapes), `afterFar` (in front of the far limbs), `body`
(in front of torso and head), `mid` (behind the near arm only, default for held
equipment) or `front`.

## Wiring into the app

`node tools/anim/wire.js` copies each animation to `media/anim/<id>.mp4` +
`media/anim/<id>.jpg`, points the poster of every clip listed for it in
`clip-map.json` at that poster (in `videos/drive-catalog.json`,
`js/catalog.json` and `data/drive_videos.json`) and writes
`videos/anim-map.json`. `--check` verifies, `--revert` restores the data files.
Playback of those clips switches once `js/core.js` reads `videos/anim-map.json`;
the change is written out in [`WIRING_NOTES.md`](./WIRING_NOTES.md).

## Outputs in git

The MP4s are small (about 0.03 - 0.18 MB each), so they are committed with the posters and contact sheets.
