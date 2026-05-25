// === Page shell — handles theme, accent palette, sidebar, tweaks ===
// Each HTML page uses this to mount its screen.

const { useState: shUseState, useEffect: shUseEffect } = React;

const SHELL_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": ["oklch(85% 0.18 130)", "oklch(76% 0.20 130)", "oklch(22% 0.06 130)"]
}/*EDITMODE-END*/;

const ACCENT_PALETTES = [
  ["oklch(85% 0.18 130)", "oklch(76% 0.20 130)", "oklch(22% 0.06 130)"],
  ["oklch(78% 0.15 220)", "oklch(68% 0.18 220)", "oklch(20% 0.06 220)"],
  ["oklch(78% 0.16 30)",  "oklch(68% 0.19 30)",  "oklch(20% 0.06 30)"],
  ["oklch(78% 0.16 320)", "oklch(68% 0.18 320)", "oklch(20% 0.06 320)"],
  ["oklch(82% 0.16 80)",  "oklch(72% 0.18 80)",  "oklch(20% 0.06 80)"],
];

const SHELL_PREFS_KEY = 'quiz:prefs';
function _shellLoadPrefs() { try { return JSON.parse(localStorage.getItem(SHELL_PREFS_KEY) || '{}'); } catch { return {}; } }
function _shellSavePref(key, val) { try { var p = _shellLoadPrefs(); p[key] = val; localStorage.setItem(SHELL_PREFS_KEY, JSON.stringify(p)); } catch {} }

// withSidebar: 'app' (sidebar shown), 'full' (no sidebar, full-bleed — landing/auth/editor/player/live)
function PageShell({ layout = 'app', current, children, theme: themeOverride, onTheme }) {
  const _saved = _shellLoadPrefs();
  const [t, _rawSetTweak] = useTweaks({
    ...SHELL_TWEAK_DEFAULTS,
    ...(_saved.theme  ? { theme:  _saved.theme  } : {}),
    ...(_saved.accent ? { accent: _saved.accent } : {}),
  });

  const setTweak = (keyOrEdits, val) => {
    _rawSetTweak(keyOrEdits, val);
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : { [keyOrEdits]: val };
    Object.entries(edits).forEach(([k, v]) => _shellSavePref(k, v));
  };

  // Allow page to control theme externally (e.g. Settings page reads/writes it)
  const theme = themeOverride !== undefined ? themeOverride : t.theme;
  const setTheme = (v) => {
    _shellSavePref('theme', v);
    if (onTheme) onTheme(v); else setTweak('theme', v);
  };

  shUseEffect(() => {
    const apply = (mode) => {
      let final = mode;
      if (mode === 'system') {
        final = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', final);
    };
    apply(theme);
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const fn = () => apply('system');
      mq.addEventListener('change', fn);
      return () => mq.removeEventListener('change', fn);
    }
  }, [theme]);

  shUseEffect(() => {
    const a = t.accent || ACCENT_PALETTES[0];
    const root = document.documentElement;
    root.style.setProperty('--accent', a[0]);
    root.style.setProperty('--accent-strong', a[1]);
    root.style.setProperty('--accent-fg', a[2]);
  }, [t.accent]);

  return (
    <>
      <div className={`app ${layout === 'full' ? 'app--no-sidebar' : ''}`}>
        {layout === 'app' && <Sidebar current={current} />}
        <main className="main">
          {children}
        </main>
      </div>
      {window.ToastContainer && React.createElement(window.ToastContainer)}
      {window.CommandPalette && React.createElement(window.CommandPalette)}

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio
          label="Mode"
          value={theme}
          options={[
            { value: 'light',  label: 'Light' },
            { value: 'dark',   label: 'Dark' },
            { value: 'system', label: 'Auto' },
          ]}
          onChange={(v) => setTheme(v)}
        />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={ACCENT_PALETTES}
          onChange={(v) => setTweak('accent', v)}
        />

        <TweakSection label="Pages" />
        <TweakSelect
          label="Jump to"
          value={window.getCurrentScreen()}
          options={[
            { value: 'landing',   label: '00 — Landing' },
            { value: 'login',     label: '01a — Login' },
            { value: 'register',  label: '01b — Register' },
            { value: 'dashboard', label: '02 — Dashboard' },
            { value: 'editor',    label: '03 — Editor' },
            { value: 'player',    label: '04 — Player' },
            { value: 'live',      label: '05 — Live mode' },
            { value: 'analytics', label: '06 — Analytics' },
            { value: 'settings',  label: '07 — Settings' },
            { value: 'sessions',  label: '08 — Sessions' },
            { value: 'profile',   label: '09 — Profile'  },
          ]}
          onChange={(v) => window.navigate(v)}
        />
      </TweaksPanel>
    </>
  );
}

// === FullPage — for landing/auth/player/editor/live (no sidebar) ===
function FullPage({ current, children, theme, onTheme }) {
  return <PageShell layout="full" current={current} theme={theme} onTheme={onTheme}>{children}</PageShell>;
}

// === AppPage — for dashboard/sessions/analytics/settings (with sidebar) ===
function AppPage({ current, children, theme, onTheme }) {
  return <PageShell layout="app" current={current} theme={theme} onTheme={onTheme}>{children}</PageShell>;
}

Object.assign(window, { PageShell, FullPage, AppPage, ACCENT_PALETTES });
