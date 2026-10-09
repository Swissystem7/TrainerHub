/**
 * TrainerHub — the AI provider layer of "סריקת שטח" (site scan).
 * Classic script, no bundler. Namespace: window.THSiteScan.
 *
 * One entry point: analyzeSitePhotos(images) -> Promise<Result>. It never
 * rejects and never returns anything but a strict SiteProfile, because the
 * coach must get a usable card even when the AI is missing, blocked or talking
 * nonsense. Result:
 *   { ok, profile, provider, error, he }
 * ok=false always still carries a profile (the empty manual one) plus a Hebrew
 * line to show, so the page can fall straight through to the manual checklist.
 *
 * Providers are pluggable (register()). Default: 'proxy' — the Gemini key lives
 * in worker/site-scan (or backend/site_scan.py in local dev), never here. With
 * no endpoint configured the default is 'manual', i.e. no AI at all.
 */
(function (root) {
  'use strict';

  // Resolved on use, not on load: the script tags may come in any order, and
  // js/site-profile.js only has to be there by the time a scan actually runs.
  var required = typeof module === 'object' && module.exports ? require('./site-profile.js') : null;
  function Profile() { return required || root.THSiteProfile; }

  var MAX_IMAGES = 3;
  var MAX_BYTES = 4 * 1024 * 1024;
  var MIME = ['image/jpeg', 'image/png', 'image/webp'];
  var BASE64 = /^[A-Za-z0-9+/=]+$/;

  // Every message ends the same way: the coach marks the site by hand.
  var ERRORS_HE = {
    'no-endpoint': 'סריקה אוטומטית לא מחוברת כאן — סמנו ידנית מה יש בשטח.',
    'not-configured': 'הסריקה האוטומטית עוד לא מחוברת — סמנו ידנית מה יש בשטח.',
    'no-images': 'לא נבחרה תמונה — אפשר לסמן ידנית מה יש בשטח.',
    'images': 'התמונות לא מתאימות (עד 3 תמונות JPG/PNG/WEBP) — סמנו ידנית מה יש בשטח.',
    'too-large': 'התמונות גדולות מדי — צלמו שוב או סמנו ידנית מה יש בשטח.',
    'rate': 'יותר מדי סריקות ברגע זה — נסו בעוד דקה או סמנו ידנית.',
    'origin': 'הסריקה האוטומטית לא זמינה מהכתובת הזו — סמנו ידנית מה יש בשטח.',
    'offline': 'אין חיבור לסריקה האוטומטית — סמנו ידנית מה יש בשטח.',
    'upstream': 'הזיהוי האוטומטי לא הצליח — סמנו ידנית מה יש בשטח.',
    'empty': 'לא הצלחתי לזהות מהתמונות — סמנו ידנית מה יש בשטח.',
    'no-json': 'התשובה מהזיהוי לא הייתה קריאה — סמנו ידנית מה יש בשטח.',
    'bad-json': 'התשובה מהזיהוי לא הייתה קריאה — סמנו ידנית מה יש בשטח.'
  };

  var STATUS_ERRORS = { 400: 'images', 403: 'origin', 405: 'upstream', 413: 'too-large', 429: 'rate', 503: 'not-configured' };

  function messageFor(error) {
    return ERRORS_HE[error] || 'הזיהוי האוטומטי לא הצליח — סמנו ידנית מה יש בשטח.';
  }

  /** The configured proxy, from opts or window.TH_SITE_SCAN_ENDPOINT. '' when there is none. */
  function endpoint(opts) {
    var url = (opts && opts.endpoint) || root.TH_SITE_SCAN_ENDPOINT || '';
    return typeof url === 'string' ? url.trim() : '';
  }

  /** Is an AI path configured at all? The page uses this to label the button. */
  function available(opts) {
    return !!endpoint(opts) && typeof ((opts && opts.fetch) || root.fetch) === 'function';
  }

  function failure(error, provider) {
    return { ok: false, profile: Profile().emptyProfile(), provider: provider || null, error: error, he: messageFor(error) };
  }

  /**
   * Photos as the Worker accepts them: 1-3 { mime, data(base64) }, same limits.
   * Rejecting here keeps a hopeless request off the network (and off the free tier).
   */
  function prepareImages(images) {
    var list = Array.isArray(images) ? images : (images ? [images] : []);
    if (!list.length) return { ok: false, error: 'no-images' };
    if (list.length > MAX_IMAGES) return { ok: false, error: 'images' };
    var bytes = 0;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var im = list[i] || {};
      var data = typeof im.data === 'string' ? im.data.replace(/^data:[^,]*,/, '') : '';
      if (MIME.indexOf(im.mime) === -1 || !data || !BASE64.test(data)) return { ok: false, error: 'images' };
      bytes += data.length;
      out.push({ mime: im.mime, data: data });
    }
    if (bytes > MAX_BYTES) return { ok: false, error: 'too-large' };
    return { ok: true, images: out };
  }

  /** No AI: the manual checklist starting point. Always succeeds, works offline. */
  var manualProvider = {
    id: 'manual',
    available: function () { return true; },
    analyze: function () {
      return Promise.resolve({ ok: true, profile: Profile().emptyProfile(), provider: 'manual', error: null, he: '' });
    }
  };

  /** Gemini (or anything with the same contract) behind the proxy in worker/site-scan. */
  var proxyProvider = {
    id: 'proxy',
    available: available,
    analyze: function (images, opts) {
      opts = opts || {};
      var url = endpoint(opts);
      if (!url) return Promise.resolve(failure('no-endpoint', 'proxy'));
      var send = opts.fetch || root.fetch;
      if (typeof send !== 'function') return Promise.resolve(failure('offline', 'proxy'));
      var prepared = prepareImages(images);
      if (!prepared.ok) return Promise.resolve(failure(prepared.error, 'proxy'));

      return Promise.resolve().then(function () {
        return send(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: prepared.images })
        });
      }).then(function (res) {
        if (!res) return failure('upstream', 'proxy');
        if (!res.ok) return failure(STATUS_ERRORS[res.status] || 'upstream', 'proxy');
        return Promise.resolve(res.json()).then(function (body) {
          // The proxy answers { text }; a provider that hands back the object
          // itself is fine too. Either way an empty reply is a failure, not an
          // empty profile the coach would mistake for "nothing is here".
          var payload = body && typeof body === 'object' && 'text' in body ? body.text : body;
          if (payload == null || payload === '' ||
            (typeof payload === 'object' && !Object.keys(payload).length)) return failure('empty', 'proxy');
          var parsed = Profile().parseAiResponse(payload);
          if (!parsed.ok) return failure(parsed.error, 'proxy');
          return { ok: true, profile: parsed.profile, provider: 'proxy', error: null, he: '' };
        }, function () {
          return failure('bad-json', 'proxy');
        });
      }, function () {
        return failure('offline', 'proxy');
      });
    }
  };

  var providers = { manual: manualProvider, proxy: proxyProvider };

  /** Add or replace a provider. Must expose analyze(images, opts) -> Promise<Result>. */
  function register(id, provider) {
    if (!id || !provider || typeof provider.analyze !== 'function') return false;
    providers[id] = provider;
    return true;
  }

  function providerFor(opts) {
    var wanted = opts && opts.provider;
    if (wanted && providers[wanted]) return providers[wanted];
    if (wanted) return null;
    return available(opts) ? providers.proxy : providers.manual;
  }

  /**
   * images: [{ mime, data }] (base64, resized by the page to <=1024px).
   * opts: { provider, endpoint, fetch } — all optional.
   * Resolves (never rejects) with { ok, profile, provider, error, he }.
   */
  function analyzeSitePhotos(images, opts) {
    var provider = providerFor(opts);
    if (!provider) return Promise.resolve(failure('upstream', (opts && opts.provider) || null));
    var result;
    try {
      result = provider.analyze(images, opts || {});
    } catch (e) {
      return Promise.resolve(failure('upstream', provider.id));
    }
    return Promise.resolve(result).then(function (r) {
      if (!r || typeof r !== 'object') return failure('upstream', provider.id);
      if (!r.ok) return failure(r.error || 'upstream', r.provider || provider.id);
      return {
        ok: true,
        // The provider decides the source: 'ai' for a model reply, 'manual' for the checklist.
        profile: Profile().normalize(r.profile, r.profile && r.profile.source),
        provider: r.provider || provider.id,
        error: null,
        he: r.he || ''
      };
    }, function () {
      return failure('upstream', provider.id);
    });
  }

  var api = {
    MAX_IMAGES: MAX_IMAGES,
    MAX_BYTES: MAX_BYTES,
    MIME: MIME,
    ERRORS_HE: ERRORS_HE,
    endpoint: endpoint,
    available: available,
    prepareImages: prepareImages,
    messageFor: messageFor,
    register: register,
    providers: providers,
    analyzeSitePhotos: analyzeSitePhotos
  };

  root.THSiteScan = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
