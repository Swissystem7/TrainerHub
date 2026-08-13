'use strict';
const fs = require('fs');

const raw = fs.readFileSync(
  'C:/Users/avira/trainerhub-catalog/trainerhub-video-catalog.json',
  'utf8'
).replace(/^\uFEFF/, '');
const src = JSON.parse(raw);

const PERSON_OR_TEAM = /בוריס|ארז|רון(?=$|[\s.])|ארצית|נערים\s*א|המאמן/;
const HASH_NAME = /^[A-Za-z0-9_-]{40,}\.mp4$/i;
const VID_NAME = /^VID_\d+/i;
const NUMERIC_ONLY = /^\d+\.mp4$/i;

function clean(s) {
  return String(s || '')
    .replace(/[\u00A0\u202F\u2007\u2420\u2400-\u243F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+\(\d+(\.\d+)?\s*MB\)\s*$/i, '')
    .trim();
}

function slugHe(title) {
  const map = {
    'פלאנק': 'plank',
    'פלאנק ברכיים': 'plank_knees',
    'פלאנק גבוה': 'plank_high',
    'פלאנק מצד לצד': 'plank_side_to_side',
    'פלאנק צידי': 'plank_side',
    'פלאנק שעון': 'plank_clock',
    'מטפס הרים': 'mountain_climber',
    'מטפס הרים עם פלאנק': 'mountain_climber_plank',
    'מתח אוסטרלי': 'bodyweight_row',
    'גב תחתון': 'superman',
    'כתפיים וגב': 'shoulder_back',
    'שכיבות סמיכה ורגליים': 'push_up',
    'אתגר שכיבות שמיכה': 'push_up_challenge',
    'שכיבות שמיכה ובעיטות': 'push_up_kicks',
    'חימום שכיבות שמיכה קונוסים על הגב': 'push_up_cones',
    'חימום': 'warmup',
    'בטן': 'crunches',
    'סט בטן': 'crunches_set',
    'בטן סט': 'core_set',
    'מדרגות': 'step_up',
    'סולם רגליים': 'ladder_feet'
  };
  if (map[title]) return map[title];
  const ascii = title
    .replace(/[^\u0590-\u05FFa-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
  return ascii || 'ex';
}

function musclesOf(m) {
  const map = {
    core: ['core'],
    back: ['back'],
    legs: ['legs'],
    shoulders: ['shoulders'],
    arms: ['biceps', 'triceps'],
    warmup: ['core'],
    fullbody: ['chest', 'back', 'legs', 'core'],
    agility: ['legs', 'core'],
    'skill-football': ['legs'],
    'skill-tennis': ['shoulders']
  };
  return map[m] || ['core'];
}

function equipmentOf(eq) {
  if (!eq || eq === 'none') return ['none'];
  const parts = String(eq).split('+').map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : ['none'];
}

function levelOf(title, muscle) {
  if (/מתח|כוח ידיים|אוסטרלי/.test(title)) return 'intermediate';
  if (/ילדים/.test(title)) return 'beginner';
  return 'beginner';
}

const excluded = [];
const kept = [];
const usedIds = new Set();

src.forEach((row, i) => {
  const file = String(row.file || '');
  const title = clean(row.title || file.replace(/\.mp4$/i, ''));
  const category = clean(row.category);
  const blob = file + ' ' + title + ' ' + category;
  const reasons = [];
  if (VID_NAME.test(file) || /opaque-camera-name/.test(row.flags || '')) reasons.push('VID/opaque');
  if (HASH_NAME.test(file) || /hash-name/.test(row.flags || '')) reasons.push('hash');
  if (PERSON_OR_TEAM.test(blob)) reasons.push('person/team');
  if (NUMERIC_ONLY.test(file)) reasons.push('anonymous-numeric');
  if (reasons.length) {
    excluded.push({ file, reasons: reasons.join(',') });
    return;
  }

  let id = slugHe(title);
  let n = 2;
  while (usedIds.has(id)) {
    id = slugHe(title) + '_' + n;
    n++;
  }
  usedIds.add(id);
  kept.push({
    id,
    he: title || id,
    muscles: musclesOf(row.muscle),
    equipment: equipmentOf(row.equipment),
    level: levelOf(title, row.muscle),
    file
  });
});

const asObject = {};
kept.forEach((e) => {
  asObject[e.id] = {
    id: e.id,
    he: e.he,
    muscles: e.muscles,
    equipment: e.equipment,
    level: e.level,
    file: e.file
  };
});

fs.writeFileSync('videos/catalog.json', JSON.stringify(asObject, null, 2) + '\n', 'utf8');
console.log('kept', kept.length, 'excluded', excluded.length);
console.log('engine matches', kept.filter((e) =>
  ['plank', 'mountain_climber', 'push_up', 'bodyweight_row', 'superman', 'crunches', 'step_up', 'warmup'].includes(e.id)
).map((e) => e.id + '=' + e.file));
console.log('EXCLUDED');
excluded.forEach((e) => console.log(' -', e.reasons, e.file.slice(0, 80)));
