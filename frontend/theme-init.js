// Applies the saved theme, motion, and density prefs before React mounts.
// Loaded synchronously in <head> on every page.
(function () {
  try {
    var prefs = JSON.parse(localStorage.getItem('quiz:prefs') || '{}');
    var theme = prefs.theme;
    if (theme) {
      if (theme === 'system') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'custom') {
        var p = prefs.customPalette || {};
        document.documentElement.style.setProperty('--custom-accent-h', p.accentH || 130);
        document.documentElement.style.setProperty('--custom-tint-h', p.tintH || 270);
      }
    }
    if (prefs.reduceMotion)  document.documentElement.classList.add('reduce-motion');
    if (prefs.compactDensity) document.documentElement.classList.add('compact');
  } catch (e) {}
})();

// === Design-tooling dev flag ===
// `data-screen-label` attributes are a design/QA navigation aid — not part of the
// shipped product. They are emitted only off-production so they never leak into
// the real app's DOM or inspector. Force on/off with:
//   localStorage['quiz:screen-labels'] = '1'  // always show
//   localStorage['quiz:screen-labels'] = '0'  // always hide
(function () {
  function detect() {
    try {
      var override = localStorage.getItem('quiz:screen-labels');
      if (override === '1') return true;
      if (override === '0') return false;
    } catch (e) {}
    var h = location.hostname;
    return location.protocol === 'file:' ||
      h === '' || h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' ||
      /\.local$/.test(h);
  }
  window.__SCREEN_LABELS__ = detect();
  // Spread the result into a JSX element: <div {...screenLabel('02 Browse')}>
  window.screenLabel = function (label) {
    return window.__SCREEN_LABELS__ ? { 'data-screen-label': label } : {};
  };
})();
