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

// The owner decided on 28.9: the public contact channel for all his apps is his Google Form
// "משוב על האפליקציות", with the app field pre-filled as TrainerHub (an exact option of the form).
const OWNER_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSdT8YduNx-VWKM3bWGUJdiSj4Sw9D-EA6R6c-oYVYCQmOVXxQ/viewform?usp=pp_url&entry.368039752=TrainerHub';

test('js/contact.js holds exactly one CONTACT value: the owner\'s Google Form', function () {
  const src = read('js/contact.js');
  const decls = src.match(/var CONTACT = '[^']*';/g) || [];
  assert.equal(decls.length, 1);
  assert.equal(decls[0], "var CONTACT = '" + OWNER_FORM + "';");
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
  // A form, not a workflow. The repo-wide no-workflows rule lives in honesty.test.js
  // (PR #20 edits it there on purpose); this test does not repeat it.
  assert.match(yml, /^body:/m);
  assert.doesNotMatch(yml, /^(jobs|runs-on|on):/m);
});

test('offer.html uses the contact component instead of a bare empty-issue link', function () {
  const offer = read('offer.html');
  assert.doesNotMatch(offer, /issues\/new"/);
  assert.match(offer, /id="contactDirect"[^>]*hidden/);
  assert.match(offer, /id="contactForm"[^>]*template=access-request\.yml/);
  assert.match(offer, /js\/contact\.js/);
});

test('offer.html with the shipped CONTACT: the form link takes over from the public GitHub form', function () {
  const Contact = require('../js/contact.js');
  assert.equal(Contact.value, OWNER_FORM);
  const els = {
    contactDirect: { hidden: true, href: '#', textContent: 'פנייה ישירה לקוד גישה' },
    contactForm: { hidden: false, href: '' },
    contactNote: { hidden: false },
  };
  Contact.render({ getElementById: function (id) { return els[id] || null; } });
  assert.equal(els.contactDirect.hidden, false);
  assert.equal(els.contactDirect.href, OWNER_FORM);
  assert.match(els.contactDirect.textContent, /טופס Google/);
  assert.equal(els.contactForm.hidden, true, 'the GitHub issue button steps aside');
  assert.equal(els.contactNote.hidden, true, 'and so does its "public on GitHub" note');
});
