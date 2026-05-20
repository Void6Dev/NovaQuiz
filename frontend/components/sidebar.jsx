// === Sidebar — left-rail navigation ===
// Used on dashboard, sessions, analytics, settings.
// Navigates between pages via window.navigate(screen).

function Sidebar({ current, onLogout }) {
  const u = window.CURRENT_USER;
  const nav = window.navigate;

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'editor',    label: 'Editor',    icon: 'edit' },
    { id: 'sessions',  label: 'Sessions',  icon: 'users' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
  ];
  const bottom = [
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <aside className="sidebar" data-screen-label="Sidebar">
      <div className="sidebar__logo">
        <div className="sidebar__logo-mark">Q</div>
        <span>Quiz</span>
        <span className="pill" style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 7px' }}>v2.4</span>
      </div>

      <button
        className="btn btn--accent"
        style={{ marginBottom: 16, justifyContent: 'flex-start', padding: '10px 12px' }}
        onClick={() => nav('editor', { newQuiz: 1 })}
      >
        <Icon name="plus" size={16} />
        New quiz
      </button>

      <div className="sidebar__section-label">Workspace</div>
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

      <div className="sidebar__section-label">Library</div>
      <a className="nav-item" href={window.ROUTES.dashboard} onClick={(e) => { e.preventDefault(); nav('dashboard', { tab: 'mine' }); }}>
        <Icon name="folder" size={17} /> <span>My quizzes</span>
      </a>
      <a className="nav-item">
        <Icon name="star" size={17} /> <span>Starred</span>
      </a>
      <a
        className={`nav-item ${current === 'shared' ? 'nav-item--active' : ''}`}
        href={window.ROUTES.shared}
        onClick={(e) => { e.preventDefault(); nav('shared'); }}
      >
        <Icon name="users" size={17} /> <span>Shared with me</span>
      </a>

      <div style={{ flex: 1 }} />

      <div className="credits-card" onClick={() => nav('settings')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            display: 'grid', placeItems: 'center',
          }}>
            <Icon name="star" size={13} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{u.credits.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Credits</div>
          </div>
        </div>
      </div>

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
        <div className="avatar">{(u.name || u.username || '?').split(' ').map(w => w[0]).join('')}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="mono">@{u.username}</span>
            {u.permission === 'moderator' && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
                background: 'oklch(80% 0.14 220)', color: 'oklch(25% 0.06 220)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>MOD</span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .credits-card {
          margin: 0 4px 8px;
          padding: 10px 12px;
          border-radius: var(--r-md);
          background: var(--surface);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all 150ms var(--ease);
        }
        .credits-card:hover { border-color: var(--border-strong); }
      `}</style>
    </aside>
  );
}

window.Sidebar = Sidebar;
