/**
 * Trainee-link encoding: plan in the URL hash, result as a pasteable TH1 code.
 * No server, no login. Used by workout-mode and Creator Studio.
 */
(function (root) {
  'use strict';

  function utf8ToB64url(str) {
    var bytes = new TextEncoder().encode(String(str));
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlToUtf8(s) {
    var t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    var bin = atob(t);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function compactPlan(w) {
    w = w || {};
    return {
      t: w.title || 'אימון',
      d: w.duration_minutes || null,
      i: w.intensity || null,
      p: (w.phases || []).map(function (ph) {
        return {
          n: ph.name,
          e: (ph.exercises || []).map(function (ex) {
            var row = { n: ex.name };
            if (ex.id) row.id = ex.id;
            if (ex.sets != null) row.s = ex.sets;
            if (ex.reps != null) row.r = ex.reps;
            if (ex.duration_seconds != null) row.ds = ex.duration_seconds;
            if (ex.rest_seconds != null) row.rs = ex.rest_seconds;
            return row;
          })
        };
      })
    };
  }

  function expandPlan(c) {
    c = c || {};
    return {
      title: c.t || 'אימון',
      duration_minutes: c.d || null,
      intensity: c.i || null,
      phases: (c.p || []).map(function (ph) {
        return {
          name: ph.n,
          exercises: (ph.e || []).map(function (ex) {
            return {
              name: ex.n,
              id: ex.id || null,
              sets: ex.s != null ? ex.s : null,
              reps: ex.r != null ? ex.r : null,
              duration_seconds: ex.ds != null ? ex.ds : null,
              rest_seconds: ex.rs != null ? ex.rs : null,
              notes: null
            };
          })
        };
      })
    };
  }

  function workoutModeUrl() {
    var here = location.href.split('#')[0].split('?')[0];
    if (/workout-mode\.html$/i.test(here)) return here;
    if (/\/frontend\/?$/i.test(here) || /\/frontend\/index\.html$/i.test(here)) {
      return here.replace(/index\.html$/i, '').replace(/\/?$/, '/') + 'workout-mode.html';
    }
    return here.replace(/[^/]*$/, '') + 'frontend/workout-mode.html';
  }

  function encodeLink(workout, meta) {
    meta = meta || {};
    var payload = {
      p: compactPlan(workout),
      wa: meta.wa || '',
      n: meta.name || '',
      tid: meta.tid || ('t_' + Date.now().toString(36))
    };
    return workoutModeUrl() + '#TH.' + utf8ToB64url(JSON.stringify(payload));
  }

  function decodeHash(hash) {
    var raw = String(hash || location.hash || '').replace(/^#/, '');
    if (!raw) return null;
    var token = raw;
    if (raw.indexOf('TH.') === 0) token = raw.slice(3);
    else if (raw.indexOf('p=') === 0) token = raw.slice(2);
    else return null;
    try {
      var data = JSON.parse(b64urlToUtf8(token));
      if (!data || !data.p) return null;
      return {
        workout: expandPlan(data.p),
        wa: data.wa || '',
        name: data.n || '',
        tid: data.tid || ''
      };
    } catch (e) {
      return null;
    }
  }

  function encodeResult(result) {
    result = result || {};
    var payload = {
      v: 1,
      n: result.name || '',
      t: result.title || '',
      at: result.doneAt || new Date().toISOString(),
      m: result.minutes != null ? result.minutes : 0,
      e: result.exercises != null ? result.exercises : 0,
      s: result.sets != null ? result.sets : 0,
      sk: result.skipped != null ? result.skipped : 0,
      tid: result.tid || '',
      rpe: result.rpe != null ? result.rpe : null
    };
    return 'TH1.' + utf8ToB64url(JSON.stringify(payload));
  }

  function decodeResult(text) {
    var m = String(text || '').match(/TH1\.[A-Za-z0-9_-]+/);
    if (!m) {
      try {
        var obj = JSON.parse(String(text || '').trim());
        if (obj && (obj.v === 1 || obj.at || obj.t)) return normalizeResult(obj);
      } catch (e) {}
      return null;
    }
    try {
      return normalizeResult(JSON.parse(b64urlToUtf8(m[0].slice(4))));
    } catch (e) {
      return null;
    }
  }

  function normalizeResult(obj) {
    if (!obj || typeof obj !== 'object') return null;
    return {
      v: 1,
      name: obj.n || obj.name || '',
      title: obj.t || obj.title || 'אימון',
      doneAt: obj.at || obj.doneAt || new Date().toISOString(),
      minutes: Number(obj.m != null ? obj.m : obj.minutes) || 0,
      exercises: Number(obj.e != null ? obj.e : obj.exercises) || 0,
      sets: Number(obj.s != null ? obj.s : obj.sets) || 0,
      skipped: Number(obj.sk != null ? obj.sk : obj.skipped) || 0,
      tid: obj.tid || '',
      rpe: obj.rpe != null ? Number(obj.rpe) : null
    };
  }

  function waShareUrl(phone, message) {
    var digits = String(phone || '').replace(/\D/g, '');
    var intl = digits;
    if (intl.charAt(0) === '0') intl = '972' + intl.slice(1);
    var base = intl ? ('https://wa.me/' + intl) : 'https://wa.me/';
    return base + '?text=' + encodeURIComponent(message);
  }

  root.ThLink = {
    encodeLink: encodeLink,
    decodeHash: decodeHash,
    encodeResult: encodeResult,
    decodeResult: decodeResult,
    compactPlan: compactPlan,
    expandPlan: expandPlan,
    workoutModeUrl: workoutModeUrl,
    waShareUrl: waShareUrl
  };
})(typeof window !== 'undefined' ? window : this);
