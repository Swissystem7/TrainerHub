'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const raw = fs.readFileSync(path.join(root, 'data', 'drive_videos.json'), 'utf8');
const rows = JSON.parse(raw);

// These five were stored in Drive as application/mp4 and showed «אין תצוגה מקדימה זמינה».
// The same bytes were re-uploaded as video files; the old copies moved to the archive folder.
const REPLACED = {
  '1bqZKRD2pb6EHpml5uh7dRaDaPQlppFew': '1Q497QujaC3FCciOlxvGgOCop3bvqcl-b',
  '1hHMcPZGCTPdp2m44MYUVX1eQBW0W0he_': '1DbJeMxkYKBhb_x90A2S0mMAniNSzpO9B',
  '12PwOS2Qji_wG5NAVmwT550Cjp6O9Fjp-': '1AgVYBgfe6aLaFB6MvIAEdj5PEE-xT9m8',
  '1AfwJuHQ48z7FPL-6LbzFGBC3TdtryuvM': '1ZhaUYaspbb03EovjyDB-JPXIygPZHXrs',
  '1XF6ewqhf3HsdMLCeAzRhwRl9pxVo2Ys6': '13nNsqrh3ZgpXAh5Q1HtNekwVnPQxzlyD'
};

test('Drive rows point at the re-uploaded video copies, not the unpreviewable ones', function () {
  Object.keys(REPLACED).forEach(function (oldId) {
    assert.equal(raw.indexOf(oldId), -1, oldId + ' still referenced');
    const hits = rows.filter(function (r) { return r.fileId === REPLACED[oldId]; });
    assert.equal(hits.length, 1, REPLACED[oldId]);
  });
  const sources = [
    fs.readFileSync(path.join(root, 'videos', 'drive-catalog.json'), 'utf8'),
    fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8')
  ].join('\n');
  Object.keys(REPLACED).forEach(function (oldId) {
    assert.equal(sources.indexOf(oldId), -1);
  });
});
