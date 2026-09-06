const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readIf(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

test('offer/pitch/MONETIZATION have no fake registrant counts', () => {
  const blob = [read('offer.html'), read('pitch.html'), readIf('MONETIZATION.md')].join('\n');
  assert.doesNotMatch(blob, /נרשמים\s*:\s*\d+/);
  assert.doesNotMatch(blob, /\d+\s*נרשמים(?!\s*דרך)/);
});

test('ILS 59 appears with proposed / unvalidated honesty context', () => {
  const offer = read('offer.html');
  const pitch = read('pitch.html');
  const monet = readIf('MONETIZATION.md');
  const blob = offer + '\n' + pitch + '\n' + monet;
  assert.match(blob, /59/);
  assert.match(
    blob,
    /לא אומת|לא מאומת|מוצע|proposed|לא נכונות.?לשלם|בלי ראיונות/i
  );
});

test('demo access code TH-MAAMEN-59 is a product boundary when present', () => {
  const monet = readIf('MONETIZATION.md');
  const core = readIf('js/core.js');
  const blob = monet + '\n' + core + '\n' + read('offer.html') + '\n' + read('pitch.html');
  if (!/TH-MAAMEN-59/.test(blob)) {
    return; // optional if absent from repo
  }
  assert.match(blob, /TH-MAAMEN-59/);
  assert.match(blob, /גבול|boundary|לא אבטחה|not security/i);
});
