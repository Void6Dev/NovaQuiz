// === Settings ===

const PREFS_KEY = 'quiz:prefs';
function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; } }
function savePrefs(p) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {} }

function Settings({ theme, onTheme, onLogout }) {
  window.useLang(); // re-render on language change

  const [section, setSection] = useState('profile');
  const sections = [
    { id: 'profile',       label: t('settings.profile'),       icon: 'user'     },
    { id: 'appearance',    label: t('settings.appearance'),    icon: 'sun'      },
    { id: 'language',      label: t('settings.language'),      icon: 'globe'    },
    { id: 'notifications', label: t('settings.notifications'), icon: 'bell'     },
    { id: 'workspace',     label: t('settings.workspace'),     icon: 'users'    },
    { id: 'billing',       label: t('settings.billing'),       icon: 'star'     },
  ];

  return (
    <div className="page fade-in" data-screen-label="07 Settings" style={{ maxWidth: 1100 }}>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 32 }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sections.map(s => (
            <a
              key={s.id}
              className={`nav-item ${section === s.id ? 'nav-item--active' : ''}`}
              onClick={() => setSection(s.id)}
              style={{ cursor: 'pointer' }}
            >
              <Icon name={s.icon} size={16} /> <span>{s.label}</span>
            </a>
          ))}
        </nav>

        <div>
          {section === 'profile'       && <ProfileSettings onLogout={onLogout} />}
          {section === 'appearance'    && <AppearanceSettings theme={theme} onTheme={onTheme} />}
          {section === 'language'      && <LanguageSettings />}
          {section === 'notifications' && <NotificationSettings />}
          {section === 'workspace'     && <WorkspaceSettings />}
          {section === 'billing'       && <BillingSettings />}
        </div>
      </div>
    </div>
  );
}

// ─── Layout helpers ──────────────────────────────────────────────────────────

function SettingsSection({ title, subtitle, children }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: subtitle ? 4 : 14 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>{subtitle}</p>}
      {children}
    </section>
  );
}

function SettingsRow({ label, hint, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 24 }}>{children}</div>
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </label>
        {hint && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SaveBar({ saving, message, isError, onSave, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
      <button className="btn btn--primary" onClick={onSave} disabled={saving || disabled}>
        {saving ? t('profile.saving') : t('profile.save')}
      </button>
      {message && (
        <span style={{ fontSize: 13, color: isError ? 'var(--danger)' : 'oklch(50% 0.16 145)', display: 'flex', alignItems: 'center', gap: 4 }}>
          {!isError && <Icon name="check" size={13} />}
          {message}
        </span>
      )}
    </div>
  );
}

// ─── Profile ─────────────────────────────────────────────────────────────────

function ProfileSettings({ onLogout }) {
  const u = window.CURRENT_USER;

  const [name, setName]               = useState(u.name || u.username || '');
  const [email, setEmail]             = useState(u.email || '');
  const [description, setDescription] = useState(u.description || '');
  const [birthday, setBirthday]       = useState(u.birthday || '');
  const [avatar, setAvatar]           = useState(u.avatar || null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');
  const [saveErr, setSaveErr]   = useState(false);

  const [oldPass, setOldPass]         = useState('');
  const [newPass, setNewPass]         = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSaving, setPassSaving]   = useState(false);
  const [passMsg, setPassMsg]         = useState('');
  const [passErr, setPassErr]         = useState(false);

  const [showDelete, setShowDelete]   = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const avatarInputRef = useRef();

  useEffect(() => {
    window.API.get('/auth/me/')
      .then(data => {
        setName(data.name || data.username || '');
        setEmail(data.email || '');
        setDescription(data.description || '');
        setBirthday(data.birthday || '');
        setAvatar(data.avatar || null);
        window.API.saveUser({ ...u, ...data });
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true); setSaveMsg(''); setSaveErr(false);
    try {
      const updated = await window.API.post('/auth/profile/', { name, email, description, birthday });
      window.API.saveUser({ ...window.CURRENT_USER, ...updated });
      setSaveMsg(t('profile.saved'));
      setTimeout(() => setSaveMsg(''), 4000);
    } catch (e) {
      setSaveMsg(e.message || 'Failed to save.');
      setSaveErr(true);
    }
    setSaving(false);
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) { setPassMsg('Passwords do not match.'); setPassErr(true); return; }
    if (newPass.length < 6)      { setPassMsg('Password must be at least 6 characters.'); setPassErr(true); return; }
    setPassSaving(true); setPassMsg(''); setPassErr(false);
    try {
      await window.API.post('/auth/change-password/', { old_password: oldPass, new_password: newPass });
      setPassMsg(t('profile.updated'));
      setOldPass(''); setNewPass(''); setConfirmPass('');
      setTimeout(() => setPassMsg(''), 4000);
    } catch (e) {
      setPassMsg(e.message || 'Failed to change password.');
      setPassErr(true);
    }
    setPassSaving(false);
  };

  const uploadAvatar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); return; }
    if (f.size > 5 * 1024 * 1024)    { showToast('Image must be under 5 MB.', 'error'); return; }
    const fd = new FormData();
    fd.append('avatar', f);
    window.API.upload('/auth/avatar/', fd)
      .then(data => {
        setAvatar(data.avatar);
        window.API.saveUser({ ...window.CURRENT_USER, avatar: data.avatar });
        showToast('Avatar updated', 'success');
      })
      .catch(err => showToast(err.message, 'error'));
    e.target.value = '';
  };

  const deleteAccount = async () => {
    try {
      await window.API.post('/auth/delete/');
      window.API.clearUser();
      window.navigate('landing');
    } catch (e) {
      showToast(e.message || 'Failed to delete account.', 'error');
    }
  };

  const initials = (name || u.username || '?')
    .split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (loadingProfile) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
  }

  return (
    <>
      {/* ── Account card ── */}
      <SettingsSection title={t('profile.account')}>
        <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20, marginBottom: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatar
              ? <img src={avatar} alt="" style={{ width: 68, height: 68, borderRadius: 999, objectFit: 'cover', border: '2px solid var(--border)' }} />
              : <div className="avatar" style={{ width: 68, height: 68, fontSize: 22, borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{initials}</div>
            }
            <button
              onClick={() => avatarInputRef.current?.click()}
              title="Change avatar"
              style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 22, height: 22, borderRadius: 999,
                background: 'var(--text)', color: 'var(--bg)',
                display: 'grid', placeItems: 'center',
                border: '2px solid var(--bg)', cursor: 'pointer',
              }}
            >
              <Icon name="edit" size={10} strokeWidth={2.5} />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>{name || u.username}</div>
              {(window.CURRENT_USER.permission === 'moderator') && (
                <span className="pill" style={{ background: 'oklch(80% 0.14 220)', color: 'oklch(25% 0.06 220)', borderColor: 'transparent', fontWeight: 700, fontSize: 10 }}>
                  {t('profile.moderator')}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              <span className="mono">@{u.username}</span>
              {email && <> · {email}</>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13 }}>
              <Icon name="star" size={13} style={{ color: 'var(--accent-strong)' }} />
              <span className="mono" style={{ fontWeight: 600 }}>{(window.CURRENT_USER.credits || 0).toLocaleString()}</span>
              <span style={{ color: 'var(--text-muted)' }}>{t('profile.credits')}</span>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ── Edit profile ── */}
      <SettingsSection title={t('profile.edit')} subtitle={t('profile.edit_subtitle')}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label={t('profile.display_name')}>
              <input
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
              />
            </FormField>
            <FormField label={t('profile.username')} hint={t('profile.username_hint')}>
              <input
                className="input"
                value={u.username}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </FormField>
          </div>

          <FormField label={t('profile.email')}>
            <input
              className="input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </FormField>

          <FormField label={t('profile.bio')} hint={t('profile.bio_hint')}>
            <textarea
              className="input"
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 160))}
              rows={3}
              placeholder="Tell people a bit about yourself…"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, textAlign: 'right' }}>
              {description.length} / 160
            </div>
          </FormField>

          <FormField label={t('profile.dob')} hint={t('profile.dob_hint')}>
            <input
              className="input"
              type="date"
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
              style={{ maxWidth: 220 }}
            />
          </FormField>

          <SaveBar saving={saving} message={saveMsg} isError={saveErr} onSave={saveProfile} />
        </div>
      </SettingsSection>

      {/* ── Change password ── */}
      <SettingsSection title={t('profile.password')} subtitle={t('profile.password_subtitle')}>
        <form className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={changePassword}>
          <FormField label={t('profile.current_password')}>
            <input
              className="input"
              type="password"
              value={oldPass}
              onChange={e => setOldPass(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter current password"
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label={t('profile.new_password')} hint={t('profile.new_password_hint')}>
              <input
                className="input"
                type="password"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                autoComplete="new-password"
                placeholder="New password"
              />
            </FormField>
            <FormField label={t('profile.confirm_password')}>
              <input
                className="input"
                type="password"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                autoComplete="new-password"
                placeholder="Repeat new password"
              />
            </FormField>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn--secondary"
              type="submit"
              disabled={passSaving || !oldPass || !newPass || !confirmPass}
            >
              {passSaving ? t('profile.updating') : t('profile.change_password')}
            </button>
            {passMsg && (
              <span style={{ fontSize: 13, color: passErr ? 'var(--danger)' : 'oklch(50% 0.16 145)', display: 'flex', alignItems: 'center', gap: 4 }}>
                {!passErr && <Icon name="check" size={13} />}
                {passMsg}
              </span>
            )}
          </div>
        </form>
      </SettingsSection>

      {/* ── Danger zone ── */}
      <SettingsSection title={t('profile.danger')}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: 'oklch(60% 0.18 25 / 0.35)' }}>
          <SettingsRow label={t('profile.signout')} hint={t('profile.signout_hint')}>
            <button className="btn btn--secondary" onClick={onLogout}>
              <Icon name="logout" size={14} /> {t('profile.signout')}
            </button>
          </SettingsRow>
          <SettingsRow label={t('profile.delete')} hint={t('profile.delete_hint')}>
            <button
              className="btn btn--secondary"
              style={{ color: 'var(--danger)', borderColor: 'oklch(60% 0.18 25 / 0.4)' }}
              onClick={() => setShowDelete(true)}
            >
              <Icon name="trash" size={14} /> {t('profile.delete')}
            </button>
          </SettingsRow>
        </div>
      </SettingsSection>

      {/* ── Delete modal ── */}
      {showDelete && (
        <Modal width={440} onClose={() => { setShowDelete(false); setDeleteInput(''); }}>
          <div style={{ padding: 28 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'oklch(95% 0.04 25)', color: 'oklch(40% 0.16 25)',
              display: 'grid', placeItems: 'center', marginBottom: 18,
            }}>
              <Icon name="trash" size={20} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Delete your account?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 16 }}>
              This will permanently delete your account, all your quizzes, and every session record.
              There is <strong>no undo</strong>. To confirm, type your username below.
            </p>
            <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 13 }}>
              <span className="mono" style={{ color: 'var(--text-muted)' }}>Username: </span>
              <span className="mono" style={{ fontWeight: 600 }}>{u.username}</span>
            </div>
            <input
              className="input"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder={u.username}
              style={{ marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn--secondary" onClick={() => { setShowDelete(false); setDeleteInput(''); }}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: deleteInput === u.username ? 'oklch(55% 0.22 25)' : 'var(--surface)', color: deleteInput === u.username ? 'white' : 'var(--text-muted)', transition: 'all 200ms' }}
                disabled={deleteInput !== u.username}
                onClick={deleteAccount}
              >
                <Icon name="trash" size={14} /> Delete my account
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearanceSettings({ theme, onTheme }) {
  const [prefs, setPrefs] = useState(loadPrefs);

  const setPref = (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    savePrefs(next);
    if (key === 'reduceMotion')   document.documentElement.classList.toggle('reduce-motion', !!val);
    if (key === 'compactDensity') document.documentElement.classList.toggle('compact', !!val);
  };

  const modes = [
    { mode: 'light',  label: t('appearance.light')  },
    { mode: 'dark',   label: t('appearance.dark')   },
    { mode: 'system', label: t('appearance.system') },
  ];

  return (
    <>
      <SettingsSection title={t('appearance.theme')} subtitle={t('appearance.theme_subtitle')}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {modes.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => { onTheme(mode); setPref('theme', mode); }}
              style={{
                padding: 0, background: 'transparent', cursor: 'pointer',
                border: '2px solid ' + (theme === mode ? 'var(--text)' : 'var(--border)'),
                borderRadius: 'var(--r-lg)', overflow: 'hidden',
                transition: 'border-color 200ms var(--ease)',
              }}
            >
              <div style={{ aspectRatio: '4/3', position: 'relative' }}>
                {mode === 'system' ? (
                  <div style={{ display: 'flex', height: '100%' }}>
                    <div style={{ flex: 1 }}><ThemePreview dark={false} /></div>
                    <div style={{ flex: 1 }}><ThemePreview dark={true} /></div>
                  </div>
                ) : (
                  <ThemePreview dark={mode === 'dark'} />
                )}
              </div>
              <div style={{
                padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderTop: '1px solid var(--border)', background: 'var(--surface)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                <span style={{
                  width: 16, height: 16, borderRadius: 99,
                  border: '2px solid ' + (theme === mode ? 'var(--text)' : 'var(--border-strong)'),
                  background: theme === mode ? 'var(--text)' : 'transparent',
                  display: 'grid', placeItems: 'center',
                }}>
                  {theme === mode && <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--bg)' }} />}
                </span>
              </div>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title={t('appearance.display')}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SettingsRow label={t('appearance.reduce_motion')} hint={t('appearance.reduce_motion_hint')}>
            <Toggle on={!!prefs.reduceMotion} onChange={v => setPref('reduceMotion', v)} />
          </SettingsRow>
          <SettingsRow label={t('appearance.compact')} hint={t('appearance.compact_hint')}>
            <Toggle on={!!prefs.compactDensity} onChange={v => setPref('compactDensity', v)} />
          </SettingsRow>
          <SettingsRow label={t('appearance.shortcuts')} hint={t('appearance.shortcuts_hint')}>
            <Toggle on={prefs.showShortcuts !== false} onChange={v => setPref('showShortcuts', v)} />
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection title={t('appearance.player')} subtitle={t('appearance.player_subtitle')}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SettingsRow label={t('appearance.sound')} hint={t('appearance.sound_hint')}>
            <Toggle on={prefs.soundEffects !== false} onChange={v => setPref('soundEffects', v)} />
          </SettingsRow>
          <SettingsRow label={t('appearance.confetti')} hint={t('appearance.confetti_hint')}>
            <Toggle on={prefs.confetti !== false} onChange={v => setPref('confetti', v)} />
          </SettingsRow>
        </div>
      </SettingsSection>
    </>
  );
}

function ThemePreview({ dark }) {
  const bg      = dark ? 'oklch(13% 0.006 270)' : 'oklch(98% 0.003 90)';
  const surface = dark ? 'oklch(17% 0.006 270)' : 'oklch(100% 0 0)';
  const border  = dark ? 'oklch(24% 0.008 270)' : 'oklch(92% 0.004 90)';
  const text    = dark ? 'oklch(97% 0.003 90)'  : 'oklch(15% 0.005 270)';
  const muted   = dark ? 'oklch(60% 0.006 270)' : 'oklch(70% 0.005 270)';
  return (
    <div style={{ width: '100%', height: '100%', background: bg, padding: 10, gap: 6, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 10, background: surface, border: `1px solid ${border}`, borderRadius: 3, display: 'flex', alignItems: 'center', padding: '0 4px', gap: 3 }}>
        <span style={{ width: 4, height: 4, borderRadius: 99, background: muted }} />
        <span style={{ width: 18, height: 3, background: muted, borderRadius: 1 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 6 }}>
        <div style={{ width: '24%', background: surface, border: `1px solid ${border}`, borderRadius: 3, padding: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 4, background: i === 1 ? text : muted, opacity: i === 1 ? 1 : 0.4, borderRadius: 1 }} />
          ))}
        </div>
        <div style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 3, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ height: 4, width: '60%', background: text, borderRadius: 1 }} />
          <div style={{ height: 3, width: '85%', background: muted, opacity: 0.4, borderRadius: 1 }} />
          <div style={{ height: 3, width: '70%', background: muted, opacity: 0.4, borderRadius: 1 }} />
          <div style={{ marginTop: 'auto', height: 6, width: 16, background: 'oklch(85% 0.18 130)', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

// ─── Language ─────────────────────────────────────────────────────────────────

function LanguageSettings() {
  const currentLang = window.useLang(); // subscribe + get current lang

  return (
    <SettingsSection title={t('language.title')} subtitle={t('language.subtitle')}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {(window.SUPPORTED_LANGS || []).map(({ code, nativeLabel, flag }) => {
          const active = currentLang === code;
          return (
            <button
              key={code}
              onClick={() => window.setLang(code)}
              style={{
                padding: '28px 16px 20px',
                background: active ? 'oklch(from var(--accent) l c h / 0.08)' : 'var(--surface)',
                cursor: 'pointer',
                border: '2px solid ' + (active ? 'var(--accent-strong)' : 'var(--border)'),
                borderRadius: 'var(--r-lg)',
                transition: 'border-color 200ms var(--ease), background 200ms var(--ease)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}
            >
              <span style={{ fontSize: 36, lineHeight: 1 }}>{flag}</span>
              <span style={{
                fontSize: 15, fontWeight: active ? 700 : 500,
                color: active ? 'var(--text)' : 'var(--text-muted)',
                transition: 'color 150ms',
              }}>{nativeLabel}</span>
              <span style={{
                width: 6, height: 6, borderRadius: 99,
                background: active ? 'var(--accent-strong)' : 'transparent',
                border: '1.5px solid ' + (active ? 'var(--accent-strong)' : 'var(--border-strong)'),
                transition: 'all 150ms',
              }} />
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationSettings() {
  const [prefs, setPrefs] = useState(loadPrefs);
  const setPref = (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    savePrefs(next);
  };
  return (
    <>
      <SettingsSection title="Email notifications" subtitle="Control what gets sent to your inbox. Changes are saved automatically.">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SettingsRow label="Player joins your session" hint="Real-time alert when someone enters your lobby">
            <Toggle on={!!prefs.notifyJoin} onChange={v => setPref('notifyJoin', v)} />
          </SettingsRow>
          <SettingsRow label="Weekly analytics digest" hint="Summary of your quiz performance every Monday">
            <Toggle on={prefs.notifyDigest !== false} onChange={v => setPref('notifyDigest', v)} />
          </SettingsRow>
          <SettingsRow label="Quiz shared with you" hint="Someone added you as a collaborator">
            <Toggle on={!!prefs.notifyShare} onChange={v => setPref('notifyShare', v)} />
          </SettingsRow>
          <SettingsRow label="Product updates & tips" hint="New features and best practices from the team">
            <Toggle on={!!prefs.notifyMarketing} onChange={v => setPref('notifyMarketing', v)} />
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection title="In-app notifications">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SettingsRow label="Session activity" hint="Players joining, leaving, or answering">
            <Toggle on={prefs.inAppSession !== false} onChange={v => setPref('inAppSession', v)} />
          </SettingsRow>
          <SettingsRow label="Score milestones" hint="When a player reaches a new high score">
            <Toggle on={!!prefs.inAppMilestone} onChange={v => setPref('inAppMilestone', v)} />
          </SettingsRow>
        </div>
      </SettingsSection>
    </>
  );
}

// ─── Workspace ────────────────────────────────────────────────────────────────

function WorkspaceSettings() {
  const u = window.CURRENT_USER;
  const [prefs, setPrefs] = useState(loadPrefs);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);

  const setPref = (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    savePrefs(next);
  };

  useEffect(() => {
    Promise.all([
      window.API.get('/workspace/invitations/sent/').catch(() => ({ sent: [] })),
      window.API.get('/workspace/invitations/received/').catch(() => ({ received: [] })),
    ]).then(([s, r]) => {
      setSent(s.sent || []);
      setReceived(r.received || []);
    }).finally(() => setLoadingInvites(false));
  }, []);

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg('');
    try {
      await window.API.post('/workspace/invite/', { email: inviteEmail });
      setInviteMsg('✓ Invite sent');
      setInviteEmail('');
      setSent(prev => [...prev, { to_email: inviteEmail, status: 'pending', created_at: new Date().toISOString() }]);
      setTimeout(() => setInviteMsg(''), 3000);
    } catch (e) {
      setInviteMsg(e.message || 'Failed to send invite.');
    }
    setInviting(false);
  };

  const cancelInvite = (invId) => {
    if (!confirm('Cancel this invitation?')) return;
    window.API.post(`/workspace/invitations/${invId}/cancel/`, {})
      .then(() => setSent(prev => prev.filter(i => i.id !== invId)))
      .catch(e => showToast(e.message, 'error'));
  };

  const acceptInvite = (invId) => {
    window.API.post(`/workspace/invitations/${invId}/accept/`, {})
      .then(() => setReceived(prev => prev.map(i => i.id === invId ? { ...i, status: 'accepted' } : i)))
      .catch(e => showToast(e.message, 'error'));
  };

  const declineInvite = (invId) => {
    window.API.post(`/workspace/invitations/${invId}/decline/`, {})
      .then(() => setReceived(prev => prev.map(i => i.id === invId ? { ...i, status: 'declined' } : i)))
      .catch(e => showToast(e.message, 'error'));
  };

  return (
    <>
      <SettingsSection title="Your workspace" subtitle="Nova Quiz workspaces let teams share quizzes and manage sessions together.">
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
          <SettingsRow label={u.name || u.username} hint={`@${u.username} · ${u.email || 'no email set'}`}>
            <span className="pill" style={{ background: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'transparent', fontWeight: 700 }}>Owner</span>
          </SettingsRow>
        </div>

        <div className="card" style={{ padding: 24, borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icon name="users" size={18} style={{ color: 'var(--text-faint)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Invite team members</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Add colleagues to collaborate on quizzes, share quizzes, and view shared analytics.
            </div>
          </div>
          <button
            className="btn btn--secondary"
            onClick={() => {
              const form = document.querySelector('[data-invite-form]');
              if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
            }}
          >
            <Icon name="plus" size={14} /> Invite
          </button>
        </div>

        <form
          data-invite-form
          onSubmit={sendInvite}
          style={{
            display: 'none', marginTop: 16, padding: 20, background: 'var(--bg-2)',
            borderRadius: 'var(--r-lg)', border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="input"
              type="email"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn--primary"
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
          {inviteMsg && (
            <div style={{ fontSize: 12, color: inviteMsg.startsWith('✓') ? 'oklch(50% 0.16 145)' : 'var(--danger)' }}>
              {inviteMsg}
            </div>
          )}
        </form>

        {!loadingInvites && sent.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Sent invitations ({sent.length})
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {sent.map((inv, i) => (
                <div key={inv.id || i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderBottom: i < sent.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 13 }}>{inv.to_email}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                      Sent {new Date(inv.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="pill" style={{
                      background: inv.status === 'pending' ? 'oklch(85% 0.12 75)' : 'oklch(85% 0.10 145)',
                      color: inv.status === 'pending' ? 'oklch(35% 0.10 60)' : 'oklch(30% 0.10 145)',
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {inv.status}
                    </span>
                    {inv.status === 'pending' && (
                      <button
                        className="btn btn--ghost btn--icon"
                        onClick={() => cancelInvite(inv.id)}
                        title="Cancel invitation"
                        style={{ padding: 4 }}
                      >
                        <Icon name="x" size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loadingInvites && received.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Incoming invitations ({received.filter(i => i.status === 'pending').length})
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {received.map((inv, i) => (
                <div key={inv.id || i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderBottom: i < received.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 13 }}>From <strong>{inv.from_name || inv.from_user}</strong></div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                      @{inv.from_user} · {new Date(inv.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {inv.status === 'pending' ? (
                      <>
                        <button
                          className="btn btn--primary"
                          onClick={() => acceptInvite(inv.id)}
                          style={{ padding: '5px 12px', fontSize: 12 }}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn--ghost"
                          onClick={() => declineInvite(inv.id)}
                          style={{ padding: '5px 12px', fontSize: 12 }}
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <span className="pill" style={{
                        background: inv.status === 'accepted' ? 'oklch(85% 0.10 145)' : 'oklch(90% 0.04 0)',
                        color: inv.status === 'accepted' ? 'oklch(30% 0.10 145)' : 'oklch(40% 0.04 0)',
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {inv.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Workspace defaults" subtitle="Applied when creating new quizzes and sessions.">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SettingsRow label="Default quiz visibility" hint="Who can see newly created quizzes">
            <select
              className="input"
              value={prefs.defaultVisibility || 'public'}
              onChange={e => setPref('defaultVisibility', e.target.value)}
              style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
            >
              <option value="private">Private (only you)</option>
              <option value="team">Team (shared members)</option>
              <option value="public">Public (anyone)</option>
            </select>
          </SettingsRow>
          <SettingsRow label="Default time per question" hint="Applied when creating a new live session">
            <select
              className="input"
              value={prefs.defaultTimePerQuestion || '30'}
              onChange={e => setPref('defaultTimePerQuestion', e.target.value)}
              style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
            >
              <option value="20">20 seconds</option>
              <option value="30">30 seconds</option>
              <option value="45">45 seconds</option>
              <option value="60">60 seconds</option>
            </select>
          </SettingsRow>
          <SettingsRow label="Default max players" hint="How many players can join your live sessions">
            <select
              className="input"
              value={prefs.defaultMaxPlayers || '50'}
              onChange={e => setPref('defaultMaxPlayers', e.target.value)}
              style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
            >
              <option value="20">20 players</option>
              <option value="30">30 players</option>
              <option value="50">50 players</option>
              <option value="100">100 players</option>
            </select>
          </SettingsRow>
        </div>
      </SettingsSection>
    </>
  );
}

// ─── Billing ──────────────────────────────────────────────────────────────────

function BillingSettings() {
  const u = window.CURRENT_USER;
  const credits = u.credits || 0;

  const features = [
    { icon: 'plus', label: 'Unlimited quizzes', enabled: true },
    { icon: 'users', label: 'Up to 50 players per session', enabled: true },
    { icon: 'bar-chart-2', label: 'Full analytics & reports', enabled: true },
    { icon: 'check-square', label: 'All question types', enabled: true },
    { icon: 'share-2', label: 'Share & duplicate quizzes', enabled: true },
    { icon: 'play-circle', label: 'Live sessions with scoring', enabled: true },
    { icon: 'lock', label: 'Team collaboration', enabled: false },
    { icon: 'trending-up', label: 'Advanced insights & predictions', enabled: false },
  ];

  return (
    <>
      <SettingsSection title="Credits balance">
        <div className="card" style={{ padding: 24, position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: 999, background: 'oklch(85% 0.18 130 / 0.12)', filter: 'blur(30px)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, position: 'relative' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent)', color: 'var(--accent-fg)', display: 'grid', placeItems: 'center' }}>
              <Icon name="star" size={16} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your credits</span>
          </div>
          <div className="mono" style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, position: 'relative' }}>
            {credits.toLocaleString()}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, position: 'relative' }}>
            Earned by answering correctly in live sessions.
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <SettingsRow label="+5 credits" hint="For each correct answer in a live session">
            <span className="pill" style={{ background: 'oklch(93% 0.08 145)', color: 'oklch(40% 0.12 145)', border: 0 }}>Per correct</span>
          </SettingsRow>
          <SettingsRow label="+1 credit" hint="If you're the first player to answer correctly">
            <span className="pill" style={{ background: 'oklch(90% 0.10 80)', color: 'oklch(40% 0.12 80)', border: 0 }}>Speed bonus</span>
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection title="Plan & features">
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
            <div>
              <span className="pill" style={{ background: 'var(--text)', color: 'var(--bg)', borderColor: 'transparent', fontWeight: 700 }}>Personal</span>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 12, marginBottom: 4 }}>Free</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Everything you need to create and host quizzes.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  opacity: f.enabled ? 1 : 0.4,
                }}
              >
                <Icon
                  name={f.icon}
                  size={16}
                  style={{
                    color: f.enabled ? 'var(--accent-strong)' : 'var(--border-strong)',
                    flexShrink: 0, marginTop: 2,
                  }}
                />
                <span style={{ fontSize: 13, lineHeight: 1.4 }}>
                  {f.label}
                  {!f.enabled && <span style={{ color: 'var(--text-faint)' }}> (Pro)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20, background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon name="star" size={18} style={{ color: 'var(--text-muted)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Pro plan coming soon</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Advanced features for teams and serious quiz creators
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
    </>
  );
}

window.Settings = Settings;
