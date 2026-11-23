const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const POD = require('../src/product-or-demo.js');

test('projectPurpose matches the documented project mission', () => {
  assert.equal(typeof POD.projectPurpose, 'function');
  const purpose = POD.projectPurpose();
  assert.equal(purpose, 'בונה תוכניות אימון שבועיות למאמנים אישיים — במקום אקסל — עם ספריית וידאו');
  assert.equal(POD.PROJECT_PURPOSE, purpose);
});

test('classifyProductOrDemo in free/null tier classifies as demo mode', () => {
  const res = POD.classifyProductOrDemo(null);
  assert.equal(res.isDemo, true);
  assert.equal(res.isProduct, false);
  assert.equal(res.kind, 'demo');
  assert.equal(res.label, 'הדגמה');
  assert.equal(res.verdict, 'PARK');
  assert.equal(res.hasServer, false);
  assert.equal(res.noPaymentGate, true);
  assert.match(res.statusText, /הדגמה — בונה אימונים מקומי בדפדפן/);
});

test('classifyProductOrDemo in trainer tier classifies as product mode', () => {
  const res = POD.classifyProductOrDemo({ tier: 'trainer', brand: 'מאמן אישי' });
  assert.equal(res.isDemo, false);
  assert.equal(res.isProduct, true);
  assert.equal(res.kind, 'product');
  assert.equal(res.label, 'מוצר');
  assert.equal(res.verdict, 'PARK');
  assert.equal(res.hasServer, false);
  assert.equal(res.noPaymentGate, true);
  assert.match(res.statusText, /מוצר — גרסת מאמן פעילה במכשיר/);
});

test('classifyProductOrDemo lists capabilities with honest boundaries and tier gates', () => {
  const demoCaps = POD.classifyProductOrDemo({ tier: 'free' }).capabilities;
  const trainerCaps = POD.classifyProductOrDemo({ tier: 'trainer' }).capabilities;

  assert.ok(Array.isArray(demoCaps) && demoCaps.length >= 7);
  assert.ok(Array.isArray(trainerCaps) && trainerCaps.length >= 7);

  // Both have core builder and library
  const demoBuilder = demoCaps.find((c) => c.id === 'builder');
  const demoLib = demoCaps.find((c) => c.id === 'library');
  assert.equal(demoBuilder.available, true);
  assert.equal(demoLib.available, true);

  // Sharing and branded PDF are trainer only
  const demoShare = demoCaps.find((c) => c.id === 'share');
  const trainerShare = trainerCaps.find((c) => c.id === 'share');
  assert.equal(demoShare.available, false);
  assert.equal(trainerShare.available, true);

  // Cloud sync and payments are false in both (honest technical boundaries)
  const demoCloud = demoCaps.find((c) => c.id === 'cloud_sync');
  const trainerCloud = trainerCaps.find((c) => c.id === 'cloud_sync');
  assert.equal(demoCloud.available, false);
  assert.equal(trainerCloud.available, false);
});

test('renderProductStatus safely handles null or invalid containers', () => {
  assert.equal(POD.renderProductStatus(null), false);
  assert.equal(POD.renderProductStatus({}), false);
});

test('renderProductStatus renders badge, description and capabilities list', () => {
  const children = [];
  const fakeElement = {
    className: '',
    textContent: '',
    appendChild: (node) => {
      children.push(node);
      return node;
    },
    removeChild: (node) => {
      const idx = children.indexOf(node);
      if (idx !== -1) children.splice(idx, 1);
    },
    get firstChild() {
      return children[0] || null;
    }
  };

  const oldDoc = global.document;
  global.document = {
    createElement: (tag) => {
      const subChildren = [];
      return {
        tagName: tag.toUpperCase(),
        className: '',
        textContent: '',
        appendChild: (child) => {
          subChildren.push(child);
          return child;
        },
        children: subChildren
      };
    }
  };

  try {
    const ok = POD.renderProductStatus(fakeElement, { tier: 'trainer' });
    assert.equal(ok, true);
    assert.equal(children.length, 3);
    assert.equal(children[0].className, 'status-badge product');
    assert.equal(children[0].textContent, 'מוצר');
    assert.match(children[1].textContent, /מוצר — גרסת מאמן/);
    assert.equal(children[2].className, 'status-capabilities');
    assert.ok(children[2].children.length >= 7);
  } finally {
    global.document = oldDoc;
  }
});

test('src/product-or-demo.html exists, is Hebrew RTL and wires product-or-demo.js', () => {
  const htmlPath = path.join(root, 'src', 'product-or-demo.html');
  assert.ok(fs.existsSync(htmlPath), 'src/product-or-demo.html must exist');
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.match(html, /lang="he"/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /id="statusContainer"/);
  assert.match(html, /<script[^>]*src=["']\.\/product-or-demo\.js["']/);
  assert.match(html, /THProductOrDemo/);
});
