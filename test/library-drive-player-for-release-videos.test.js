'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const local = read('js/catalog.json');
const drive = read('videos/drive-catalog.json');
const youtube = read('videos/youtube-catalog.json');
const RELEASE = /^https:\/\/github\.com\/Swissystem7\/TrainerHub\/releases\/download\//;

function merged() {
  const m = TH.mergeCatalogs(TH.mergeCatalogs(local, drive, []), youtube, []);
  TH.setCatalog(m);
  return TH.catalogList();
}

test('every library row with a GitHub release file carries a live Drive copy', function () {
  const rows = merged().filter(function (e) { return RELEASE.test(e.file); });
  assert.ok(rows.length >= 73, 'release rows: ' + rows.length);
  const missing = rows.filter(function (e) { return !/^[A-Za-z0-9_-]{20,}$/.test(e.drivePlayId); });
  assert.deepEqual(missing.map(function (e) { return e.id; }), []);
  // The live copy is never the dead legacy id.
  rows.forEach(function (e) {
    const raw = local[e.id] || drive.items.find(function (d) { return d.id === e.id; }) || {};
    if (raw.legacyDriveId) assert.notEqual(e.drivePlayId, raw.legacyDriveId, e.id);
  });
});

test('release rows render the Drive player, never a blocked release <video>', function () {
  const rows = merged().filter(function (e) { return RELEASE.test(e.file); });
  rows.forEach(function (e) {
    const html = TH.mediaMarkup(e, { className: 'ex-media' });
    assert.doesNotMatch(html, /<video/, e.id);
    assert.doesNotMatch(html, /releases\/download/, e.id);
    assert.ok(html.indexOf('data-th-frame="https://drive.google.com/file/d/' + e.drivePlayId + '/preview"') !== -1, e.id);
    assert.match(html, /<button type="button" class="ex-media ex-media-facade"/);
    const eager = TH.mediaMarkup(e, { className: 'ex-media', eager: true });
    assert.ok(eager.indexOf('src="https://drive.google.com/file/d/' + e.drivePlayId + '/preview"') !== -1, e.id);
    assert.match(eager, /<iframe class="ex-media"/);
  });
});

test('a hosted file without a Drive copy still renders a video; a bad drivePlayId is ignored', function () {
  const base = { id: 'x', he: 'בדיקה', muscles: ['core'], equipment: ['none'], level: 'beginner',
    file: 'https://example.com/clip.mp4', source: 'onedrive' };
  assert.match(TH.mediaMarkup(base, { className: 'ex-media' }), /<video/);
  TH.setCatalog(TH.mergeCatalogs({ x: Object.assign({}, base, { drivePlayId: 'bad id' }) }, null, []));
  const e = TH.catalogList()[0];
  assert.equal(e.drivePlayId, '');
  assert.match(TH.mediaMarkup(e, { className: 'ex-media' }), /<video/);
  const offline = TH.mediaMarkup(Object.assign({}, base, { drivePlayId: '1TfN0SC_fkYQRozH_a1DL_yiR-9A5RM21' }), { className: 'ex-media', offline: true });
  assert.doesNotMatch(offline, /<iframe/);
});
