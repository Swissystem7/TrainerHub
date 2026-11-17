'use strict';

// The «טקסט לכרטיסייה» examples and the live workout mode resolve names with
// TH.findExercise: «בורפי», «לאנג'ים הליכה» and «כפיפות מרפק» came back with no
// video although the catalog plays «ברפי», «לאנג'ים בהליכה» and «כפיפת מרפק».
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = function (p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); };

test('common spellings resolve to the catalog clip', function () {
  TH.setCatalog(TH.mergeCatalogs(TH.mergeCatalogs(read('js/catalog.json'), read('videos/drive-catalog.json'), []), read('videos/youtube-catalog.json'), []));
  const want = {
    'בורפי': 'yt_burpee',
    'בורפיז': 'yt_burpee',
    "לאנג'ים הליכה": 'yt_walking_lunge',
    'מכרעים בהליכה': 'yt_walking_lunge',
    'כפיפות מרפק': 'bicep_curl',
    'כפיפות מרפקים': 'bicep_curl'
  };
  Object.keys(want).forEach(function (name) {
    const clip = TH.findExercise({ name: name });
    assert.equal(clip && clip.id, want[name], name);
  });
  TH.setCatalog({});
});
