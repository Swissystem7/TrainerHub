'use strict';
/**
 * Turns solved joints into a flat-design figure: a back-to-front list of
 * filled shapes in WORLD units (metres). The renderer maps them to pixels.
 *
 * Side view: figure facing +x. "far" limbs are drawn first, in a darker
 * shade, so the two sides read as depth.
 * Front / top view: symmetric figure facing the viewer, same look.
 *
 * Every shape carries a group tag `g` (farArm, farLeg, torso, head, nearLeg,
 * nearArm) so the renderer can slot equipment between body parts.
 */
const { hexToRgb, mix } = require('./raster');

// Brand palette: red + gold, plus white / gray neutrals. Nothing else.
const PALETTE = {
  red: '#C22826',
  gold: '#E6B731',
  white: '#F2F2F2',
  wall: '#222222',
  floor: '#2B2B2B',
  shade: '#141414',
  hair: '#4A4A4A',
  // Equipment neutrals.
  steel: '#C9C9C9',
  metal: '#8C8C8C',
  frame: '#5E5E5E',
  iron: '#4A4A4A',
  pad: '#3A3A3A',
  dark: '#333333'
};

function colors() {
  const c = {};
  for (const [k, v] of Object.entries(PALETTE)) c[k] = hexToRgb(v);
  const far = (rgb) => mix(rgb, c.shade, 0.32); // far-side limbs: same hue, darker
  return {
    ...c,
    skin: c.white,
    shirt: c.red,
    shorts: c.gold,
    shoe: c.red,
    skinFar: far(c.white),
    shirtFar: far(c.red),
    shortsFar: far(c.gold),
    shoeFar: far(c.red)
  };
}

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const unit = (a, b) => {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
};

function buildShapes(j, body, C, view = 'side', opts = {}) {
  if (view !== 'side') return buildFront(j, body, C, opts);
  const shapes = [];
  let group = '';
  const cone = (a, b, ra, rb, color, extra) => shapes.push({ kind: 'cone', a, b, ra, rb, color, g: group, ...extra });
  // Keep only the part of a limb from `a` up to fraction `t` towards `b` (flat hem).
  const hem = (a, b, t) => ({ clip: { p: lerp(a, b, t), n: unit(a, b) } });

  const leg = (s, far) => {
    group = far ? 'farLeg' : 'nearLeg';
    const skin = far ? C.skinFar : C.skin;
    cone(s.knee, s.ankle, 0.056, 0.038, skin);
    cone(j.hip, s.knee, 0.088, 0.058, skin);
    cone(j.hip, s.knee, 0.094, 0.064, far ? C.shortsFar : C.shorts, hem(j.hip, s.knee, 0.52));
    cone(s.heel, s.toe, 0.045, 0.03, far ? C.shoeFar : C.shoe);
  };

  const arm = (s, far) => {
    group = far ? 'farArm' : 'nearArm';
    const skin = far ? C.skinFar : C.skin;
    if (!far) {
      // Soft dark rim so the near arm stays readable where it crosses the torso.
      const rim = { alpha: 0.4 };
      cone(j.shoulder, s.elbow, 0.066, 0.05, C.shade, rim);
      cone(s.elbow, s.wrist, 0.05, 0.038, C.shade, rim);
    }
    cone(s.wrist, s.handTip, 0.03, 0.024, skin);
    cone(s.elbow, s.wrist, 0.042, 0.03, skin);
    cone(j.shoulder, s.elbow, 0.052, 0.042, skin);
    cone(j.shoulder, s.elbow, 0.058, 0.047, far ? C.shirtFar : C.shirt, hem(j.shoulder, s.elbow, 0.46));
  };

  arm(j.far, true);
  leg(j.far, true);

  // Neck, then torso (waist -> chest -> shoulder) with the shorts' waistband.
  group = 'torso';
  cone(lerp(j.shoulder, j.head, 0.2), j.head, 0.046, 0.042, C.skin);
  if (!j.bent) {
    const chest = lerp(j.hip, j.shoulder, 0.72);
    cone(j.hip, chest, 0.096, 0.12, C.shirt);
    cone(chest, j.shoulder, 0.12, 0.104, C.shirt);
    cone(j.hip, chest, 0.099, 0.123, C.shorts, hem(j.hip, chest, 0.3));
  } else {
    // Bent spine: same silhouette, split at the waist.
    const chest = lerp(j.spineMid, j.shoulder, 0.44);
    const rMid = 0.096 + (0.12 - 0.096) * (0.5 / 0.72);
    cone(j.hip, j.spineMid, 0.096, rMid, C.shirt);
    cone(j.spineMid, chest, rMid, 0.12, C.shirt);
    cone(chest, j.shoulder, 0.12, 0.104, C.shirt);
    cone(j.hip, j.spineMid, 0.099, rMid + 0.003, C.shorts, hem(j.hip, j.spineMid, 0.6));
  }

  // Head with a simple hair cap on the top/back (no face, no likeness).
  group = 'head';
  const up = j.neckDir;
  const face = [up[1], -up[0]];
  const hn = unit([0, 0], [0.72 * up[0] - 0.7 * face[0], 0.72 * up[1] - 0.7 * face[1]]);
  cone(j.head, j.head, body.headR, body.headR, C.skin);
  cone(j.head, j.head, body.headR + 0.004, body.headR + 0.004, C.hair, {
    clip: { p: [j.head[0] + hn[0] * 0.012, j.head[1] + hn[1] * 0.012], n: [-hn[0], -hn[1]] }
  });

  leg(j.near, false);
  arm(j.near, false);
  return shapes;
}

/** Front / top view: figure faces the viewer, both sides in full colour. */
function buildFront(j, body, C, opts = {}) {
  const shapes = [];
  let group = '';
  const cone = (a, b, ra, rb, color, extra) => shapes.push({ kind: 'cone', a, b, ra, rb, color, g: group, ...extra });
  const hem = (a, b, t) => ({ clip: { p: lerp(a, b, t), n: unit(a, b) } });

  const legs = (g) => {
    group = g;
    for (const s of [j.far, j.near]) {
      cone(s.knee, s.ankle, 0.056, 0.038, C.skin);
      cone(s.hip, s.knee, 0.088, 0.058, C.skin);
      cone(s.hip, s.knee, 0.094, 0.064, C.shorts, hem(s.hip, s.knee, 0.52));
      cone(s.heel, s.toe, 0.045, 0.04, C.shoe);
    }
  };
  // Default: legs behind the torso. `legsInFront` (exercise option) is for legs raised towards the
  // camera, e.g. toes-to-bar seen from the front: they are drawn last, over torso, head and arms.
  if (!opts.legsInFront) legs('farLeg');

  group = 'torso';
  cone(lerp(j.shoulder, j.head, 0.2), j.head, 0.046, 0.042, C.skin);
  // Torso: rounded trapezoid in the torso frame (u = along the spine, v = to the figure's side).
  const u = unit(j.hip, j.shoulder),
    v = [u[1], -u[0]];
  const L = Math.hypot(j.shoulder[0] - j.hip[0], j.shoulder[1] - j.hip[1]);
  const at = (across, along) => [j.hip[0] + v[0] * across + u[0] * along, j.hip[1] + v[1] * across + u[1] * along];
  const outline = (grow) => ({
    kind: 'poly',
    r: 0.055 + grow,
    g: group,
    pts: [at(-0.105, -0.015), at(0.105, -0.015), at(0.15, L - 0.045), at(-0.15, L - 0.045)]
  });
  shapes.push({ ...outline(0), color: C.shirt });
  shapes.push({ ...outline(0.003), color: C.shorts, clip: { p: at(0, L * 0.3), n: u } });

  group = 'head';
  const up = j.neckDir;
  cone(j.head, j.head, body.headR, body.headR, C.skin);
  cone(j.head, j.head, body.headR + 0.004, body.headR + 0.004, C.hair, {
    clip: { p: [j.head[0] + up[0] * 0.04, j.head[1] + up[1] * 0.04], n: [-up[0], -up[1]] }
  });

  group = 'nearArm';
  for (const s of [j.far, j.near]) {
    const rim = { alpha: 0.4 };
    cone(s.shoulder, s.elbow, 0.066, 0.05, C.shade, rim);
    cone(s.elbow, s.wrist, 0.05, 0.038, C.shade, rim);
    cone(s.wrist, s.handTip, 0.03, 0.024, C.skin);
    cone(s.elbow, s.wrist, 0.042, 0.03, C.skin);
    cone(s.shoulder, s.elbow, 0.052, 0.042, C.skin);
    cone(s.shoulder, s.elbow, 0.058, 0.047, C.shirt, hem(s.shoulder, s.elbow, 0.46));
  }
  if (opts.legsInFront) legs('nearLeg');
  return shapes;
}

/** Bounding box of one world-space shape: [minX, minY, maxX, maxY]. */
function bounds(s) {
  if (s.kind === 'cone') {
    return [
      Math.min(s.a[0] - s.ra, s.b[0] - s.rb),
      Math.min(s.a[1] - s.ra, s.b[1] - s.rb),
      Math.max(s.a[0] + s.ra, s.b[0] + s.rb),
      Math.max(s.a[1] + s.ra, s.b[1] + s.rb)
    ];
  }
  if (s.kind === 'poly') {
    const r = s.r || 0;
    const xs = s.pts.map((p) => p[0]),
      ys = s.pts.map((p) => p[1]);
    return [Math.min(...xs) - r, Math.min(...ys) - r, Math.max(...xs) + r, Math.max(...ys) + r];
  }
  if (s.kind === 'ring') {
    const o = s.r + s.w;
    return [s.c[0] - o, s.c[1] - o, s.c[0] + o, s.c[1] + o];
  }
  return null;
}

/** Lowest point of the figure (for the "nothing goes through the floor" check). */
function lowestPoint(shapes) {
  let min = Infinity;
  for (const s of shapes) {
    if (s.clip || s.alpha != null) continue;
    const b = bounds(s);
    if (b) min = Math.min(min, b[1]);
  }
  return min;
}

/** Horizontal extent of the figure (for the floor shadow). */
function extentX(shapes) {
  let lo = Infinity,
    hi = -Infinity;
  for (const s of shapes) {
    const b = bounds(s);
    if (!b) continue;
    lo = Math.min(lo, b[0]);
    hi = Math.max(hi, b[2]);
  }
  return [lo, hi];
}

module.exports = { PALETTE, colors, buildShapes, bounds, lowestPoint, extentX };
