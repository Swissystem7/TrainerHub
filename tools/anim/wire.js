#!/usr/bin/env node
'use strict';

/*
 * Wire the code-drawn animations into the app's data files.
 *
 *   node tools/anim/wire.js            apply (idempotent)
 *   node tools/anim/wire.js --check    verify only, exit 1 on drift
 *   node tools/anim/wire.js --revert   restore the original fields
 *
 * Reads tools/anim/clip-map.json (animation id -> Drive ids) and:
 *   1. copies out/<id>_360x640.mp4 -> media/anim/<id>.mp4 and converts
 *      out/<id>_poster.png -> media/anim/<id>.jpg (ffmpeg): one pair per
 *      animation, shared by every clip it replaces;
 *   2. points the `poster` of each mapped row at the animation's poster and
 *      tags the row with `anim`:
 *        videos/drive-catalog.json  rows by driveId, or by drivePlayId
 *        js/catalog.json            rows by drivePlayId
 *        data/drive_videos.json     rows by fileId
 *      The replaced poster stays on the row as `originalPoster` ("" = none);
 *   3. writes videos/anim-map.json (animation id -> media, poster, Drive ids).
 *
 * Playback is not switched here: no data field can do it within the repo's
 * own guard tests (see tools/anim/WIRING_NOTES.md). videos/anim-map.json is
 * the input for the small js/core.js hook proposed there.
 *
 * No npm dependencies; needs ffmpeg on PATH only when a poster is missing.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const MEDIA_DIR = 'media/anim';
const OUT_DIR = path.join(__dirname, 'out');
const MAP_FILE = 'videos/anim-map.json';
const FILES = {
  driveCatalog: 'videos/drive-catalog.json',
  catalog: 'js/catalog.json',
  driveVideos: 'data/drive_videos.json'
};
const INDENT = { driveCatalog: 2, catalog: 2, driveVideos: 1 };

const mode = process.argv.includes('--revert') ? 'revert' : process.argv.includes('--check') ? 'check' : 'apply';

function abs(rel) {
  return path.join(ROOT, rel);
}

// drive-catalog.json was written by Python, which prints 12.0 where
// JSON.stringify prints 12. The segmentRange blocks (never edited here) are
// copied back from the original text so the diff shows only the wired rows.
const RANGE_RX = /"segmentRange": \[[^\]]*\]/g;
function serialize(data, indent, original) {
  let text = JSON.stringify(data, null, indent) + '\n';
  const kept = original ? original.match(RANGE_RX) || [] : [];
  if (kept.length) {
    if ((text.match(RANGE_RX) || []).length !== kept.length) throw new Error('segmentRange count changed');
    let i = 0;
    text = text.replace(RANGE_RX, () => kept[i++]);
  }
  return text;
}

const mediaPath = (anim) => MEDIA_DIR + '/' + anim + '.mp4';
const posterPath = (anim) => MEDIA_DIR + '/' + anim + '.jpg';

// ---- clip map -------------------------------------------------------------

const clipMap = JSON.parse(fs.readFileSync(path.join(__dirname, 'clip-map.json'), 'utf8')).animations;
const animOf = new Map(); // Drive id -> animation id
Object.keys(clipMap).forEach(function (anim) {
  if (!/^[a-z0-9-]+$/.test(anim)) throw new Error('bad animation id: ' + anim);
  clipMap[anim].replaces.forEach(function (r) {
    if (!/^[A-Za-z0-9_-]{20,}$/.test(r.driveId)) throw new Error('bad Drive id: ' + r.driveId);
    if (animOf.has(r.driveId)) throw new Error('Drive id mapped twice: ' + r.driveId);
    animOf.set(r.driveId, anim);
  });
});

// ---- media ----------------------------------------------------------------

function sameBytes(a, b) {
  return fs.existsSync(a) && fs.existsSync(b) && fs.readFileSync(a).equals(fs.readFileSync(b));
}

function syncMedia(problems) {
  if (mode === 'apply') fs.mkdirSync(abs(MEDIA_DIR), { recursive: true });
  Object.keys(clipMap).forEach(function (anim) {
    const srcMp4 = path.join(OUT_DIR, anim + '_360x640.mp4');
    const srcPng = path.join(OUT_DIR, anim + '_poster.png');
    const dstMp4 = abs(mediaPath(anim));
    const dstJpg = abs(posterPath(anim));
    // The render output is not needed once media/anim holds the pair.
    if (fs.existsSync(srcMp4) && !sameBytes(srcMp4, dstMp4)) {
      if (mode === 'check') problems.push('stale ' + mediaPath(anim));
      else fs.copyFileSync(srcMp4, dstMp4);
    }
    if (!fs.existsSync(dstMp4)) problems.push('missing ' + mediaPath(anim));
    const stale =
      fs.existsSync(srcPng) && (!fs.existsSync(dstJpg) || fs.statSync(dstJpg).mtimeMs < fs.statSync(srcPng).mtimeMs);
    if (stale && mode === 'apply') {
      const r = spawnSync(
        'ffmpeg',
        [
          '-v',
          'error',
          '-y',
          '-i',
          srcPng,
          '-vf',
          'scale=360:640:flags=lanczos',
          '-frames:v',
          '1',
          '-q:v',
          '4',
          '-pix_fmt',
          'yuvj420p',
          dstJpg
        ],
        { encoding: 'utf8' }
      );
      if (r.status !== 0) throw new Error('ffmpeg (poster ' + anim + ') failed: ' + (r.stderr || r.error));
    }
    if (!fs.existsSync(dstJpg)) problems.push('missing ' + posterPath(anim));
  });
}

// ---- rows -----------------------------------------------------------------

function wireRow(row, anim) {
  const poster = posterPath(anim);
  row.anim = anim;
  if (row.poster === poster) return;
  if (!('originalPoster' in row)) row.originalPoster = typeof row.poster === 'string' ? row.poster : '';
  row.poster = poster;
}

function unwireRow(row) {
  if (!('anim' in row)) return;
  if ('originalPoster' in row) {
    if (row.originalPoster === '') delete row.poster;
    else row.poster = row.originalPoster;
    delete row.originalPoster;
  }
  delete row.anim;
}

// The mapped Drive id a row stands for: the id its card plays today.
function clipId(row) {
  if (!row || typeof row !== 'object') return '';
  if (animOf.has(row.fileId)) return row.fileId; // data/drive_videos.json
  if (animOf.has(row.drivePlayId)) return row.drivePlayId; // release-file row, live Drive copy
  if (animOf.has(row.driveId)) return row.driveId; // Drive reel row
  return '';
}

const seen = {}; // Drive id -> { data file: [row ids] }

function processRows(rows, file) {
  rows.forEach(function (row) {
    const id = clipId(row);
    if (!id) {
      if (row && row.anim)
        throw new Error(file + ': row ' + (row.id || row.fileId) + ' has `anim` but no mapped Drive id');
      return;
    }
    if (mode === 'revert') {
      unwireRow(row);
      return;
    }
    wireRow(row, animOf.get(id));
    seen[id] = seen[id] || {};
    (seen[id][file] = seen[id][file] || []).push(row.id || row.fileId);
  });
}

// ---- run ------------------------------------------------------------------

const problems = [];
if (mode !== 'revert') syncMedia(problems);

const data = {};
const before = {};
Object.keys(FILES).forEach(function (k) {
  before[k] = fs.readFileSync(abs(FILES[k]), 'utf8');
  data[k] = JSON.parse(before[k]);
  // The files are plain JSON.stringify output; refuse to reformat anything else.
  if (serialize(data[k], INDENT[k], before[k]) !== before[k])
    throw new Error(FILES[k] + ' is not in the expected JSON layout; not rewriting it');
});

processRows(data.driveCatalog.items, FILES.driveCatalog);
processRows(
  Object.keys(data.catalog).map((k) => data.catalog[k]),
  FILES.catalog
);
processRows(data.driveVideos, FILES.driveVideos);

const outputs = Object.keys(FILES).map((k) => [FILES[k], serialize(data[k], INDENT[k], before[k]), before[k]]);

if (mode !== 'revert') {
  const animMap = {
    _note:
      'Code-drawn animations that stand in for original clips. Generated by tools/anim/wire.js from tools/anim/clip-map.json. One MP4 + poster per animation (paths relative to the site root), shared by its Drive ids. `rows` lists the data rows whose poster now points at the animation; each keeps its previous poster as originalPoster. Playback of these ids switches once js/core.js reads this file (tools/anim/WIRING_NOTES.md).',
    count: { animations: Object.keys(clipMap).length, driveIds: animOf.size },
    animations: {}
  };
  Object.keys(clipMap).forEach(function (anim) {
    animMap.animations[anim] = {
      he: clipMap[anim].he,
      en: clipMap[anim].en,
      media: mediaPath(anim),
      poster: posterPath(anim),
      driveIds: clipMap[anim].replaces.map((r) => r.driveId),
      clips: clipMap[anim].replaces.map(function (r) {
        return { driveId: r.driveId, name_he: r.name_he, originalMedia: r.mediaPath, rows: seen[r.driveId] || {} };
      })
    };
  });
  animOf.forEach(function (anim, driveId) {
    if (!seen[driveId]) problems.push('Drive id ' + driveId + ' (' + anim + ') is in no data file');
  });
  const mapPath = abs(MAP_FILE);
  outputs.push([MAP_FILE, serialize(animMap, 2), fs.existsSync(mapPath) ? fs.readFileSync(mapPath, 'utf8') : '']);
}

let changed = 0;
outputs.forEach(function (o) {
  if (o[1] === o[2]) return;
  changed++;
  if (mode === 'check') problems.push('out of date: ' + o[0]);
  else fs.writeFileSync(abs(o[0]), o[1]);
});
if (mode === 'revert' && fs.existsSync(abs(MAP_FILE))) fs.unlinkSync(abs(MAP_FILE));

console.log(
  mode +
    ': ' +
    Object.keys(clipMap).length +
    ' animations, ' +
    animOf.size +
    ' Drive ids, ' +
    changed +
    ' file(s) ' +
    (mode === 'check' ? 'differ' : 'written')
);
if (mode !== 'revert') {
  Object.keys(FILES).forEach(function (k) {
    const ids = Object.keys(seen).filter((id) => seen[id][FILES[k]]);
    console.log(
      '  ' +
        FILES[k] +
        ': ' +
        ids.reduce((n, id) => n + seen[id][FILES[k]].length, 0) +
        ' rows, ' +
        ids.length +
        ' Drive ids'
    );
  });
  console.log('  poster switched for ' + Object.keys(seen).length + ' of ' + animOf.size + ' Drive ids');
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
