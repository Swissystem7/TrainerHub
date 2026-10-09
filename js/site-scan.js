/**
 * TrainerHub — site-scan provider: photos → SiteProfile.
 * Classic script, no bundler. Namespace: window.THSiteScan.
 * analyzeSitePhotos() posts the photos to the site-scan proxy (worker/site-scan)
 * and always resolves: when there is no proxy, no network or a bad reply it
 * returns ok:false with an empty manual profile, so the coach continues with
 * the "מה יש בשטח?" checklist. The whole feature works through that fallback.
 */
(function (root) {
  'use strict';

  var Profile = root.THSiteProfile;
  if (typeof module === 'object' && module.exports) Profile = require('./site-profile.js');

  var MAX_IMAGES = 3;
  var MAX_SIDE = 1024;

  function endpoint(opts) {
    return (opts && opts.endpoint) || root.TH_SITE_SCAN_ENDPOINT || '';
  }

  function fallback(error) {
    return { ok: false, error: error, profile: Profile.emptyProfile() };
  }

  /** Browser only: File/Blob → { mime, data } JPEG, longest side ≤ 1024px. */
  function resizeImage(file, maxSide) {
    maxSide = maxSide || MAX_SIDE;
    return createImageBitmap(file).then(function (bmp) {
      var scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
      var url = canvas.toDataURL('image/jpeg', 0.8);
      return { mime: 'image/jpeg', data: url.slice(url.indexOf(',') + 1) };
    });
  }

  /**
   * images: [{ mime, data(base64) }] (use resizeImage first). opts: { endpoint, fetch }.
   * → Promise<{ ok, error, profile }>; never rejects.
   */
  function analyzeSitePhotos(images, opts) {
    opts = opts || {};
    var url = endpoint(opts);
    var doFetch = opts.fetch || (typeof fetch === 'function' ? fetch : null);
    var list = Array.isArray(images) ? images.slice(0, MAX_IMAGES) : [];
    if (!list.length) return Promise.resolve(fallback('no-images'));
    if (!url || !doFetch) return Promise.resolve(fallback('no-endpoint'));
    return Promise.resolve().then(function () {
      return doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: list })
      });
    }).then(function (res) {
      if (!res || !res.ok) return fallback('http-' + (res ? res.status : 0));
      return res.json().then(function (body) {
        var parsed = Profile.parseAiResponse(body && body.text);
        return parsed.ok ? { ok: true, error: null, profile: parsed.profile } : fallback(parsed.error);
      });
    }).catch(function () {
      return fallback('offline');
    });
  }

  var api = {
    MAX_IMAGES: MAX_IMAGES,
    MAX_SIDE: MAX_SIDE,
    resizeImage: resizeImage,
    analyzeSitePhotos: analyzeSitePhotos
  };

  root.THSiteScan = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
