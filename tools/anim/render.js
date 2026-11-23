#!/usr/bin/env node
'use strict';
/**
 * Code-drawn exercise animation generator.
 *
 *   node tools/anim/render.js pushups          render one exercise
 *   node tools/anim/render.js --all            render every exercises/*.json (batch)
 *   node tools/anim/render.js pushups --still 1.4 --out /tmp/x   one PNG at t = 1.4 s
 *   node tools/anim/render.js pushups --sheet                    contact sheet (out/contact/<id>.png)
 *   node tools/anim/render.js pushups --joints 1.4               print joint positions at t = 1.4 s
 *
 * Pipeline: exercises/<id>.json (pose keyframes + props) -> interpolated skeleton ->
 * filled shapes -> RGB frames -> ffmpeg (H.264 MP4s + poster PNG).
 * No npm dependencies; needs Node >= 18 and ffmpeg on PATH.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { Canvas } = require('./lib/raster');
const { DEFAULT_BODY, FRONT_BODY, compileExercise, solve } = require('./lib/skeleton');
const { colors, buildShapes, bounds, lowestPoint, extentX } = require('./lib/figure');
const { buildProps, isStatic } = require('./lib/props');

const MASTER = { w: 720, h: 1280 };
const APP = { w: 360, h: 640 };
const EX_DIR = path.join(__dirname, 'exercises');
const VIEWS = ['side', 'front', 'top'];
const SAFE_MARGIN = 24; // px: the figure must stay this far inside the frame

function listExercises() {
  return fs
    .readdirSync(EX_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort();
}

function loadExercise(id) {
  const file = path.join(EX_DIR, `${id}.json`);
  if (!fs.existsSync(file)) throw new Error(`No such exercise: ${file}`);
  const ex = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (ex.id !== id) throw new Error(`${file}: "id" must be "${id}"`);
  if (!VIEWS.includes(ex.view || 'side')) throw new Error(`${file}: "view" must be one of ${VIEWS.join(', ')}`);
  return ex;
}

function makeScene(ex) {
  const C = colors();
  const view = ex.view || 'side';
  const body = Object.assign({}, DEFAULT_BODY, view === 'side' ? {} : FRONT_BODY, ex.body || {});
  const cam = Object.assign({ centerX: 0, width: 2.2, groundY: 0.6 }, ex.camera || {});
  const anim = compileExercise(ex);
  const { w, h } = MASTER;
  const scale = w / cam.width;
  const groundPx = Math.round(h * cam.groundY);
  const X = (x) => (x - cam.centerX) * scale + w / 2;
  const Y = (y) => groundPx - y * scale;
  const P = (p) => [X(p[0]), Y(p[1])];

  /** World-space shape -> pixel-space shape for the rasterizer. */
  const toPx = (s) => {
    let px;
    if (s.kind === 'cone') px = { ...s, a: P(s.a), b: P(s.b), ra: s.ra * scale, rb: s.rb * scale };
    else if (s.kind === 'poly') px = { ...s, pts: s.pts.map(P), r: (s.r || 0) * scale };
    else if (s.kind === 'ring') px = { ...s, c: P(s.c), r: s.r * scale, w: s.w * scale };
    else throw new Error(`Unknown shape kind: ${s.kind}`);
    // World y is up, pixel y is down: flip clip planes too.
    if (s.clip) px.clip = { p: P(s.clip.p), n: [s.clip.n[0], -s.clip.n[1]] };
    return px;
  };

  const props = ex.props || [];
  const staticBack = props.filter((d) => (d.layer || 'back') === 'back' && isStatic(d));
  const liveProps = props.filter((d) => !staticBack.includes(d));

  // Static background: charcoal wall, slightly lighter floor, thin gold ground line.
  // Top view looks straight down, so the whole frame is floor.
  const bg = new Canvas(w, h);
  if (view === 'top') {
    bg.fillRect(0, 0, w, h, C.floor);
  } else {
    bg.fillRect(0, 0, w, groundPx, C.wall);
    bg.fillRect(0, groundPx, w, h, C.floor);
  }
  for (const s of buildProps(staticBack, {}, C).back) bg.draw(toPx(s));
  if (view !== 'top') bg.fillRect(0, groundPx, w, groundPx + 3, C.gold);

  const canvas = new Canvas(w, h);
  const slotBefore = { torso: ['afterFar'], nearLeg: ['afterFar', 'body'], nearArm: ['afterFar', 'body', 'mid'] };

  function drawFrame(t) {
    const joints = solve(anim.poseAt(t), anim.meta, body, view);
    joints.t = t; // time-driven props (skipping rope)
    const shapes = buildShapes(joints, body, C, view, { legsInFront: !!ex.legsInFront });
    const layers = buildProps(liveProps, joints, C);
    canvas.copyFrom(bg);
    if (ex.shadow && ex.shadow.center) {
      const sh = ex.shadow;
      canvas.draw({
        kind: 'ellipse',
        c: P(sh.center),
        rx: sh.rx * scale,
        ry: sh.ry * scale,
        color: C.shade,
        alpha: sh.alpha ?? 0.45,
        soft: sh.soft ?? 40
      });
    } else if (ex.shadow !== false && view !== 'top') {
      const [lo, hi] = extentX(shapes);
      // Optional `shadow: { "air": k }`: the shadow shrinks and fades while the figure is off the floor (jumps).
      const air = (ex.shadow && ex.shadow.air) || 0;
      const shrink = air ? 1 / (1 + air * Math.max(0, lowestPoint(shapes))) : 1;
      canvas.draw({
        kind: 'ellipse',
        c: [X((lo + hi) / 2), groundPx + 16],
        rx: ((hi - lo) / 2) * scale * 0.96 * shrink,
        ry: 9,
        color: C.shade,
        alpha: 0.55 * shrink,
        soft: 8
      });
    }
    const flushed = new Set();
    const flush = (names) => {
      for (const n of names) {
        if (flushed.has(n)) continue;
        flushed.add(n);
        for (const s of layers[n]) canvas.draw(toPx(s));
      }
    };
    flush(['back']);
    let box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const s of shapes) {
      if (slotBefore[s.g]) flush(slotBefore[s.g]);
      canvas.draw(toPx(s));
      const b = bounds(s);
      if (b) box = [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])];
    }
    flush(['afterFar', 'body', 'mid', 'front']);
    // How far the figure pokes out of the safe frame area, in px (<= 0 is fine).
    const overflow = Math.max(
      SAFE_MARGIN - X(box[0]),
      X(box[2]) - (w - SAFE_MARGIN),
      SAFE_MARGIN - Y(box[3]),
      Y(box[1]) - (h - SAFE_MARGIN)
    );
    return { buf: canvas.buf, floor: lowestPoint(shapes), reach: joints.reach, overflow, joints };
  }

  return { anim, drawFrame, fps: ex.fps || 30, view };
}

function writePng(buf, file, w = MASTER.w, h = MASTER.h) {
  const r = spawnSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-s',
      `${w}x${h}`,
      '-i',
      '-',
      '-frames:v',
      '1',
      '-update',
      '1',
      file
    ],
    { input: buf }
  );
  if (r.status !== 0) throw new Error(`ffmpeg (png) failed: ${r.stderr}`);
}

/** ffprobe an MP4 and check it against the delivery spec. Returns a list of problems. */
function verifyMp4(file, width, height, fps, seconds) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {
    encoding: 'utf8'
  });
  if (r.status !== 0) return [`ffprobe failed: ${r.stderr}`];
  const info = JSON.parse(r.stdout);
  const video = info.streams.filter((s) => s.codec_type === 'video');
  const audio = info.streams.filter((s) => s.codec_type === 'audio');
  const v = video[0] || {};
  const data = fs.readFileSync(file);
  const crf = (/crf=([\d.]+)/.exec(data.toString('latin1')) || [])[1]; // from the x264 settings string
  const faststart = data.indexOf('moov') !== -1 && data.indexOf('moov') < data.indexOf('mdat');
  const duration = Number(info.format.duration);
  console.log(
    `  ffprobe ${path.basename(file)}: ${v.codec_name} ${v.profile} ${v.width}x${v.height} ` +
      `${v.pix_fmt} ${v.r_frame_rate} fps, ${v.nb_frames} frames, ${duration.toFixed(2)} s, crf=${crf}, ` +
      `audio streams=${audio.length}, faststart=${faststart}`
  );
  const problems = [];
  const expect = (ok, msg) => {
    if (!ok) problems.push(`${path.basename(file)}: ${msg}`);
  };
  expect(video.length === 1, 'expected exactly one video stream');
  expect(audio.length === 0, 'must not have an audio stream');
  expect(v.codec_name === 'h264' && v.profile === 'Main', `expected H.264 Main, got ${v.codec_name} ${v.profile}`);
  expect(v.width === width && v.height === height, `expected ${width}x${height}`);
  expect(v.pix_fmt === 'yuv420p', `expected yuv420p, got ${v.pix_fmt}`);
  expect(v.r_frame_rate === `${fps}/1`, `expected ${fps} fps, got ${v.r_frame_rate}`);
  expect(Number(v.nb_frames) === Math.round(seconds * fps), `expected ${Math.round(seconds * fps)} frames`);
  expect(Number(crf) === 28, `expected CRF 28, got ${crf}`);
  expect(faststart, 'moov atom is not before mdat (+faststart missing)');
  return problems;
}

/** Pose sanity warnings collected over a set of frames. */
function poseWarnings(ex, stats) {
  const out = [];
  const checks = ex.checks || {};
  if (stats.lowest < -0.004 && checks.floor !== false && (ex.view || 'side') !== 'top') {
    out.push(`figure dips ${(-stats.lowest * 100).toFixed(1)} cm below the floor - check the poses`);
  }
  if (stats.reach > 0.004 && checks.reach !== false) {
    out.push(`an IK target is ${(stats.reach * 100).toFixed(1)} cm out of reach (hand / foot not on its target)`);
  }
  if (stats.overflow > 0)
    out.push(`figure comes within ${SAFE_MARGIN} px of the frame edge (${stats.overflow.toFixed(0)} px over)`);
  return out;
}

function scanStats(stats, f) {
  stats.lowest = Math.min(stats.lowest, f.floor);
  stats.reach = Math.max(stats.reach, f.reach);
  stats.overflow = Math.max(stats.overflow, f.overflow);
}
const newStats = () => ({ lowest: Infinity, reach: 0, overflow: -Infinity });

async function renderExercise(id, outDir) {
  const ex = loadExercise(id);
  const { anim, drawFrame, fps } = makeScene(ex);
  const frames = Math.round(anim.duration * fps);
  fs.mkdirSync(outDir, { recursive: true });
  const masterFile = path.join(outDir, `${id}_${MASTER.w}x${MASTER.h}.mp4`);
  const appFile = path.join(outDir, `${id}_${APP.w}x${APP.h}.mp4`);
  const posterFile = path.join(outDir, `${id}_poster.png`);

  // H.264 Main, CRF 28, 30 fps, yuv420p, no audio, faststart.
  const enc = [
    '-an',
    '-c:v',
    'libx264',
    '-profile:v',
    'main',
    '-preset',
    'slow',
    '-crf',
    '28',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(fps),
    '-movflags',
    '+faststart'
  ];
  const ff = spawn(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-s',
      `${MASTER.w}x${MASTER.h}`,
      '-r',
      String(fps),
      '-i',
      '-',
      '-map',
      '0:v',
      ...enc,
      masterFile,
      '-map',
      '0:v',
      '-vf',
      `scale=${APP.w}:${APP.h}:flags=lanczos`,
      ...enc,
      appFile
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] }
  );
  const done = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  });

  const stats = newStats();
  for (let f = 0; f < frames; f++) {
    const frame = drawFrame(f / fps);
    scanStats(stats, frame);
    // Copy: the canvas buffer is reused for the next frame.
    if (!ff.stdin.write(Buffer.from(frame.buf))) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await done;

  writePng(drawFrame((ex.poster && ex.poster.t) || 0).buf, posterFile);

  for (const wmsg of poseWarnings(ex, stats)) console.warn(`  warning: ${wmsg}`);
  console.log(`${id}: ${frames} frames, ${anim.duration.toFixed(2)} s @ ${fps} fps`);
  for (const f of [masterFile, appFile, posterFile]) {
    console.log(`  ${path.relative(process.cwd(), f)}  ${(fs.statSync(f).size / 1024).toFixed(0)} KB`);
  }
  const problems = [
    ...verifyMp4(masterFile, MASTER.w, MASTER.h, fps, anim.duration),
    ...verifyMp4(appFile, APP.w, APP.h, fps, anim.duration)
  ];
  if (problems.length) throw new Error(`Spec check failed:\n  ${problems.join('\n  ')}`);
  console.log('  spec check: OK');
}

/**
 * Contact sheet: half-size frames tiled into one PNG, for a quick visual check.
 * `spec` is a frame count ("8") or a comma list of times in seconds ("0,0.6,1.2").
 */
function renderSheet(id, outDir, spec) {
  const ex = loadExercise(id);
  const { anim, drawFrame, fps } = makeScene(ex);
  let times;
  if (spec && spec.includes(',')) times = spec.split(',').map(Number);
  else {
    const n = Number(spec) || 8;
    times = Array.from({ length: n }, (_, i) => (anim.cycle * i) / n);
  }
  const cols = Math.min(times.length, 4),
    rows = Math.ceil(times.length / cols);
  const tw = MASTER.w / 2,
    th = MASTER.h / 2;
  const sheet = Buffer.alloc(cols * tw * rows * th * 3);
  times.forEach((t, n) => {
    const { buf } = drawFrame(t);
    const ox = (n % cols) * tw,
      oy = Math.floor(n / cols) * th;
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const o = ((oy + y) * cols * tw + ox + x) * 3;
        const i = (y * 2 * MASTER.w + x * 2) * 3,
          k = i + MASTER.w * 3;
        for (let c = 0; c < 3; c++) sheet[o + c] = (buf[i + c] + buf[i + 3 + c] + buf[k + c] + buf[k + 3 + c] + 2) >> 2;
      }
    }
  });
  // Pose warnings over the whole clip, so problems between the sampled frames show up too.
  const stats = newStats();
  for (let f = 0; f < Math.round(anim.duration * fps); f++) scanStats(stats, drawFrame(f / fps));
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${id}.png`);
  writePng(sheet, file, cols * tw, rows * th);
  console.log(`${file}  [t = ${times.map((t) => t.toFixed(2)).join(', ')}]`);
  for (const wmsg of poseWarnings(ex, stats)) console.warn(`  warning: ${wmsg}`);
}

function printJoints(id, t) {
  const ex = loadExercise(id);
  const { joints } = makeScene(ex).drawFrame(t);
  const f = (p) => `(${p[0].toFixed(3)}, ${p[1].toFixed(3)})`;
  console.log(
    `${id} @ ${t} s: hip ${f(joints.hip)} shoulder ${f(joints.shoulder)} head ${f(joints.head)} reach-miss ${joints.reach.toFixed(4)}`
  );
  for (const side of ['near', 'far']) {
    const s = joints[side];
    console.log(
      `  ${side}: ` +
        ['elbow', 'wrist', 'grip', 'handTip', 'knee', 'ankle', 'heel', 'toe'].map((k) => `${k} ${f(s[k])}`).join(' ')
    );
  }
}

/** Render several exercises in parallel child processes. */
async function renderBatch(ids, outDir, jobs, quiet) {
  const queue = ids.slice();
  const failed = [];
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift();
      await new Promise((resolve) => {
        const child = spawn(process.execPath, [__filename, id, '--out', outDir], { stdio: ['ignore', 'pipe', 'pipe'] });
        let log = '';
        child.stdout.on('data', (d) => {
          log += d;
        });
        child.stderr.on('data', (d) => {
          log += d;
        });
        child.on('close', (code) => {
          // --quiet: one line per exercise, plus warnings and errors.
          if (quiet && code === 0) {
            const warn = log.split('\n').filter((l) => /warning/.test(l));
            log = `${id}: OK${/spec check: OK/.test(log) ? ' (spec check passed)' : ''}\n${warn.map((l) => l + '\n').join('')}`;
          }
          process.stdout.write(log);
          if (code !== 0) failed.push(id);
          resolve();
        });
      });
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, ids.length)) }, worker));
  console.log(`\nbatch: ${ids.length - failed.length}/${ids.length} exercises rendered OK`);
  if (failed.length) throw new Error(`Failed: ${failed.join(', ')}`);
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(name);
    return i === -1 ? null : args.splice(i, 2)[1];
  };
  const flagWithOptionalValue = (name) => {
    const i = args.indexOf(name);
    if (i === -1) return null;
    const hasValue = args[i + 1] != null && /^[\d.,]+$/.test(args[i + 1]);
    return hasValue ? args.splice(i, 2)[1] : (args.splice(i, 1), '');
  };
  const outOpt = opt('--out');
  const still = opt('--still');
  const joints = opt('--joints');
  const jobs = Number(opt('--jobs')) || Math.min(4, os.cpus().length);
  const sheet = flagWithOptionalValue('--sheet');
  const all = args.includes('--all');
  const quiet = args.includes('--quiet');
  const ids = all ? listExercises() : args.filter((a) => !a.startsWith('--'));
  if (!ids.length) {
    console.error(
      'Usage: node tools/anim/render.js <exercise-id>... | --all  [--out <dir>] [--jobs <n>] [--quiet]\n' +
        '       [--still <seconds>] [--sheet [<count> | <t1,t2,...>]] [--joints <seconds>]'
    );
    process.exit(1);
  }
  const outDir = path.resolve(outOpt || path.join(__dirname, 'out'));
  if (still == null && sheet == null && joints == null && ids.length > 1 && jobs > 1) {
    await renderBatch(ids, outDir, jobs, quiet);
    return;
  }
  for (const id of ids) {
    if (joints != null) {
      printJoints(id, Number(joints));
    } else if (sheet != null) {
      renderSheet(id, outOpt ? outDir : path.join(outDir, 'contact'), sheet);
    } else if (still != null) {
      fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, `${id}_still_${still}.png`);
      writePng(makeScene(loadExercise(id)).drawFrame(Number(still)).buf, file);
      console.log(file);
    } else {
      await renderExercise(id, outDir);
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { makeScene, loadExercise, listExercises };
