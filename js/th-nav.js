/* Scroll the current .th-nav chip into view (keeps fixed nav order; no CSS order). */
(function () {
  function scrollCurrentNavChip() {
    var nav = document.querySelector('nav.th-nav');
    if (!nav) return;
    var cur = nav.querySelector('[aria-current="page"], .chip.on');
    if (!cur || typeof cur.scrollIntoView !== 'function') return;
    try {
      /* nearest stays inside the nav scroller. center also scrolls the page
         and hides the first chips on a narrow screen. */
      cur.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    } catch (e) {
      cur.scrollIntoView(false);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrollCurrentNavChip);
  } else {
    scrollCurrentNavChip();
  }
})();
