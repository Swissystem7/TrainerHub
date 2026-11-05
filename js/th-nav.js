/* Scroll the current .th-nav chip into view (keeps fixed nav order; no CSS order). */
(function () {
  function scrollCurrentNavChip() {
    var nav = document.querySelector('nav.th-nav');
    if (!nav) return;
    var cur = nav.querySelector('[aria-current="page"], .chip.on');
    if (!cur || typeof cur.scrollIntoView !== 'function') return;
    try {
      cur.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
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
