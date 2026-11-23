/**
 * Mesocycle Rotation Advisor (6-8 weeks cycle tracking)
 * CommonJS & UMD module.
 * Namespace: window.THMesocycleAdvisor
 */
((root) => {
  const STORAGE_KEY = 'trainerhub_mesocycle_start';

  function parseDate(val) {
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  /**
   * Evaluates the age of the mesocycle and returns recommendation:
   * 'continue_current' (< 6 weeks)
   * 'prepare_rotation' (6-8 weeks)
   * 'rotate_now' (>= 8 weeks)
   *
   * @param {string|Date|null} startDateStr
   * @param {string|Date|null} nowDateStr
   * @param {number} [completedSessionsCount]
   * @returns {Object}
   */
  function evaluateMesocycleAge(startDateStr, nowDateStr, completedSessionsCount) {
    const sessions =
      typeof completedSessionsCount === 'number' && !Number.isNaN(completedSessionsCount) && completedSessionsCount >= 0
        ? Math.floor(completedSessionsCount)
        : 0;

    const startDate = parseDate(startDateStr);
    const nowDate = parseDate(nowDateStr) || new Date();

    if (!startDate) {
      return {
        status: 'continue_current',
        recommendation: 'continue_current',
        action: 'continue_current',
        weeks: 0,
        days: 0,
        completedSessions: sessions,
        badgeText: 'שבוע 0 מתוך 6-8',
        message: 'טרם נקבע תאריך התחלה למחזור. לחץ על «התחל מחזור 6 שבועות חדש» לאתחול.',
        toString: function () {
          return this.status;
        }
      };
    }

    const diffMs = nowDate.getTime() - startDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
    const weeks = Math.floor(diffDays / 7);

    let status = 'continue_current';
    let badgeText = `שבוע ${weeks} מתוך 6-8`;
    let message = `שבוע ${weeks} במחזור (${diffDays} ימים, ${sessions} אימונים). המשך בתוכנית הנוכחית.`;

    if (weeks >= 8) {
      status = 'rotate_now';
      badgeText = `שבוע ${weeks} - רענון מומלץ`;
      message = `המחזור הגיע ל-${weeks} שבועות (${diffDays} ימים, ${sessions} אימונים). מומלץ לרענן תרגילים ולהתחיל מחזור 6 שבועות חדש.`;
    } else if (weeks >= 6) {
      status = 'prepare_rotation';
      badgeText = `שבוע ${weeks} - הכנה לרענון`;
      message = `שבוע ${weeks} במחזור (${diffDays} ימים, ${sessions} אימונים). התראת הכנה לרענון תוכנית וסיום מחזור.`;
    }

    return {
      status: status,
      recommendation: status,
      action: status,
      weeks: weeks,
      days: diffDays,
      completedSessions: sessions,
      badgeText: badgeText,
      message: message,
      toString: function () {
        return this.status;
      }
    };
  }

  function getMesocycleStartDate() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        return localStorage.getItem(STORAGE_KEY);
      }
    } catch (_err) {
      // Storage unavailable or blocked
    }
    return null;
  }

  function setMesocycleStartDate(dateStr) {
    const val = dateStr || new Date().toISOString();
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        localStorage.setItem(STORAGE_KEY, val);
        return { ok: true, startDate: val };
      }
    } catch (err) {
      return { ok: false, error: err };
    }
    return { ok: false, error: new Error('Storage unavailable') };
  }

  function updateMesocycleBanner(bannerEl, nowDateStr, completedSessions) {
    if (!bannerEl) return null;
    const startStr = getMesocycleStartDate();
    const evaluation = evaluateMesocycleAge(startStr, nowDateStr, completedSessions);

    const statusBadge = bannerEl.querySelector('.mesocycle-badge') || bannerEl.querySelector('[data-role="badge"]');
    const statusMsg = bannerEl.querySelector('.mesocycle-message') || bannerEl.querySelector('[data-role="message"]');

    if (statusBadge) {
      statusBadge.textContent = evaluation.badgeText;
      statusBadge.setAttribute('data-status', evaluation.status);
    }
    if (statusMsg) {
      statusMsg.textContent = evaluation.message;
    }

    return evaluation;
  }

  function initMesocycleAdvisor(bannerIdOrEl, options) {
    const banner =
      typeof bannerIdOrEl === 'string'
        ? typeof document !== 'undefined' && document
          ? document.getElementById(bannerIdOrEl)
          : null
        : bannerIdOrEl;

    if (!banner) return null;

    const btn =
      banner.querySelector('button') ||
      (typeof document !== 'undefined' && document ? document.getElementById('startMesocycleBtn') : null);
    const getSessions = options && typeof options.getSessions === 'function' ? options.getSessions : () => 0;

    function refresh() {
      const sessions = getSessions();
      return updateMesocycleBanner(banner, null, sessions);
    }

    if (btn && !btn.__mesocycleBound) {
      btn.__mesocycleBound = true;
      btn.addEventListener('click', () => {
        try {
          const nowIso = new Date().toISOString();
          const res = setMesocycleStartDate(nowIso);
          if (!res?.ok) {
            const statusMsg =
              banner.querySelector('.mesocycle-message') || banner.querySelector('[data-role="message"]');
            if (statusMsg) {
              statusMsg.textContent = 'שגיאת אחסון מקומי: לא ניתן היה לשמור את תאריך התחלת המחזור.';
            }
            return;
          }
        } catch (_e) {
          // handled safely
        }
        refresh();
      });
    }

    refresh();
    return {
      banner: banner,
      refresh: refresh
    };
  }

  const api = {
    evaluateMesocycleAge: evaluateMesocycleAge,
    getMesocycleStartDate: getMesocycleStartDate,
    setMesocycleStartDate: setMesocycleStartDate,
    updateMesocycleBanner: updateMesocycleBanner,
    initMesocycleAdvisor: initMesocycleAdvisor,
    STORAGE_KEY: STORAGE_KEY
  };

  if (root) {
    root.THMesocycleAdvisor = api;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
