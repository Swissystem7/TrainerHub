'use strict';
/**
 * Pose model: keyframe interpolation + forward/inverse kinematics.
 *
 * World units are metres, x to the right, y up, floor at y = 0.
 * Angles are absolute, in degrees, counter-clockwise from +x, and give the
 * direction a segment points from its parent joint to its child joint
 * (standing upright: torso 90, neck 90, thigh -90, shin -90, foot 0,
 * arms hanging: upperArm -90, foreArm -90, hand -90).
 *
 * Segments share their joints, so limbs always stay attached.
 *
 * Views:
 *   side   profile, figure faces +x; sides are `near` / `far`.
 *   front  figure faces the viewer; sides are `right` / `left` as seen on
 *          screen (aliases of near / far). Hips and shoulders are spread
 *          sideways, and top-level limb values are mirrored for the left side.
 *   top    same solver as `front` (a supine figure seen from above, head up).
 */

// Adult proportions, about 1.77 m standing.
const DEFAULT_BODY = {
  torso: 0.48, // hip joint -> shoulder joint
  neck: 0.235, // shoulder joint -> head centre
  headR: 0.105,
  upperArm: 0.3,
  foreArm: 0.27,
  hand: 0.09,
  thigh: 0.44,
  shin: 0.43,
  toe: [0.14, -0.045], // toe centre, in the foot frame (origin = ankle)
  heel: [-0.035, -0.035], // heel centre, in the foot frame
  hipHalf: 0.085, // front / top view: half the distance between the hip joints
  shoulderHalf: 0.185 // front / top view: half the distance between the shoulder joints
};
// Front view: the foot points at the viewer, so it is drawn short.
const FRONT_BODY = { toe: [0.03, -0.04], heel: [-0.012, -0.036] };

const SIDES = ['near', 'far'];
const SIDE_ALIAS = { near: 'near', far: 'far', right: 'near', left: 'far' };
const ALT_NAME = { near: 'right', far: 'left' };
const ANGLE_KEYS = ['thigh', 'shin', 'foot', 'upperArm', 'foreArm', 'hand'];
const SCALE_KEYS = ['upperArm', 'foreArm', 'hand', 'thigh', 'shin'];
const STANDING = { torso: 90, neck: 90, thigh: -90, shin: -90, foot: 0, upperArm: -90, foreArm: -90, hand: -90 };

const EASINGS = {
  linear: (u) => u,
  inOutSine: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  inOutCubic: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  inOutQuad: (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
  outCubic: (u) => 1 - Math.pow(1 - u, 3),
  inCubic: (u) => u * u * u,
  outQuad: (u) => 1 - (1 - u) * (1 - u),
  inQuad: (u) => u * u
};

const rad = (deg) => (deg * Math.PI) / 180;
const polar = (p, len, deg) => [p[0] + len * Math.cos(rad(deg)), p[1] + len * Math.sin(rad(deg))];
const rotate = (v, deg) => {
  const c = Math.cos(rad(deg)),
    s = Math.sin(rad(deg));
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
};
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];

/** A named joint, e.g. "hip", "shoulder", "head", "near.wrist", "far.knee", "right.grip". */
function anchor(j, name) {
  const parts = String(name).split('.');
  let p;
  if (parts.length === 1) p = j[name];
  else if (SIDE_ALIAS[parts[0]] && j[SIDE_ALIAS[parts[0]]]) p = j[SIDE_ALIAS[parts[0]]][parts[1]];
  if (!Array.isArray(p)) throw new Error(`Unknown anchor point "${name}"`);
  return p;
}

/** A named segment as [from, to], e.g. "torso", "near.foreArm", "far.foot". */
function segment(j, name) {
  if (name === 'torso') return [j.hip, j.shoulder];
  if (name === 'neck') return [j.shoulder, j.head];
  const [sideName, seg] = String(name).split('.');
  const s = j[SIDE_ALIAS[sideName]];
  const map = s && {
    upperArm: [s.shoulder, s.elbow],
    foreArm: [s.elbow, s.wrist],
    hand: [s.wrist, s.handTip],
    thigh: [s.hip, s.knee],
    shin: [s.knee, s.ankle],
    foot: [s.heel, s.toe]
  };
  if (!map || !map[seg] || !map[seg][0] || !map[seg][1]) throw new Error(`Unknown segment "${name}"`);
  return map[seg];
}

/**
 * Resolve a point spec against solved joints:
 *   [x, y]                                    world position
 *   "near.grip"                               a joint
 *   { at, offset: [dx, dy] }                  joint + world offset
 *   { at, along, offset: [a, b] }             joint + a along the segment direction + b to its left (CCW)
 */
function pointOn(j, spec) {
  if (Array.isArray(spec)) return spec;
  if (typeof spec === 'string') return anchor(j, spec);
  const base = Array.isArray(spec.at) ? spec.at : anchor(j, spec.at);
  const off = spec.offset || [0, 0];
  if (!spec.along) return add(base, off);
  const [a, b] = segment(j, spec.along);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / d,
    uy = (b[1] - a[1]) / d;
  return [base[0] + ux * off[0] - uy * off[1], base[1] + uy * off[0] + ux * off[1]];
}

/** Direction (degrees) of a named segment. */
function segmentAngle(j, name) {
  const [a, b] = segment(j, name);
  return (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
}

function deepMerge(base, over) {
  const out = Object.assign({}, base);
  for (const [k, v] of Object.entries(over)) {
    out[k] =
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      base[k] &&
      typeof base[k] === 'object' &&
      !Array.isArray(base[k])
        ? deepMerge(base[k], v)
        : v;
  }
  return out;
}

/** Resolve `"base": "<other pose>"` inheritance. */
function resolvePose(poses, name, seen = []) {
  const p = poses[name];
  if (!p) throw new Error(`Unknown pose "${name}"`);
  if (!p.base) return p;
  if (seen.includes(name)) throw new Error(`Pose "${name}": circular "base"`);
  const merged = deepMerge(resolvePose(poses, p.base, seen.concat(name)), p);
  delete merged.base;
  return merged;
}

/**
 * Turn an authored pose into { num: {flat numeric fields}, meta: {discrete fields} }.
 * Top-level limb keys apply to both sides; `near` / `far` objects override one side.
 */
function flattenPose(pose, name, view = 'side') {
  const frontal = view !== 'side';
  const num = {};
  const meta = { pin: null, ik: {}, to: {} };
  num.torso = pose.torso ?? STANDING.torso;
  num.neck = pose.neck ?? num.torso;
  // Optional spine bend: `waist` is the direction of the lower half of the torso.
  num.waist = pose.waist ?? num.torso;
  num['scale.neck'] = (pose.scale && pose.scale.neck) ?? 1;
  // Front / top view: a turned torso shows its shoulder / hip line narrower (1 = square to the camera).
  num['scale.shoulders'] = (pose.scale && pose.scale.shoulders) ?? 1;
  num['scale.hips'] = (pose.scale && pose.scale.hips) ?? 1;
  if (pose.pin) {
    meta.pin = pose.pin.point;
    num['pin.x'] = pose.pin.at[0];
    num['pin.y'] = pose.pin.at[1];
  } else {
    if (!pose.pelvis) throw new Error(`Pose "${name}": needs either "pelvis" or "pin"`);
    num['pelvis.x'] = pose.pelvis[0];
    num['pelvis.y'] = pose.pelvis[1];
  }
  const axis = pose.axis ?? (pose.pelvis ? pose.pelvis[0] : 0);
  for (const side of SIDES) {
    const ov = pose[side] || pose[ALT_NAME[side]] || {};
    // Front / top view: shared values describe the right side and are mirrored for the left.
    const mirror = frontal && side === 'far';
    for (const k of ANGLE_KEYS) {
      let v = ov[k];
      if (v == null) {
        v = pose[k] ?? STANDING[k];
        if (mirror) v = k === 'foot' ? -v : 180 - v;
      }
      num[`${side}.${k}`] = v;
    }
    // Optional foreshortening: a limb angled towards/away from the camera looks
    // shorter in a flat view (e.g. elbows flaring out at the bottom of a push-up).
    for (const k of SCALE_KEYS) {
      num[`${side}.scale.${k}`] = (ov.scale && ov.scale[k]) ?? (pose.scale && pose.scale[k]) ?? 1;
    }
    for (const [target, bendKey] of [
      ['wrist', 'elbowBend'],
      ['ankle', 'kneeBend']
    ]) {
      let bend = ov[bendKey];
      if (bend == null) {
        bend = pose[bendKey] ?? (target === 'wrist' ? -1 : 1);
        if (mirror) bend = -bend;
      }
      let tgt = ov[target];
      if (!tgt && pose[target]) tgt = mirror ? [2 * axis - pose[target][0], pose[target][1]] : pose[target];
      const to = target === 'wrist' ? ov.wristTo || (ov.wrist ? null : pose.wristTo) : null;
      if (to && !ov.wrist) {
        // Wrist follows a body point (e.g. a hand resting on the knee, or on a bar across the back).
        const off = to.offset || [0, 0];
        num[`${side}.wristTo.x`] = off[0];
        num[`${side}.wristTo.y`] = off[1];
        meta.to[side] = { at: to.at, along: to.along || null };
        meta.ik[`${side}.wristTo`] = bend;
      } else if (tgt) {
        num[`${side}.${target}.x`] = tgt[0];
        num[`${side}.${target}.y`] = tgt[1];
        meta.ik[`${side}.${target}`] = bend;
      }
    }
  }
  return { num, meta };
}

/** Compile an exercise definition into a function t(seconds) -> flat pose. */
function compileExercise(ex) {
  const view = ex.view || 'side';
  const poses = {};
  for (const name of Object.keys(ex.poses)) poses[name] = flattenPose(resolvePose(ex.poses, name), name, view);
  const names = Object.keys(poses);
  const first = poses[names[0]];
  for (const n of names) {
    if (
      JSON.stringify(poses[n].meta) !== JSON.stringify(first.meta) ||
      Object.keys(poses[n].num).join() !== Object.keys(first.num).join()
    ) {
      throw new Error(`Pose "${n}" must use the same pin / IK targets as pose "${names[0]}"`);
    }
  }
  const keys = ex.timeline.map((k) => {
    if (!poses[k.pose]) throw new Error(`Timeline references unknown pose "${k.pose}"`);
    const ease = EASINGS[k.ease || 'inOutSine'];
    if (!ease) throw new Error(`Unknown easing "${k.ease}"`);
    return { t: k.t, pose: poses[k.pose].num, ease };
  });
  if (keys[0].t !== 0) throw new Error('Timeline must start at t = 0');
  for (let i = 1; i < keys.length; i++) {
    if (keys[i].t <= keys[i - 1].t) throw new Error('Timeline times must increase');
  }
  const cycle = keys[keys.length - 1].t;
  const repeat = ex.repeat || 1;
  const fields = Object.keys(first.num);
  for (const f of fields) {
    if (Math.abs(keys[0].pose[f] - keys[keys.length - 1].pose[f]) > 1e-9) {
      throw new Error(`Loop is not closed: first and last timeline pose differ in "${f}"`);
    }
  }

  function poseAt(t) {
    const tc = ((t % cycle) + cycle) % cycle;
    let i = 1;
    while (i < keys.length - 1 && tc >= keys[i].t) i++;
    const k0 = keys[i - 1],
      k1 = keys[i];
    const u = k1.ease(Math.min(1, Math.max(0, (tc - k0.t) / (k1.t - k0.t))));
    const out = {};
    for (const f of fields) out[f] = k0.pose[f] + (k1.pose[f] - k0.pose[f]) * u;
    return out;
  }

  return { poseAt, meta: first.meta, view, cycle, repeat, duration: cycle * repeat };
}

/** Two-bone IK. bend = +1 puts the middle joint counter-clockwise of root->target. */
function twoBoneIK(root, target, a, b, bend) {
  let dx = target[0] - root[0],
    dy = target[1] - root[1];
  let d = Math.hypot(dx, dy);
  if (d < 1e-9) {
    dx = 1;
    dy = 0;
    d = 1e-9;
  }
  const ux = dx / d,
    uy = dy / d;
  const dc = Math.min(a + b - 1e-6, Math.max(Math.abs(a - b) + 1e-6, d));
  const x = (a * a - b * b + dc * dc) / (2 * dc);
  const h = Math.sqrt(Math.max(0, a * a - x * x)) * bend;
  return {
    mid: [root[0] + ux * x - uy * h, root[1] + uy * x + ux * h],
    end: [root[0] + ux * dc, root[1] + uy * dc],
    miss: Math.abs(d - dc)
  };
}

/** Solve joint positions for one interpolated pose. */
function solve(p, meta, body = DEFAULT_BODY, view = 'side') {
  const frontal = view !== 'side';
  const build = (hip, useIK) => {
    const j = { hip, reach: 0 };
    if (p.waist === p.torso) {
      j.shoulder = polar(hip, body.torso, p.torso);
      j.spineMid = polar(hip, body.torso * 0.5, p.torso);
      j.bent = false;
    } else {
      j.spineMid = polar(hip, body.torso * 0.5, p.waist);
      j.shoulder = polar(j.spineMid, body.torso * 0.5, p.torso);
      j.bent = true;
    }
    j.head = polar(j.shoulder, body.neck * p['scale.neck'], p.neck);
    j.neckDir = rotate([1, 0], p.neck);
    j.torsoDeg = p.torso;
    j.waistDeg = p.waist;
    const hipAcross = rotate([1, 0], p.waist - 90),
      shAcross = rotate([1, 0], p.torso - 90);
    const hipHalf = body.hipHalf * p['scale.hips'],
      shoulderHalf = body.shoulderHalf * p['scale.shoulders'];
    for (const side of SIDES) {
      const k = frontal ? (side === 'near' ? 1 : -1) : 0;
      j[side] = {
        hip: k ? [hip[0] + hipAcross[0] * hipHalf * k, hip[1] + hipAcross[1] * hipHalf * k] : hip,
        shoulder: k
          ? [j.shoulder[0] + shAcross[0] * shoulderHalf * k, j.shoulder[1] + shAcross[1] * shoulderHalf * k]
          : j.shoulder
      };
    }
    // Legs first, so a hand can be attached to a leg point.
    for (const side of SIDES) {
      const g = (k) => p[`${side}.${k}`];
      const len = (k) => body[k] * p[`${side}.scale.${k}`];
      const s = j[side];
      const ankleBend = meta.ik[`${side}.ankle`];
      if (useIK && ankleBend != null) {
        const r = twoBoneIK(s.hip, [g('ankle.x'), g('ankle.y')], len('thigh'), len('shin'), ankleBend);
        s.knee = r.mid;
        s.ankle = r.end;
        j.reach = Math.max(j.reach, r.miss);
      } else {
        s.knee = polar(s.hip, len('thigh'), g('thigh'));
        s.ankle = polar(s.knee, len('shin'), g('shin'));
      }
      const flip = frontal && side === 'far' ? -1 : 1;
      s.toe = add(s.ankle, rotate([body.toe[0] * flip, body.toe[1]], g('foot')));
      s.heel = add(s.ankle, rotate([body.heel[0] * flip, body.heel[1]], g('foot')));
    }
    for (const side of SIDES) {
      const g = (k) => p[`${side}.${k}`];
      const len = (k) => body[k] * p[`${side}.scale.${k}`];
      const s = j[side];
      const wristBend = meta.ik[`${side}.wrist`];
      const toBend = meta.ik[`${side}.wristTo`];
      if (useIK && (wristBend != null || toBend != null)) {
        const target =
          toBend != null
            ? pointOn(j, { at: meta.to[side].at, along: meta.to[side].along, offset: [g('wristTo.x'), g('wristTo.y')] })
            : [g('wrist.x'), g('wrist.y')];
        const r = twoBoneIK(s.shoulder, target, len('upperArm'), len('foreArm'), toBend != null ? toBend : wristBend);
        s.elbow = r.mid;
        s.wrist = r.end;
        j.reach = Math.max(j.reach, r.miss);
      } else {
        s.elbow = polar(s.shoulder, len('upperArm'), g('upperArm'));
        s.wrist = polar(s.elbow, len('foreArm'), g('foreArm'));
      }
      s.handTip = polar(s.wrist, len('hand'), g('hand'));
      s.grip = polar(s.wrist, len('hand') * 0.5, g('hand'));
    }
    return j;
  };

  if (!meta.pin) return build([p['pelvis.x'], p['pelvis.y']], true);

  // Pinned pose: place the figure with plain FK, then slide the whole body so
  // the pinned point (e.g. the toes) lands exactly on its world position.
  const fk = build([0, 0], false);
  const [where, side] = meta.pin.split('.').reverse();
  const point = side ? fk[SIDE_ALIAS[side]][where] : fk[where];
  if (!point) throw new Error(`Unknown pin point "${meta.pin}"`);
  return build([p['pin.x'] - point[0], p['pin.y'] - point[1]], true);
}

module.exports = {
  DEFAULT_BODY,
  FRONT_BODY,
  EASINGS,
  SIDES,
  compileExercise,
  solve,
  anchor,
  segment,
  pointOn,
  segmentAngle
};
