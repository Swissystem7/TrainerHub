'use strict';

// "Share workout with client" is the paid feature. It works by copying a
// link. When the browser has no clipboard API or refuses it (in-app
// browsers, http, denied permission), the button used to do nothing, or
// throw. Every copy button must go through TH.copyOrShow, which either
// copies or shows the text for a manual copy.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.localStorage = {
  getItem: function () { return null; },
  setItem: function () {},
  removeItem: function () {}
};
global.location = { href: 'https://swissystem7.github.io/TrainerHub/', pathname: '/TrainerHub/', hash: '' };

const TH = require('../js/core.js');
const root = path.join(__dirname, '..');

function setNavigator(value) {
  Object.defineProperty(globalThis, 'navigator', { value: value, configurable: true, writable: true });
}

function fakeAnchor() {
  const inserted = [];
  return {
    inserted: inserted,
    parentNode: { querySelector: function () { return null; } },
    insertAdjacentHTML: function (pos, html) { inserted.push({ pos: pos, html: html }); }
  };
}

test('copyText reports failure when there is no clipboard API', async function () {
  const original = globalThis.navigator;
  setNavigator({});
  try {
    const r = await TH.copyText('https://example.org/#TH.x');
    assert.equal(r.ok, false);
  } finally {
    setNavigator(original);
  }
});

test('copyOrShow shows the link for a manual copy when the clipboard refuses', async function () {
  const original = globalThis.navigator;
  setNavigator({ clipboard: { writeText: function () { return Promise.reject(new Error('denied')); } } });
  try {
    const anchor = fakeAnchor();
    let okCalled = false;
    const r = await TH.copyOrShow('https://example.org/#TH.abc<x>', anchor, function () { okCalled = true; });
    assert.equal(r.ok, false);
    assert.equal(okCalled, false);
    assert.equal(anchor.inserted.length, 1);
    assert.match(anchor.inserted[0].html, /העתיקו ידנית/);
    assert.match(anchor.inserted[0].html, /#TH\.abc&lt;x&gt;/);
  } finally {
    setNavigator(original);
  }
});

test('copyOrShow calls the success handler only after a real copy', async function () {
  const original = globalThis.navigator;
  let copied = '';
  setNavigator({ clipboard: { writeText: function (t) { copied = t; return Promise.resolve(); } } });
  try {
    const anchor = fakeAnchor();
    let okCalled = false;
    const r = await TH.copyOrShow('link-1', anchor, function () { okCalled = true; });
    assert.equal(r.ok, true);
    assert.equal(okCalled, true);
    assert.equal(copied, 'link-1');
    assert.equal(anchor.inserted.length, 0);
  } finally {
    setNavigator(original);
  }
});

test('no page calls the clipboard API directly', function () {
  const pages = ['index.html', 'library.html', 'weekly.html', 'manage.html', 'journal.html',
    'offer.html', 'frontend/index.html', 'frontend/workout-mode.html'];
  pages.forEach(function (p) {
    const html = fs.readFileSync(path.join(root, p), 'utf8');
    assert.doesNotMatch(html, /navigator\.clipboard/, p + ' still calls navigator.clipboard directly');
  });
});
