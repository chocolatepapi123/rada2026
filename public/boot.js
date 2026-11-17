/* Runs before first paint. Kept as a file (not inline) so the Content-Security-Policy can ban inline scripts. */
(function () {
  var root = document.documentElement;
  /* App theme: light unless the person chose dark. Phone bars do not follow it. */
  try {
    var dark = localStorage.getItem('rada_theme') === 'dark';
    root.classList.add(dark ? 'dark' : 'light');
    var m = document.querySelector('meta[name="color-scheme"]');
    if (m) m.setAttribute('content', dark ? 'dark' : 'light');
  } catch (e) { root.classList.add('light'); }
  /* Low-memory / data-saver phones get a lighter look (no blur effects). */
  try {
    var n = navigator, c = n.connection || {};
    if ((n.deviceMemory && n.deviceMemory <= 4) || (n.hardwareConcurrency && n.hardwareConcurrency <= 4) || c.saveData) {
      root.classList.add('low-end');
    }
  } catch (e) {}
  /* Fonts load without blocking first paint: the link starts as media=print, then switches on. */
  function fonts() {
    var l = document.querySelectorAll('link[data-async-css]');
    for (var i = 0; i < l.length; i++) l[i].media = 'all';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fonts); else fonts();
})();
