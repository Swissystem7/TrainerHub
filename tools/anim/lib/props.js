'use strict';
/**
 * Equipment ("props"): simple flat shapes in neutral grays with gold / red
 * accents, described in the exercise JSON and drawn in WORLD units.
 *
 * A point is either a world position [x, y], a joint name ("near.grip"), or
 * { at, offset } / { at, along, offset } (see skeleton.pointOn). Props whose
 * points are joints follow the figure every frame, so held equipment can
 * never drift away from the hands.
 *
 * Every prop has a `layer` that says where it sits in the figure's draw order:
 *   back      behind the whole figure (default for static shapes)
 *   afterFar  in front of the far arm and far leg, behind the torso
 *   body      in front of torso and head, behind the near leg
 *   mid       in front of the near leg, behind the near arm (default for held equipment)
 *   front     in front of everything
 */
const { pointOn, segmentAngle } = require('./skeleton');

const LAYERS = ['back', 'afterFar', 'body', 'mid', 'front'];
const rad = (deg) => (deg * Math.PI) / 180;
const dirOf = (deg) => [Math.cos(rad(deg)), Math.sin(rad(deg))];

function color(C, name, fallback) {
  const key = name || fallback;
  const allowed = ['red', 'gold', 'white', 'steel', 'metal', 'frame', 'iron', 'pad', 'dark', 'wall', 'floor', 'shade'];
  if (!allowed.includes(key)) throw new Error(`Prop colour "${key}" is not in the palette (${allowed.join(', ')})`);
  return C[key];
}

/** Absolute direction of a prop: `angle` alone is absolute, with `along` it is relative to that segment. */
function direction(def, j, fallback) {
  const a = def.angle ?? fallback;
  return def.along ? segmentAngle(j, def.along) + a : a;
}

const disc = (c, r, col, extra) => ({ kind: 'cone', a: c, b: c, ra: r, rb: r, color: col, ...extra });
const capsule = (a, b, r, col, extra) => ({ kind: 'cone', a, b, ra: r, rb: r, color: col, ...extra });
/** Rectangle centred on c: half-length hl along unit vector u, half-width hw across, corner radius r. */
function box(c, u, hl, hw, r, col) {
  const n = [-u[1], u[0]];
  const a = hl - r,
    b = hw - r;
  const pt = (s, t) => [c[0] + u[0] * a * s + n[0] * b * t, c[1] + u[1] * a * s + n[1] * b * t];
  return { kind: 'poly', pts: [pt(-1, -1), pt(1, -1), pt(1, 1), pt(-1, 1)], r, color: col };
}

const BUILDERS = {
  /** Axis-aligned rectangle: { from: [x0, y0], to: [x1, y1], r } */
  rect(def, j, C) {
    const a = pointOn(j, def.from),
      b = pointOn(j, def.to);
    const r = Math.min(def.r || 0, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2);
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return [box(c, [1, 0], Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2, r, color(C, def.color, 'frame'))];
  },
  /** Free polygon: { points: [...], r } (r grows the outline and rounds the corners) */
  poly(def, j, C) {
    return [
      { kind: 'poly', pts: def.points.map((p) => pointOn(j, p)), r: def.r || 0, color: color(C, def.color, 'frame') }
    ];
  },
  /** Straight bar / cable / strut with round ends: { a, b, width } */
  line(def, j, C) {
    return [capsule(pointOn(j, def.a), pointOn(j, def.b), (def.width || 0.02) / 2, color(C, def.color, 'steel'))];
  },
  /** Thin taut cable: { a, b } */
  cable(def, j, C) {
    return [capsule(pointOn(j, def.a), pointOn(j, def.b), (def.width || 0.009) / 2, color(C, def.color, 'steel'))];
  },
  /** Resistance band: taut coloured line with a thin dark rim so it reads over the figure. { a, b, width, color } */
  band(def, j, C) {
    const a = pointOn(j, def.a),
      b = pointOn(j, def.b),
      w = (def.width || 0.014) / 2;
    return [capsule(a, b, w + 0.005, C.shade, { alpha: 0.55 }), capsule(a, b, w, color(C, def.color, 'gold'))];
  },
  /** { at, r } */
  circle(def, j, C) {
    return [disc(pointOn(j, def.at), def.r, color(C, def.color, 'frame'))];
  },
  /** Circle outline: { at, r, width } */
  ring(def, j, C) {
    return [
      { kind: 'ring', c: pointOn(j, def.at), r: def.r, w: (def.width || 0.02) / 2, color: color(C, def.color, 'frame') }
    ];
  },
  /** Barbell / bar seen end-on: round plate with a gold ring and the bar end in the middle. { at, r } */
  plate(def, j, C) {
    const c = pointOn(j, def.at),
      r = def.r || 0.14;
    return [
      disc(c, r, color(C, def.color, 'iron')),
      { kind: 'ring', c, r: r * 0.78, w: 0.006, color: color(C, def.accent, 'gold') },
      disc(c, Math.max(0.028, r * 0.2), C.frame),
      disc(c, 0.017, C.steel)
    ];
  },
  /** Bar seen end-on (pull-up bar, cable bar): { at, r } */
  barEnd(def, j, C) {
    const c = pointOn(j, def.at),
      r = def.r || 0.02;
    return [disc(c, r, color(C, def.color, 'steel'))];
  },
  /** Dumbbell seen from the side: handle + two plates. { at, angle | along + angle, length, plate: [thickness, height] } */
  dumbbell(def, j, C) {
    const c = pointOn(j, def.at);
    const u = dirOf(direction(def, j, 0));
    const len = def.length || 0.24;
    const [pt, ph] = def.plate || [0.055, 0.12];
    const end = (s) => [c[0] + u[0] * s, c[1] + u[1] * s];
    const mid = (len - pt) / 2;
    return [
      capsule(end(-mid), end(mid), 0.014, C.steel),
      box(end(-mid), u, pt / 2, ph / 2, 0.012, color(C, def.color, 'iron')),
      box(end(mid), u, pt / 2, ph / 2, 0.012, color(C, def.color, 'iron')),
      box(end(-mid), u, 0.006, ph / 2, 0.004, color(C, def.accent, 'gold')),
      box(end(mid), u, 0.006, ph / 2, 0.004, color(C, def.accent, 'gold'))
    ];
  },
  /**
   * Skipping rope seen from the side: a thin bowed line from the hand to the far point of the loop,
   * turning once per `period` seconds (time-driven, so it needs the frame time `j.t`).
   * { at, r, period, phase (degrees at t = 0), dir (-1 = clockwise), bow, floor, width, color }
   * `floor` is the lowest height the rope may reach: it skims the floor instead of passing through it.
   */
  rope(def, j, C) {
    const h = pointOn(j, def.at);
    const deg = (def.phase ?? 90) + (def.dir ?? -1) * 360 * ((j.t || 0) / (def.period || 1));
    const u = dirOf(deg);
    let r = def.r || 1;
    const floor = def.floor ?? 0.012;
    if (u[1] < 0 && h[1] + u[1] * r < floor) r = (h[1] - floor) / -u[1];
    const tip = [h[0] + u[0] * r, h[1] + u[1] * r];
    // The loop trails slightly behind the hands: bow the line against the direction of travel.
    const k = (def.bow ?? 0.1) * r * -(def.dir ?? -1);
    const ctrl = [(h[0] + tip[0]) / 2 - u[1] * k, Math.max(floor, (h[1] + tip[1]) / 2 + u[0] * k)];
    const col = color(C, def.color, 'gold');
    const w = (def.width || 0.012) / 2;
    const out = [];
    const n = 12;
    let prev = h;
    for (let i = 1; i <= n; i++) {
      const s = i / n;
      const p = [
        (1 - s) * (1 - s) * h[0] + 2 * s * (1 - s) * ctrl[0] + s * s * tip[0],
        (1 - s) * (1 - s) * h[1] + 2 * s * (1 - s) * ctrl[1] + s * s * tip[1]
      ];
      out.push(capsule(prev, p, w, col));
      prev = p;
    }
    return out;
  },
  /**
   * Kettlebell: handle loop at the grip + round body. `angle` is the direction from the grip to the
   * body (absolute, or relative to `along`). { at, angle, along, r }
   */
  kettlebell(def, j, C) {
    const g = pointOn(j, def.at);
    const u = dirOf(direction(def, j, -90));
    const r = def.r || 0.09;
    const col = color(C, def.color, 'iron');
    const ringC = [g[0] + u[0] * 0.04, g[1] + u[1] * 0.04];
    const bodyC = [g[0] + u[0] * (0.06 + r), g[1] + u[1] * (0.06 + r)];
    return [
      { kind: 'ring', c: ringC, r: 0.046, w: 0.012, color: col, part: 'handle' },
      { ...disc(bodyC, r, col), part: 'body' },
      { ...disc(bodyC, r * 0.3, color(C, def.accent, 'gold')), part: 'body' }
    ];
  }
};

/**
 * Build all props for one frame.
 * Returns { back: [...], afterFar: [...], body: [...], mid: [...], front: [...] } of world-space shapes.
 */
function buildProps(defs, j, C) {
  const out = {};
  for (const l of LAYERS) out[l] = [];
  for (const def of defs || []) {
    const build = BUILDERS[def.type];
    if (!build) throw new Error(`Unknown prop type "${def.type}" (${Object.keys(BUILDERS).join(', ')})`);
    const held = ['plate', 'barEnd', 'dumbbell', 'kettlebell'].includes(def.type);
    const layer = def.layer || (held ? 'mid' : 'back');
    if (!out[layer]) throw new Error(`Unknown prop layer "${layer}" (${LAYERS.join(', ')})`);
    for (const s of build(def, j, C)) {
      // A kettlebell may put its body on another layer than its handle (bell resting on the forearm).
      const l = s.part === 'body' && def.bodyLayer ? def.bodyLayer : layer;
      if (def.alpha != null) s.alpha = def.alpha;
      out[l].push(s);
    }
  }
  return out;
}

/** True when a prop does not depend on the figure (can be drawn once into the background). */
function isStatic(def) {
  try {
    buildProps([def], {}, new Proxy({}, { get: () => [0, 0, 0] }));
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = { LAYERS, buildProps, isStatic };
