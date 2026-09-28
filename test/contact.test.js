'use strict';

// The offer page needs one real way for a trainer to ask for an access code.
// The owner fills a single value (CONTACT in js/contact.js). While it is
// empty, the direct-contact link stays hidden and the page falls back to a
// Hebrew GitHub issue form. No phone number or email is invented here.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('js/contact.js holds exactly one owner-filled CONTACT value, empty for now', function () {
  const src = read('js/contact.js');
  const decls = src.match(/var CONTACT = '[^']*';/g) || [];
  assert.equal(decls.length, 1);
  assert.equal(decls[0], "var CONTACT = '';");
  assert.doesNotMatch(src, /05\d-?\d{7}|\+?972\d{8,9}|@[a-z0-9-]+\.[a-z]{2,}/i);
});

test('empty CONTACT hides the direct link and falls back to the Hebrew issue form', function () {
  const Contact = require('../js/contact.js');
  const r = Contact.resolve('');
  assert.equal(r.direct, null);
  assert.match(r.formUrl, /^https:\/\/github\.com\/Swissystem7\/TrainerHub\/issues\/new\?template=access-request\.yml$/);
});

test('a filled CONTACT is used only for safe schemes', function () {
  const Contact = require('../js/contact.js');
  assert.equal(Contact.resolve('https://wa.me/972500000000').direct, 'https://wa.me/972500000000');
  assert.equal(Contact.resolve('mailto:coach@example.org').direct, 'mailto:coach@example.org');
  assert.equal(Contact.resolve('javascript:alert(1)').direct, null);
  assert.equal(Contact.resolve('http://insecure.example').direct, null);
});

test('the issue form exists in Hebrew, warns it is public, and asks for no contact details', function () {
  const yml = read('.github/ISSUE_TEMPLATE/access-request.yml');
  assert.match(yml, /^name: /m);
  assert.match(yml, /ציבורי/);
  assert.match(yml, /אל תכתבו (כאן )?טלפון/);
  assert.equal(fs.existsSync(path.join(root, '.github', 'workflows')), false);
});

test('offer.html uses the contact component instead of a bare empty-issue link', function () {
  const offer = read('offer.html');
  assert.doesNotMatch(offer, /issues\/new"/);
  assert.match(offer, /id="contactDirect"[^>]*hidden/);
  assert.match(offer, /id="contactForm"[^>]*template=access-request\.yml/);
  assert.match(offer, /js\/contact\.js/);
});
