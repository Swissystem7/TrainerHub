const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const mem = {};
global.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, get length() { return Object.keys(mem).length; }, key: (i) => Object.keys(mem)[i] ?? null };
const TH = require('../js/core.js');

test('parseRepsNumber takes the first whole count', () => {
  assert.strictEqual(TH.parseRepsNumber(12), 12);
  assert.strictEqual(TH.parseRepsNumber('8-10'), 8);
  assert.strictEqual(TH.parseRepsNumber('עד כשל'), null);
  assert.strictEqual(TH.parseRepsNumber(null), null);
});

test('workout prefs default on, toggle persists under TH.KEYS.workoutPrefs (covered by backup)', () => {
  assert.deepStrictEqual(TH.workoutPrefs(), { tts: true, sound: true });
  TH.setWorkoutPrefs({ tts: false });
  assert.strictEqual(TH.workoutPrefs().tts, false);
  assert.ok(TH.collectBackup()[TH.KEYS.workoutPrefs]);
  TH.setWorkoutPrefs({ tts: true });
});

test('nextExerciseSpeech says rest length and next exercise in Hebrew', () => {
  assert.strictEqual(TH.nextExerciseSpeech({ duration: 60, nextName: 'סקוואט', nextDetail: '10 חזרות' }), 'מנוחה 60 שניות. הבא: סקוואט, 10 חזרות');
  assert.strictEqual(TH.nextExerciseSpeech(null), '');
});

test('speakHebrew uses he-IL and a Hebrew voice; false without speechSynthesis', () => {
  const spoken = [];
  function U(t) { this.text = t; }
  const win = { SpeechSynthesisUtterance: U, speechSynthesis: { getVoices: () => [{ lang: 'en-US' }, { lang: 'he-IL', name: 'Carmit' }], cancel() {}, speak: (u) => spoken.push(u) } };
  assert.strictEqual(TH.speakHebrew('הבא: לאנג׳', win), true);
  assert.strictEqual(spoken[0].lang, 'he-IL');
  assert.strictEqual(spoken[0].voice.name, 'Carmit');
  assert.strictEqual(TH.speakHebrew('x', {}), false);
  assert.strictEqual(TH.speakHebrew('', win), false);
});

test('restEndCue vibrates and beeps twice via AudioContext, and degrades silently', () => {
  const vib = [];
  let oscs = 0;
  function AC() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  AC.prototype.createOscillator = function () { oscs++; return { frequency: {}, connect() {}, start() {}, stop() {} }; };
  AC.prototype.createGain = function () { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  const r = TH.restEndCue({ navigator: { vibrate: (p) => { vib.push(p); return true; } }, AudioContext: AC });
  assert.deepStrictEqual(r, { vibrated: true, beeped: true });
  assert.deepStrictEqual(vib[0], [200, 100, 200]);
  assert.strictEqual(oscs, 2);
  assert.deepStrictEqual(TH.restEndCue({}), { vibrated: false, beeped: false });
  assert.strictEqual(TH.restEndCue({ navigator: { vibrate: () => true }, AudioContext: AC }, { sound: false }).beeped, false);
});

test('workout-mode loads journal-storage after core and has the TTS toggle + set inputs', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'workout-mode.html'), 'utf8');
  assert.ok(html.indexOf('../js/core.js') < html.indexOf('../js/journal-storage.js'));
  assert.match(html, /id="btnTts"[^>]*aria-pressed/);
  assert.match(html, /id="logReps"/);
  assert.match(html, /id="logWeight"/);
  assert.ok(!/https?:\/\/[^"']*\.(mp3|wav|ogg)/.test(html), 'no remote audio files');
});
