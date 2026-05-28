// === Auth — Login + Register ===
function Auth({ mode: initialMode = 'login', onSuccess, onSwitch }) {
  const [mode, setMode] = useState(initialMode);
  return (
    <div className="auth-page" data-screen-label={mode === 'login' ? '00 Login' : '00 Register'}>
      <div className="auth-left">
        <div className="auth-brand">
          <NQLogo size={32} />
          <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>Nova<span style={{ color: 'var(--accent)' }}>Quiz</span></span>
        </div>
        <div className="auth-card">
          {mode === 'login'
            ? <LoginForm onSuccess={onSuccess} onSwitch={() => setMode('register')} />
            : <RegisterForm onSuccess={onSuccess} onSwitch={() => setMode('login')} />}
        </div>
        <SiteFooter variant="compact" />
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

function LoginForm({ onSuccess, onSwitch }) {
  window.useLang();
  const [username, setUsername] = useState('alex');
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
        <a onClick={() => {}} style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>{t('auth.forgot')}</a>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0', color: 'var(--text-faint)', fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        OR
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <button type="button" className="btn btn--secondary btn--lg" style={{ width: '100%' }}>
        {t('auth.guest')}
      </button>

      <FormStyles />
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
      <FormStyles />
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

window.Auth = Auth;
