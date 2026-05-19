// Applies the saved theme before React mounts to prevent flash of wrong theme.
// Loaded synchronously in <head> on every page.
(function () {
  try {
    var prefs = JSON.parse(localStorage.getItem('quiz:prefs') || '{}');
    var theme = prefs.theme;
    if (!theme) return;
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
