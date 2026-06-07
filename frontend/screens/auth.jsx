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

      <SocialLoginButtons dividerLabel="or continue with" />

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

      <SocialLoginButtons dividerLabel="or sign up with" />
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

function InstagramSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="ig-g" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#f09433"/>
          <stop offset="33%"  stopColor="#e6683c"/>
          <stop offset="55%"  stopColor="#dc2743"/>
          <stop offset="77%"  stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <path fill="url(#ig-g)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
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

// ── Social login row ──────────────────────────────────────────────────────────
function SocialLoginButtons({ dividerLabel = 'or continue with' }) {
  const notify = (name) => window.showToast(`${name} login coming soon`, 'info');
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 18px', color: 'var(--text-faint)', fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ whiteSpace: 'nowrap', textTransform: 'lowercase', letterSpacing: '0.02em' }}>{dividerLabel}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {[
          { name: 'Google',    icon: <GoogleSvg /> },
          { name: 'Instagram', icon: <InstagramSvg /> },
          { name: 'Email',     icon: <MailSvg /> },
        ].map(({ name, icon }) => (
          <Tooltip key={name} label={`Continue with ${name}`}>
            <button
              type="button"
              className="social-sq"
              onClick={() => notify(name)}
              aria-label={`Continue with ${name}`}
            >
              {icon}
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
