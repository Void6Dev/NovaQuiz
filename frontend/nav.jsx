// === React hooks → window, so Babel scripts can reference them bare ===
window.useState  = React.useState;
window.useEffect = React.useEffect;
window.useRef    = React.useRef;
window.useMemo   = React.useMemo;
window.useCallback = React.useCallback;
window.useLayoutEffect = React.useLayoutEffect;

// === Cross-page navigation ===
// Maps logical screen names to URLs. Each screen is its own HTML page.
// Use window.navigate('dashboard') or pass to onNav={navigate} prop.

const ROUTES = {
  landing:   'index.html',
  login:     'auth.html?mode=login',
  register:  'auth.html?mode=register',
  dashboard: 'dashboard.html',
  editor:    'editor.html',
  player:    'player.html',
  live:      'live.html',
  sessions:  'sessions.html',
  analytics: 'analytics.html',
  settings:  'settings.html',
  shared:    'shared.html',
  profile:   'profile.html',
  quiz:      'quiz.html',
};

var _navTimer = null;

function navigate(screen, params) {
  let url = ROUTES[screen];
  if (!url) {
    console.warn('[nav] unknown screen:', screen);
    return;
  }
  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
    ).toString();
    url += (url.includes('?') ? '&' : '?') + qs;
  }
  if (document.body.classList.contains('reduce-motion')) {
    window.location.href = url;
    return;
  }
  const target = document.querySelector('.page, .editor');
  if (target) {
    target.style.animation = 'pageLeave 150ms ease forwards';
    target.style.pointerEvents = 'none';
    if (_navTimer) clearTimeout(_navTimer);
    _navTimer = setTimeout(() => { _navTimer = null; window.location.href = url; }, 150);
  } else {
    window.location.href = url;
  }
}

// When page is restored from bfcache (browser back/forward), clear the leave-animation
// that was in progress at navigation time — without this the page stays at opacity:0.
window.addEventListener('pageshow', function(e) {
  if (!e.persisted) return;
  if (_navTimer) { clearTimeout(_navTimer); _navTimer = null; }
  var target = document.querySelector('.page, .editor');
  if (target) { target.style.animation = ''; target.style.pointerEvents = ''; }
});

// Cancel any pending navigation timer when the page is being unloaded,
// so it can't fire on an already-gone page or after a bfcache restore.
window.addEventListener('pagehide', function() {
  if (_navTimer) { clearTimeout(_navTimer); _navTimer = null; }
});

function getQueryParams() {
  const params = {};
  new URLSearchParams(window.location.search).forEach((v, k) => { params[k] = v; });
  return params;
}

// Derive current screen from filename
function getCurrentScreen() {
  const file = window.location.pathname.split('/').pop() || 'index.html';
  for (const [name, url] of Object.entries(ROUTES)) {
    if (url.split('?')[0] === file) return name;
  }
  return 'landing';
}

Object.assign(window, { ROUTES, navigate, getQueryParams, getCurrentScreen });
