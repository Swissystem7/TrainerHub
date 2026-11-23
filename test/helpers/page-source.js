'use strict';

// index.html's page script and styles were split out to index-page.js / index-page.css
// (code splitting so the HTML stays inside the size budget). Tests that used to cut
// functions out of the inline <script> / <style> should read the assembled page via
// readIndex(), which pastes those files back in as if they were still inline.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

function readIndex() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'index-page.css'), 'utf8');
  const js = fs.readFileSync(path.join(ROOT, 'index-page.js'), 'utf8');
  return html + '\n<style>\n' + css + '\n</style>\n<script>\n' + js + '\n</script>\n';
}

module.exports = { ROOT, readIndex };
