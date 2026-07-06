// === Auth — Login + Register ===
function Auth({ mode: initialMode = 'login', onSuccess, onSwitch }) {
  const [mode, setMode] = useState(initialMode);
  return (
    <div className="auth-page" {...screenLabel(mode === 'login' ? '00 Login' : '00 Register')}>
      <div className="auth-left">
        <div className="auth-brand">
          <NQLogo size={32} />
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>Nova<span style={{ color: 'var(--accent)' }}>Quiz</span></span>
        </div>
        <div className="auth-card">
          {mode === 'login'
            ? <LoginForm onSuccess={onSuccess} onSwitch={() => setMode('register')} onForgot={() => setMode('forgot')} />
            : mode === 'register'
            ? <RegisterForm onSuccess={onSuccess} onSwitch={() => setMode('login')} />
            : <ForgotPasswordForm onBack={() => setMode('login')} />}
        </div>
        <SiteFooter variant="compact" />
        <FormStyles />
      </div>

      <div className="auth-right">
        <AuthVisual />
      </div>

      <style>{`
        .auth-page {
          height: 100vh; width: 100vw;
          display: grid; grid-template-columns: 1fr 1fr;
        }
        .auth-left {
          padding: 32px 48px;
          display: flex; flex-direction: column;
        }
        .auth-brand {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: auto;
        }
        .auth-card {
          width: 100%; max-width: 380px;
          margin: 60px auto;
        }
        .auth-page .site-footer--compact { border-top: 0; padding: 0; }

        .auth-right {
          background: var(--bg-2);
          border-left: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 900px) {
          .auth-page { grid-template-columns: 1fr; }
          .auth-right { display: none; }
        }
      `}</style>
    </div>
  );
}

function LoginForm({ onSuccess, onSwitch, onForgot }) {
  window.useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) return setError(t('auth.err_both'));
    setSubmitting(true);
    try {
      const user = await window.API.post('/auth/login/', { username, password });
      window.API.saveUser(user);
      onSuccess();
    } catch (err) {
      setError(err.message || t('auth.err_login'));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="fade-in">
      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
        {t('auth.welcome')}
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 32 }}>
        {t('auth.login_sub')}{' '}{t('auth.new_here')}{' '}
        <a onClick={onSwitch} style={{ color: 'var(--text)', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {t('auth.create_acct')}
        </a>
      </p>

      <FormField label={t('auth.username')}>
        <input
          autoFocus className="input input--lg"
          value={username} onChange={e => setUsername(e.target.value)}
          placeholder="your-handle"
          autoComplete="username"
        />
      </FormField>

      <FormField label={t('auth.password')} trailing={
        <a onClick={onForgot} style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>{t('auth.forgot')}</a>
      }>
        <div style={{ position: 'relative' }}>
          <input
            className="input input--lg"
            type={showPwd ? 'text' : 'password'}
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            style={{ paddingRight: 44 }}
          />
          <button type="button" onClick={() => setShowPwd(s => !s)} style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            padding: 8, color: 'var(--text-faint)', borderRadius: 6,
          }}>
            <Icon name="eye" size={16} />
          </button>
        </div>
      </FormField>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="btn btn--primary btn--lg" disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
        {submitting ? t('auth.signing_in') : <>{t('auth.sign_in')} <Icon name="arrowRight" size={14} /></>}
      </button>

      <SocialLoginButtons dividerLabel="or continue with" onSuccess={onSuccess} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px', color: 'var(--text-faint)', fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        OR
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <button type="button" className="btn btn--secondary btn--lg" style={{ width: '100%' }} onClick={() => window.navigate('player')}>
        {t('auth.guest')}
      </button>
    </form>
  );
}

function RegisterForm({ onSuccess, onSwitch }) {
  window.useLang();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const strength = passwordStrength(password);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !password) return setError(t('auth.err_all'));
    if (password.length < 8) return setError(t('auth.err_pw'));
    setSubmitting(true);
    try {
      const user = await window.API.post('/auth/register/', { username, email, password });
      window.API.saveUser(user);
      onSuccess();
    } catch (err) {
      setError(err.message || t('auth.err_register'));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="fade-in">
      <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
        {t('auth.reg_title')}
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 32 }}>
        {t('auth.reg_sub')}{' '}
        <a onClick={onSwitch} style={{ color: 'var(--text)', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {t('auth.sign_instead')}
        </a>
      </p>

      <FormField label={t('auth.username')} hint={t('auth.uname_hint')}>
        <div style={{ position: 'relative' }}>
          <span className="mono" style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-faint)', fontSize: 14, pointerEvents: 'none',
          }}>@</span>
          <input
            autoFocus className="input input--lg"
            style={{ paddingLeft: 32 }}
            value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ''))}
            placeholder="your-handle"
            autoComplete="username"
          />
        </div>
      </FormField>

      <FormField label={t('auth.email')}>
        <input
          className="input input--lg"
          type="email"
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </FormField>

      <FormField label={t('auth.password')} hint={t('auth.pw_min')}>
        <input
          className="input input--lg"
          type="password"
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        {password && <PasswordStrength strength={strength} />}
      </FormField>

      {error && <div className="form-error">{error}</div>}

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, cursor: 'pointer' }}>
        <input type="checkbox" defaultChecked style={{ marginTop: 3, accentColor: 'var(--text)' }} />
        <span>
          {t('auth.agree')}{' '}
          <a style={{ color: 'var(--text)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{t('auth.terms')}</a>
          {' '}{t('auth.and')}{' '}
          <a style={{ color: 'var(--text)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{t('auth.privacy')}</a>.
        </span>
      </label>

      <button type="submit" className="btn btn--primary btn--lg" disabled={submitting} style={{ width: '100%' }}>
        {submitting ? t('auth.creating') : <>{t('auth.create')} <Icon name="arrowRight" size={14} /></>}
      </button>

      <SocialLoginButtons dividerLabel="or sign up with" onSuccess={onSuccess} />
    </form>
  );
}

function FormField({ label, hint, trailing, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{label}</label>
        {trailing}
      </div>
      {children}
      {hint && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function passwordStrength(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}

function PasswordStrength({ strength }) {
  const labels = [t('auth.pw0'), t('auth.pw1'), t('auth.pw2'), t('auth.pw3'), t('auth.pw4')];
  const colors = ['var(--danger)', 'oklch(68% 0.16 45)', 'oklch(78% 0.16 75)', 'oklch(70% 0.16 130)', 'oklch(60% 0.18 145)'];
  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, display: 'flex', gap: 3 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i < strength ? colors[strength] : 'var(--bg-2)',
            transition: 'background 200ms',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color: colors[strength], minWidth: 70, textAlign: 'right' }}>
        {labels[strength]}
      </span>
    </div>
  );
}

// ── Social brand icons ────────────────────────────────────────────────────────
function GoogleSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function DiscordSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

function MailSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="3"/>
      <path d="M2 7l10 7 10-7"/>
    </svg>
  );
}

// ── OAuth helpers ─────────────────────────────────────────────────────────────

function _loadGIS() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload  = resolve;
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

function _openPopup(url, name) {
  return new Promise((resolve, reject) => {
    const W = 500, H = 650;
    const left = Math.round(window.screenX + (window.outerWidth  - W) / 2);
    const top  = Math.round(window.screenY + (window.outerHeight - H) / 2);
    const popup = window.open(url, name, `width=${W},height=${H},left=${left},top=${top},resizable,scrollbars`);
    if (!popup) return reject(new Error('Popup blocked — please allow popups for this site and try again.'));

    // Discord sets Cross-Origin-Opener-Policy headers which null out window.opener
    // in the popup. BroadcastChannel works regardless of COOP.
    let settled = false;
    const ch = new BroadcastChannel('nova-quiz-social-auth');

    const done = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      ch.close();
      fn();
    };

    ch.onmessage = (e) => {
      if (e.data?.type !== 'social-callback') return;
      done(() => e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.code));
    };

    // Fallback: user closed the popup manually (5-min hard timeout)
    const timer = setTimeout(() => done(() => reject(new Error('Login cancelled'))), 5 * 60 * 1000);
  });
}

// ── Social login row ──────────────────────────────────────────────────────────
function SocialLoginButtons({ dividerLabel = 'or continue with', onSuccess }) {
  const [cfg,     setCfg]     = React.useState(null);
  const [loading, setLoading] = React.useState('');

  React.useEffect(() => {
    window.API.get('/public-config/').then(setCfg).catch(() => {});
  }, []);

  const finish = (user) => {
    window.API.saveUser(user);
    onSuccess?.();
  };

  const handleGoogle = async () => {
    if (!cfg?.google_client_id) return window.showToast('Google login is not configured', 'warn');
    setLoading('Google');
    try {
      await _loadGIS();
      const accessToken = await new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: cfg.google_client_id,
          scope: 'openid email profile',
          callback: (r) => r.error ? reject(new Error(r.error)) : resolve(r.access_token),
          error_callback: (e) => reject(new Error(e?.message || 'Google auth failed')),
        });
        client.requestAccessToken({ prompt: 'select_account' });
      });
      const user = await window.API.post('/auth/google/', { access_token: accessToken });
      finish(user);
    } catch (err) {
      if (err.message !== 'Login cancelled') window.showToast(err.message || 'Google login failed', 'error');
    } finally { setLoading(''); }
  };

  const handleDiscord = async () => {
    if (!cfg?.discord_client_id) return window.showToast('Discord login is not configured', 'warn');
    setLoading('Discord');
    const redirectUri = `${location.origin}/social-callback.html`;
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${cfg.discord_client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20email`;
    try {
      const code = await _openPopup(authUrl, 'discord-oauth');
      const user = await window.API.post('/auth/discord/', { code, redirect_uri: redirectUri });
      finish(user);
    } catch (err) {
      if (err.message !== 'Login cancelled') window.showToast(err.message || 'Discord login failed', 'error');
    } finally { setLoading(''); }
  };

  const handleEmail = () => {
    const input = document.querySelector('input[autocomplete="username"], input[autocomplete="email"]');
    input?.focus();
  };

  // Social/email sign-in temporarily disabled — flip DISABLED to false to re-enable.
  const DISABLED = true;
  const buttons = [
    { name: 'Google',  icon: <GoogleSvg />,  onClick: handleGoogle  },
    { name: 'Discord', icon: <DiscordSvg />, onClick: handleDiscord },
    { name: 'Email',   icon: <MailSvg />,    onClick: handleEmail   },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 18px', color: 'var(--text-faint)', fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ whiteSpace: 'nowrap', textTransform: 'lowercase', letterSpacing: '0.02em' }}>{dividerLabel}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {buttons.map(({ name, icon, onClick }) => (
          <Tooltip key={name} label={DISABLED ? 'Coming soon' : `Continue with ${name}`}>
            <button
              type="button"
              className="social-sq"
              onClick={DISABLED ? undefined : onClick}
              disabled={DISABLED || !!loading}
              aria-label={DISABLED ? `${name} sign-in coming soon` : `Continue with ${name}`}
              style={loading === name ? { opacity: 0.6 } : undefined}
            >
              {loading === name
                ? <div style={{ width: 18, height: 18, border: '2px solid var(--border)', borderTopColor: 'var(--text-muted)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : icon}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

function FormStyles() {
  return (
    <style>{`
      .form-error {
        background: oklch(95% 0.04 25); color: oklch(35% 0.16 25);
        font-size: 13px; padding: 10px 14px;
        border-radius: var(--r-md); margin-bottom: 16px;
      }
      [data-theme="dark"] .form-error {
        background: oklch(25% 0.06 25); color: oklch(80% 0.10 25);
      }

      .social-sq {
        width: 48px; height: 48px;
        border-radius: 12px;
        background: var(--surface);
        border: 1px solid var(--border);
        display: grid; place-items: center;
        cursor: pointer;
        color: var(--text-muted);
        transition: background 140ms var(--ease), border-color 140ms var(--ease), transform 100ms var(--ease), box-shadow 140ms var(--ease);
      }
      .social-sq:hover {
        background: var(--bg-2);
        border-color: var(--border-strong);
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
      }
      .social-sq:active {
        transform: translateY(0);
        box-shadow: none;
      }
      .social-sq:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .social-sq:disabled:hover {
        background: var(--surface);
        border-color: var(--border);
        transform: none;
        box-shadow: none;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  );
}

// Decorative right panel: a stack of glassy quiz cards
function AuthVisual() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '-20%', right: '-20%',
        width: '90%', aspectRatio: '1',
        background: 'radial-gradient(circle at 30% 30%, oklch(85% 0.18 130 / 0.4), transparent 60%)',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-30%', left: '-10%',
        width: '70%', aspectRatio: '1',
        background: 'radial-gradient(circle, oklch(70% 0.18 290 / 0.18), transparent 60%)',
        filter: 'blur(60px)',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ position: 'relative', width: 360, height: 480 }}>
          <FloatingCard rotate={-6} offset={[-30, -16]}>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Question 2 / 8</div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: '12px 0 20px', lineHeight: 1.2 }}>
              Which planet has the most moons?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['Jupiter', 'Saturn', 'Neptune', 'Uranus'].map((o, i) => (
                <div key={o} style={{
                  padding: '10px 12px', borderRadius: 8,
                  background: i === 1 ? 'var(--accent)' : 'var(--bg-2)',
                  color: i === 1 ? 'var(--accent-fg)' : 'var(--text)',
                  fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 8,
                  border: '1px solid ' + (i === 1 ? 'transparent' : 'var(--border)'),
                }}>
                  <span className="mono" style={{ fontSize: 10, opacity: 0.7 }}>{String.fromCharCode(65 + i)}</span>
                  {o}
                </div>
              ))}
            </div>
          </FloatingCard>

          <FloatingCard rotate={4} offset={[40, 100]} compact>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 999,
                background: 'oklch(55% 0.18 145)', color: 'white',
                display: 'grid', placeItems: 'center',
              }}><Icon name="check" size={20} strokeWidth={2.5} /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>+5 credits earned</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Streak: 4 in a row</div>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard rotate={-2} offset={[-50, 200]} compact>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Live session</div>
            <div className="mono" style={{ fontSize: 36, fontWeight: 700, letterSpacing: '0.05em', margin: '4px 0' }}>K4P2X9</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>14 players waiting</div>
          </FloatingCard>
        </div>
      </div>
    </div>
  );
}

function FloatingCard({ children, rotate = 0, offset = [0, 0], compact }) {
  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 0,
      transform: `translate(${offset[0]}px, ${offset[1]}px) rotate(${rotate}deg)`,
      width: compact ? 240 : 300,
      padding: compact ? '16px 18px' : '22px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-lg)',
      backdropFilter: 'blur(20px)',
    }}>{children}</div>
  );
}

function ForgotPasswordForm({ onBack }) {
  window.useLang();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError(t('auth.err_email'));
    setSubmitting(true);
    try {
      await window.API.post('/auth/forgot-password/', { email });
      setSent(true);
    } catch (err) {
      setSent(true); // intentionally show success to avoid email enumeration
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', paddingTop: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: 'oklch(90% 0.10 145)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <Icon name="check" size={24} style={{ color: 'oklch(45% 0.18 145)' }} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 10 }}>
          {t('auth.forgot_sent')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 32 }}>
          {t('auth.forgot_sent_sub')}
        </p>
        <a onClick={onBack} style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {t('auth.forgot_back')}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="fade-in">
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
        {t('auth.forgot_title')}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.5 }}>
        {t('auth.forgot_sub')}
      </p>

      <FormField label={t('auth.email')}>
        <input
          autoFocus
          className="input input--lg"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </FormField>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="btn btn--primary btn--lg" disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
        {submitting ? t('auth.forgot_sending') : t('auth.forgot_send')}
      </button>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <a onClick={onBack} style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {t('auth.forgot_back')}
        </a>
      </div>
    </form>
  );
}

function ResetPasswordForm({ token }) {
  window.useLang();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError(t('auth.reset_short'));
    if (password !== confirm) return setError(t('auth.reset_mismatch'));
    setSubmitting(true);
    try {
      await window.API.post('/auth/reset-password/', { token, new_password: password });
      setDone(true);
    } catch (err) {
      setError(err.message || t('auth.reset_bad_token'));
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', paddingTop: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 999, background: 'oklch(90% 0.10 145)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <Icon name="check" size={24} style={{ color: 'oklch(45% 0.18 145)' }} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 10 }}>
          {t('auth.reset_title')}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 32 }}>
          {t('auth.reset_ok')}
        </p>
        <a href="/auth.html" className="btn btn--primary btn--lg" style={{ display: 'inline-block' }}>
          {t('auth.sign_in')}
        </a>
        <FormStyles />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="fade-in">
      <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
        {t('auth.reset_title')}
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
        {t('auth.reset_sub')}
      </p>

      <FormField label={t('auth.reset_new_pw')}>
        <input
          autoFocus
          className="input input--lg"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
        {password && <PasswordStrength strength={passwordStrength(password)} />}
      </FormField>

      <FormField label={t('auth.reset_confirm_pw')}>
        <input
          className="input input--lg"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </FormField>

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="btn btn--primary btn--lg" disabled={submitting} style={{ width: '100%', marginTop: 8 }}>
        {submitting ? t('auth.reset_saving') : t('auth.reset_save')}
      </button>
      <FormStyles />
    </form>
  );
}

window.Auth = Auth;
window.ResetPasswordForm = ResetPasswordForm;
