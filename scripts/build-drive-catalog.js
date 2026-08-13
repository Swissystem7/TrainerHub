'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Infer = require('../js/infer.js');

const inventoryPath = process.argv[2] || path.join(
  'C:/Users/avira/claude-node/drive-fitness-videos.json'
);
const outPath = process.argv[3] || path.join(__dirname, '..', 'videos', 'drive-catalog.json');

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const excluded = new Set((inventory._excluded && inventory._excluded.ids) || []);
const used = {};
const items = [];

for (const video of inventory.videos || []) {
  if (!video || !video.id || excluded.has(video.id)) continue;
  if (Infer.isBlockedName(video.title) || /^VID[_-]/i.test(video.title || '')) continue;
  const inferred = Infer.inferFromName(video.title, { folder: video.folder || '' });
  const id = Infer.makeId('drive', video.title, used);
  items.push({
    id: id,
    driveId: video.id,
    he: video.title,
    muscles: inferred.muscles,
    equipment: inferred.equipment,
    level: inferred.level,
    source: 'drive',
    folder: video.folder || ''
  });
}

const catalog = {
  _meta: {
    source: 'drive',
    generatedFrom: 'drive-fitness-videos.json',
    count: items.length,
    note: 'הוספת סרטון = שורה חדשה. בלי שינוי קוד.'
  },
  items: items
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
process.stdout.write('wrote ' + items.length + ' items to ' + outPath + '\n');
