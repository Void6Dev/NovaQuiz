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
    }
    if (prefs.reduceMotion)  document.documentElement.classList.add('reduce-motion');
    if (prefs.compactDensity) document.documentElement.classList.add('compact');
  } catch (e) {}
})();
