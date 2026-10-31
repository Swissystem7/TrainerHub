'use strict';

// offer.html tells a trainer whose code is already active «אפשר להוסיף שם
// מותג ולשמור שוב», but the code field was cleared after the redeem and the
// submit handler refused an empty code, so the brand could only be changed by
// pasting the access code again. On the trainer tier an empty code now saves
// the brand alone; on the practice tier it is still a missing code.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require(path.join(root, 'js', 'core.js'));
TH.setCatalog({});

const html = fs.readFileSync(path.join(root, 'offer.html'), 'utf8');

function pageScript() {
  const parts = html.split('<script>').slice(1).map((s) => s.split('</script>')[0]);
  const src = parts.find((s) => s.indexOf('redeemForm') !== -1);
  assert.ok(src, 'inline page script with redeemForm found');
  return src;
}

function mountPage() {
  const els = {};
  const handlers = {};
  function el(id) {
    if (!els[id]) {
      els[id] = {
        id: id,
        value: '',
        textContent: '',
        className: '',
        required: true,
        addEventListener: function (type, fn) { handlers[id + ':' + type] = fn; }
      };
    }
    return els[id];
  }
  new Function('document', 'TH', pageScript())({ getElementById: el }, TH);
  return {
    el: el,
    submit: function (code, brand) {
      el('code').value = code;
      el('brand').value = brand;
      handlers['redeemForm:submit']({ preventDefault: function () {} });
    },
    clickClear: function () {
      handlers['clearBtn:click']();
    }
  };
}

function reset() {
  Object.keys(mem).forEach((k) => { delete mem[k]; });
}

test('a trainer with an active code saves a brand without retyping the code', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: '', at: 1234 });
  const page = mountPage();
  page.submit('', 'הסטודיו של דנה');
  assert.equal(TH.entitlement().tier, 'trainer');
  assert.equal(TH.entitlement().brand, 'הסטודיו של דנה');
  assert.equal(TH.entitlement().at, 1234, 'activation time kept');
  assert.equal(page.el('redeemStatus').className, 'status');
  assert.match(page.el('redeemStatus').textContent, /שם המותג נשמר: הסטודיו של דנה/);
  assert.match(page.el('entStatus').textContent, /המותג על הדפים: הסטודיו של דנה/);
});

test('a trainer can change and then remove the brand', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: 'ישן' });
  const page = mountPage();
  page.submit('', 'חדש');
  assert.equal(TH.entitlement().brand, 'חדש');
  page.submit('', '   ');
  assert.equal(TH.entitlement().tier, 'trainer');
  assert.equal(TH.entitlement().brand, '');
  assert.match(page.el('redeemStatus').textContent, /שם המותג הוסר/);
});

test('the code field is not required on the trainer tier, and is again after «בטל גישה»', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: 'X' });
  const page = mountPage();
  page.submit('', 'X');
  assert.equal(page.el('code').required, false);
  page.clickClear();
  assert.equal(page.el('code').required, true);
});

test('on the practice tier an empty code is still a missing code and grants nothing', function () {
  reset();
  const page = mountPage();
  page.submit('', 'סטודיו');
  assert.notEqual(TH.entitlement().tier, 'trainer');
  assert.match(page.el('redeemStatus').textContent, /נא להזין קוד גישה/);
  assert.equal(page.el('redeemStatus').className, 'status warn');
});

test('a wrong code on the trainer tier is still refused and keeps the brand', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: 'קיים' });
  const page = mountPage();
  page.submit('WRONG-CODE', 'אחר');
  assert.equal(page.el('redeemStatus').className, 'status warn');
  assert.equal(TH.entitlement().brand, 'קיים');
});
