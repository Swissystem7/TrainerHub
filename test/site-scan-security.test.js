'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Scan = require('../js/site-scan.js');
const TH = require('../js/core.js');

test('siteScanSecurity throws when text is embedded in HTML without escaping', function () {
  const payload = '<img src=x onerror=alert(1)>';
  assert.throws(
    function () {
      Scan.siteScanSecurity(payload, { asHtml: true });
    },
    function (err) {
      return err && /unsafe|escape|html/i.test(String(err.message));
    },
    'raw markup must not be allowed in HTML mode'
  );
});

test('siteScanSecurity allows plain labels and escaped markup in HTML mode', function () {
  const payload = '<script>alert(1)</script>';
  assert.doesNotThrow(function () {
    Scan.siteScanSecurity('מדרגות בשטח', { asHtml: true });
  });
  assert.doesNotThrow(function () {
    Scan.siteScanSecurity(TH.esc(payload), { asHtml: true });
  });
});
