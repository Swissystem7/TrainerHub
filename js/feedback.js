/**
 * TrainerHub — מחולל הקישור לטופס המשוב.
 *
 * ערוץ הפנייה הציבורי הוא טופס Google «משוב על האפליקציות» של הבעלים, עם
 * TrainerHub ממולא מראש (entry.368039752 — האפשרות המדויקת בטופס).
 *
 * feedbackUrl() מחזירה תמיד את אותה מחרוזת קבועה. היא לא מקבלת ולא קוראת שום
 * נתון מהאפליקציה: לא מזהה משתמש, לא אימון, לא localStorage, לא זמן ולא מצב
 * הדפדפן — וממילא לא מצרפת פרמטרים נוספים לקישור. כל ארגומנט שיועבר לה מתעלמים
 * ממנו בכוונה, כדי שלא תיפתח דלת אחורית לדליפת מידע דרך ה-query string.
 *
 * הבעלים מחבר אותה בעצמו לכפתור «דווחו לנו / הציעו שיפור» בתחתית המסך הראשי,
 * או ב־attach(el) שמציב href/target/rel על עוגן קיים.
 *
 * Classic script. Namespace: window.THFeedback
 */
(function (root) {
  'use strict';

  var FORM_ID = '1FAIpQLSdT8YduNx-VWKM3bWGUJdiSj4Sw9D-EA6R6c-oYVYCQmOVXxQ';
  var ENTRY_KEY = 'entry.368039752';
  var ENTRY_VALUE = 'TrainerHub';

  // נבנה פעם אחת, מחלקים חד־משמעיים, ומוקפא. אין כאן תבנית שמישהו ממלא בזמן ריצה.
  var FEEDBACK_URL = 'https://docs.google.com/forms/d/e/' + FORM_ID +
    '/viewform?usp=pp_url&' + ENTRY_KEY + '=' + ENTRY_VALUE;

  var LABEL = 'דווחו לנו / הציעו שיפור';

  /**
   * הקישור המדויק לטופס המשוב.
   * אין פרמטרים: מתעלמים מכל ארגומנט, ואין קריאה למצב האפליקציה.
   * @returns {string} אותה מחרוזת בכל קריאה.
   */
  function feedbackUrl() {
    return FEEDBACK_URL;
  }

  /**
   * מחבר עוגן קיים לקישור. לא מוסיף מאזינים ולא שולח שום דבר לשום מקום —
   * ניווט רגיל של הדפדפן.
   * @param {object} el עוגן (<a>) מה-DOM.
   * @returns {boolean} האם החיבור בוצע.
   */
  function attach(el) {
    if (!el || typeof el !== 'object') return false;
    el.href = feedbackUrl();
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
    if (typeof el.textContent === 'string' && !el.textContent.trim()) {
      el.textContent = LABEL;
    }
    return true;
  }

  var api = {
    FEEDBACK_URL: FEEDBACK_URL,
    ENTRY_KEY: ENTRY_KEY,
    ENTRY_VALUE: ENTRY_VALUE,
    LABEL: LABEL,
    feedbackUrl: feedbackUrl,
    attach: attach
  };

  if (typeof Object.freeze === 'function') Object.freeze(api);

  root.THFeedback = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
