const test = require('node:test');
const assert = require('node:assert');
const TH = require('../js/core.js');

test('mediaMarkup escapes HTML characters in className option to prevent tag injection', () => {
  const payload = 'bad"<script>alert(1)</script>';
  const entry = { he: 'תרגיל בדיקה', available: false };
  const markup = TH.mediaMarkup(entry, { className: payload });

  assert.ok(!markup.includes('<script>'), 'Unescaped <script> tag must not appear in markup');
  assert.ok(!markup.includes('</script>'), 'Unescaped </script> tag must not appear in markup');
  assert.ok(markup.includes('&lt;script&gt;'), 'Angle brackets in class name must be properly escaped');
});
