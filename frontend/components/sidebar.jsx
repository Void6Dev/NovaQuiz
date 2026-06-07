// === Sidebar — left-rail navigation ===
// Used on dashboard, sessions, analytics, settings.
// Navigates between pages via window.navigate(screen).

// ── Notification bell ─────────────────────────────────────────────────────────

function NotifItemQuizDeleted({ notif, onAppealSent }) {
  const [expanded, setExpanded] = useState(false);
  const [appealing, setAppealing] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const { deletion_id, quiz_id, quiz_title, reason } = notif.data;

  const submit = async () => {
    if (!appealText.trim()) return;
    setLoading(true); setErr('');
    try {
      await API.post(`/deletions/${deletion_id}/appeal/`, { text: appealText });
      setAppealing(false);
      onAppealSent(notif.id);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notif-item notif-item--danger">
      <div className="notif-item__icon"><Icon name="trash" size={14} /></div>
      <div className="notif-item__body">
        <div className="notif-item__title">Your quiz was removed</div>
        <button
          className="notif-item__quiz-link"
          onClick={() => quiz_id && window.navigate('quiz', { id: quiz_id })}
          style={{ cursor: quiz_id ? 'pointer' : 'default' }}
        >
          <span className="notif-item__quiz-link__title">&ldquo;{quiz_title}&rdquo;</span>
          {quiz_id && <Icon name="arrowRight" size={11} />}
        </button>
        {!expanded && (
          <button className="notif-item__link" onClick={() => setExpanded(true)}>View reason</button>
        )}
        {expanded && (
          <div className="notif-item__reason">{reason}</div>
        )}
        {expanded && !appealing && !notif.data.__appealed && (
          <button className="notif-item__link" onClick={() => setAppealing(true)}>Submit appeal</button>
        )}
        {expanded && notif.data.__appealed && (
          <span className="notif-item__tag notif-item__tag--warn">Appeal submitted</span>
        )}
        {appealing && (
          <div style={{ marginTop: 8 }}>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 72, fontSize: 12, resize: 'vertical' }}
              placeholder="Explain why this removal was a mistake…"
              value={appealText}
              onChange={e => setAppealText(e.target.value)}
              maxLength={1000}
            />
            {err && <div style={{ fontSize: 11, color: 'var(--danger-text)', marginTop: 4 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button className="btn btn--sm btn--accent" onClick={submit} disabled={loading || !appealText.trim()}>
                {loading ? 'Sending…' : 'Send appeal'}
              </button>
              <button className="btn btn--sm btn--ghost" onClick={() => { setAppealing(false); setErr(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NotifItemAppealReceived({ notif, onClose }) {
  const [actionLoading, setActionLoading] = useState(''); // 'accept' | 'reject' | ''
  const { deletion_id, quiz_id, quiz_title, appeal_text, owner_username } = notif.data;

  const decide = async (action) => {
    setActionLoading(action);
    try {
      await API.post(`/appeals/${deletion_id}/${action}/`);
      onClose(deletion_id);
      window.showToast && window.showToast(action === 'accept' ? 'Appeal accepted — quiz restored' : 'Appeal rejected', action === 'accept' ? 'success' : 'info');
    } catch (e) {
      window.showToast && window.showToast(e.message, 'error');
      setActionLoading('');
    }
  };

  return (
    <div className="notif-item notif-item--warn">
      <div className="notif-item__icon"><Icon name="flag" size={14} /></div>
      <div className="notif-item__body">
        <div className="notif-item__title">Appeal from <strong>@{owner_username}</strong></div>
        <button
          className="notif-item__quiz-link"
          onClick={() => quiz_id && window.navigate('quiz', { id: quiz_id })}
          style={{ cursor: quiz_id ? 'pointer' : 'default' }}
        >
          <span className="notif-item__quiz-link__title">&ldquo;{quiz_title}&rdquo;</span>
          {quiz_id && <Icon name="arrowRight" size={11} />}
        </button>
        <div className="notif-item__reason">{appeal_text}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--sm btn--accent" onClick={() => decide('accept')} disabled={!!actionLoading}>
            {actionLoading === 'accept' ? 'Accepting…' : <><Icon name="check" size={12} /> Accept</>}
          </button>
          <button className="btn btn--sm" style={{ background: 'var(--danger)', color: 'var(--danger-fg)' }} onClick={() => decide('reject')} disabled={!!actionLoading}>
            {actionLoading === 'reject' ? 'Rejecting…' : <><Icon name="x" size={12} /> Reject</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotifItemAppealAccepted({ notif }) {
  const { quiz_title, quiz_id } = notif.data;
  return (
    <div className="notif-item notif-item--success">
      <div className="notif-item__icon"><Icon name="check" size={14} /></div>
      <div className="notif-item__body">
        <div className="notif-item__title">Appeal accepted — quiz restored</div>
        <button
          className="notif-item__quiz-link"
          onClick={() => quiz_id && window.navigate('quiz', { id: quiz_id })}
          style={{ cursor: quiz_id ? 'pointer' : 'default' }}
        >
          <span className="notif-item__quiz-link__title">&ldquo;{quiz_title}&rdquo;</span>
          {quiz_id && <Icon name="arrowRight" size={11} />}
        </button>
      </div>
    </div>
  );
}

function NotifItemAppealRejected({ notif }) {
  const { quiz_title } = notif.data;
  return (
    <div className="notif-item">
      <div className="notif-item__icon"><Icon name="x" size={14} /></div>
      <div className="notif-item__body">
        <div className="notif-item__title">Appeal rejected</div>
        <div className="notif-item__sub">&ldquo;{quiz_title}&rdquo;</div>
      </div>
    </div>
  );
}

function NotificationBell({ compact = false }) {
  const [open, setOpen]       = useState(false);
  const [notifs, setNotifs]   = useState([]);
  const [loaded, setLoaded]   = useState(false);
  const ref = useRef(null);

  const unread = notifs.filter(n => !n.is_read).length;

  const load = async () => {
    try {
      const res = await API.get('/notifications/');
      setNotifs(res.notifications);
    } catch (_) {}
    setLoaded(true);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      // mark all read optimistically, then call API
      setNotifs(ns => ns.map(n => ({ ...n, is_read: true })));
      API.post('/notifications/').catch(() => {});
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleAppealSent = (notifId) => {
    setNotifs(ns => ns.map(n =>
      n.id === notifId ? { ...n, data: { ...n.data, __appealed: true } } : n
    ));
  };

  const handleAppealClosed = (deletionId) => {
    setNotifs(ns => ns.filter(n =>
      !(n.type === 'appeal_received' && n.data.deletion_id === deletionId)
    ));
  };

  const renderItem = (n) => {
    if (n.type === 'quiz_deleted')    return <NotifItemQuizDeleted    key={n.id} notif={n} onAppealSent={handleAppealSent} />;
    if (n.type === 'appeal_received') return <NotifItemAppealReceived key={n.id} notif={n} onClose={handleAppealClosed} />;
    if (n.type === 'appeal_accepted') return <NotifItemAppealAccepted key={n.id} notif={n} />;
    if (n.type === 'appeal_rejected') return <NotifItemAppealRejected key={n.id} notif={n} />;
    return null;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn--ghost btn--icon"
        style={{ position: 'relative', color: open ? 'var(--text)' : 'var(--text-muted)', ...(compact ? {} : { width: '100%', justifyContent: 'flex-start', gap: 9, padding: '7px 10px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 400 }) }}
        onClick={toggleOpen}
        title="Notifications"
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Icon name="bell" size={compact ? 18 : 17} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 14, height: 14, borderRadius: 99,
              background: 'var(--danger)', color: '#fff',
              fontSize: 9, fontWeight: 700, lineHeight: '14px',
              textAlign: 'center', padding: '0 3px',
              border: '1.5px solid var(--bg)',
            }}>{unread > 99 ? '99+' : unread}</span>
          )}
        </span>
        {!compact && <span>Notifications</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          ...(compact
            ? { bottom: '110%', right: 0 }
            : { bottom: '110%', left: 0, right: 0 }),
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)',
          width: compact ? 320 : undefined,
          minWidth: 260,
          zIndex: 200,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Notifications</span>
            {unread > 0 && <span style={{ fontSize: 11, color: 'var(--accent-strong)', fontWeight: 600 }}>{unread} new</span>}
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {!loaded && (
              <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-faint)' }}>Loading…</div>
            )}
            {loaded && notifs.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <Icon name="bell" size={28} style={{ color: 'var(--text-faint)', marginBottom: 10 }} />
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>No notifications yet</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>We'll let you know when something happens</div>
              </div>
            )}
            {loaded && notifs.map(renderItem)}
          </div>
        </div>
      )}

      <style>{`
        .notif-item {
          display: flex; gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
        }
        .notif-item:last-child { border-bottom: none; }
        .notif-item--danger  { background: var(--danger-soft); }
        .notif-item--warn    { background: var(--warn-soft); }
        .notif-item--success { background: var(--success-soft); }
        .notif-item__icon {
          flex-shrink: 0; margin-top: 2px;
          width: 24px; height: 24px; border-radius: var(--r-sm);
          display: grid; place-items: center;
          background: var(--surface-2); color: var(--text-muted);
        }
        .notif-item--danger  .notif-item__icon { background: var(--danger-soft-border);  color: var(--danger-text); }
        .notif-item--warn    .notif-item__icon { background: var(--warn-soft-border);    color: var(--warn-text); }
        .notif-item--success .notif-item__icon { background: var(--success-soft-border); color: var(--success-text); }
        .notif-item__body   { flex: 1; min-width: 0; }
        .notif-item__title  { font-size: 12px; font-weight: 600; color: var(--text); line-height: 1.3; }
        .notif-item__sub    { font-size: 11px; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .notif-item__reason {
          font-size: 11px; color: var(--text); background: var(--surface-2);
          border: 1px solid var(--border); border-radius: var(--r-sm);
          padding: 6px 8px; margin-top: 6px; line-height: 1.4;
        }
        .notif-item__link   { background: none; border: none; padding: 0; cursor: pointer; font-size: 11px; color: var(--accent-strong); font-weight: 600; margin-top: 4px; display: block; }
        .notif-item__link:hover { text-decoration: underline; }
        .notif-item__quiz-link {
          display: inline-flex; align-items: center; gap: 4px;
          background: none; border: none; padding: 3px 0; margin: 2px 0;
          font-size: 12px; font-weight: 500; color: var(--text);
          max-width: 100%; text-align: left;
        }
        .notif-item__quiz-link[style*="pointer"]:hover .notif-item__quiz-link__title { text-decoration: underline; }
        .notif-item__quiz-link[style*="pointer"]:hover { color: var(--accent-strong); }
        .notif-item__quiz-link__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .notif-item__tag    { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 99px; margin-top: 4px; }
        .notif-item__tag--warn { background: var(--warn-soft); color: var(--warn-text); border: 1px solid var(--warn-soft-border); }
      `}</style>
    </div>
  );
}

window.NotificationBell = NotificationBell;

function Sidebar({ current, onLogout }) {
  window.useLang(); // re-render when language changes

  const u = window.CURRENT_USER;
  const nav = window.navigate;

  const items = [
    { id: 'dashboard', label: t('nav.browse'),    icon: 'compass' },
    { id: 'editor',    label: t('nav.editor'),    icon: 'edit' },
    { id: 'sessions',  label: t('nav.sessions'),  icon: 'users' },
    { id: 'analytics', label: t('nav.analytics'), icon: 'chart' },
    { id: 'profile',   label: t('nav.you'),       icon: 'user'   },
  ];
  const bottom = [
    { id: 'settings',   label: t('nav.settings'),   icon: 'settings'  },
    ...(u.permission === 'moderator' ? [{ id: 'styleguide', label: 'Styleguide', icon: 'sparkle' }] : []),
  ];

  return (
    <aside className="sidebar" {...screenLabel('Sidebar')}>
      <div className="sidebar__logo" style={{ marginBottom: 4 }}>
        <NQLogo size={30} />
        <span style={{ fontSize: 16, letterSpacing: '-0.03em' }}>
          Nova<span style={{ color: 'var(--accent-strong)' }}>Quiz</span>
        </span>
      </div>

      <button
        className="btn btn--accent"
        style={{ marginBottom: 8, width: '100%', justifyContent: 'flex-start', padding: '9px 12px', fontSize: 13 }}
        onClick={() => nav('editor', { newQuiz: 1 })}
      >
        <Icon name="plus" size={15} />
        {t('nav.new_quiz')}
      </button>

      <button
        className="sidebar__search"
        onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
      >
        <Icon name="search" size={13} />
        <span className="sidebar__search__label">{t('nav.search')}</span>
        <kbd>{typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl+K'}</kbd>
      </button>

      <div className="sidebar__section-label">{t('nav.workspace')}</div>
      {items.map(item => (
        <a
          key={item.id}
          href={window.ROUTES[item.id]}
          className={`nav-item ${current === item.id ? 'nav-item--active' : ''}`}
          onClick={(e) => { e.preventDefault(); nav(item.id); }}
        >
          <Icon name={item.icon} size={17} />
          <span>{item.label}</span>
          {item.badge && <span className="nav-item__badge">{item.badge}</span>}
        </a>
      ))}

      <div style={{ flex: 1 }} />

      {/* Credits badge */}
      <div className="credits-card" onClick={() => nav('settings')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
            color: 'var(--accent-fg)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 1px 4px oklch(from var(--accent) l c h / 0.35)',
          }}>
            <Icon name="star" size={13} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {u.credits.toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginTop: 1 }}>
              {t('nav.credits')}
            </div>
          </div>
          <Icon name="arrowRight" size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
        </div>
      </div>

      {/* Bottom divider */}
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 2px 6px' }} />

      <NotificationBell />

      {bottom.map(item => (
        <a
          key={item.id}
          href={window.ROUTES[item.id]}
          className={`nav-item ${current === item.id ? 'nav-item--active' : ''}`}
          onClick={(e) => { e.preventDefault(); nav(item.id); }}
        >
          <Icon name={item.icon} size={17} />
          <span>{item.label}</span>
        </a>
      ))}

      <div className="sidebar__user" onClick={() => nav('settings')}>
        <div className="avatar" style={{
          background: `linear-gradient(135deg, oklch(75% 0.16 ${(u.username || '').charCodeAt(0) % 360}), oklch(65% 0.18 ${((u.username || '').charCodeAt(0) + 60) % 360}))`,
        }}>
          {(u.name || u.username || '?').split(' ').map(w => w[0]).join('')}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{u.name || u.username}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <span className="mono">@{u.username}</span>
            {u.permission === 'moderator' && (
              <span className="badge-mod">MOD</span>
            )}
          </div>
        </div>
        <Icon name="settings" size={13} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
      </div>

      <style>{`
        .credits-card {
          margin: 0 4px 8px;
          padding: 10px 12px;
          border-radius: var(--r-md);
          background: linear-gradient(135deg,
            oklch(from var(--accent) l c h / 0.07) 0%,
            oklch(from var(--accent) l c h / 0.03) 100%);
          border: 1px solid oklch(from var(--accent) l c h / 0.20);
          cursor: pointer;
          transition: all 150ms var(--ease);
        }
        .credits-card:hover {
          border-color: oklch(from var(--accent) l c h / 0.40);
          background: linear-gradient(135deg,
            oklch(from var(--accent) l c h / 0.12) 0%,
            oklch(from var(--accent) l c h / 0.06) 100%);
        }
        .sidebar__user {
          transition: background 150ms var(--ease);
        }
        .sidebar__user:hover {
          background: var(--surface);
          border-radius: var(--r-md);
        }
      `}</style>
    </aside>
  );
}

window.Sidebar = Sidebar;

// === Mobile bottom navigation bar ===
function MobileNav({ current }) {
  window.useLang();
  const nav = window.navigate;

  const items = [
    { id: 'dashboard', label: t('nav.browse'),    icon: 'compass' },
    { id: 'editor',    label: t('nav.editor'),    icon: 'edit'    },
    { id: 'sessions',  label: t('nav.sessions'),  icon: 'users'   },
    { id: 'analytics', label: t('nav.analytics'), icon: 'chart'   },
    { id: 'profile',   label: t('nav.you'),       icon: 'user'    },
  ];

  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {items.map(item => (
        <button
          key={item.id}
          className={`mobile-nav__item ${current === item.id ? 'mobile-nav__item--active' : ''}`}
          onClick={() => nav(item.id)}
          aria-current={current === item.id ? 'page' : undefined}
        >
          <Icon name={item.icon} size={20} strokeWidth={current === item.id ? 2.2 : 1.8} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

// === Mobile sticky header (logo + quick action) ===
function MobileHeader({ current }) {
  window.useLang();
  return (
    <header className="mobile-header" aria-label="Mobile header">
      <div className="mobile-header__logo">
        <NQLogo size={26} />
        <span>Nova<span style={{ color: 'var(--accent)' }}>Quiz</span></span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <NotificationBell compact />
        <button
          className="btn btn--ghost btn--icon"
          style={{ color: 'var(--text-muted)' }}
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          aria-label="Search"
        >
          <Icon name="search" size={18} />
        </button>
        <button
          className="btn btn--accent btn--sm"
          style={{ borderRadius: 'var(--r-md)', padding: '6px 12px' }}
          onClick={() => window.navigate('editor', { newQuiz: 1 })}
        >
          <Icon name="plus" size={14} />
          {t('nav.new_quiz')}
        </button>
      </div>
    </header>
  );
}

window.MobileNav    = MobileNav;
window.MobileHeader = MobileHeader;