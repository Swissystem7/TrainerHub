#!/usr/bin/env node
'use strict';

// Validate data/exercises.json. Exit 0 when the library matches the schema
// in the README («איך מוסיפים תרגיל»). Exit 1 and print every error otherwise.
//
//   node scripts/validate-exercises.js
//   node scripts/validate-exercises.js path/to/exercises.json

const fs = require('fs');
const path = require('path');
const THReels = require('../js/reel-library.js');

const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'exercises.json'));

let data;
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(file + ': ' + err.message);
  process.exit(1);
}

const result = THReels.validateLibrary(data);
if (!result.ok) {
  result.errors.forEach(function (line) { console.error(line); });
  console.error(result.errors.length + ' שגיאות ב־' + file);
  process.exit(1);
}

const verified = data.exercises.filter(function (ex) { return ex.verified; }).length;
console.log('ok ' + data.exercises.length + ' exercises (' + verified + ' verified) ' + file);

if (!process.argv[2]) {
  const driveFile = path.join(path.dirname(file), 'drive_videos.json');
  let drive;
  try {
    drive = JSON.parse(fs.readFileSync(driveFile, 'utf8'));
  } catch (err) {
    console.error(driveFile + ': ' + err.message);
    process.exit(1);
  }
  const driveResult = THReels.validateDriveVideos(drive);
  if (!driveResult.ok) {
    driveResult.errors.forEach(function (line) { console.error(line); });
    console.error(driveResult.errors.length + ' שגיאות ב־' + driveFile);
    process.exit(1);
  }
  console.log('ok ' + drive.length + ' drive videos ' + driveFile);
}
