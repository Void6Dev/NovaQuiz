// === Sidebar — left-rail navigation ===
// Used on dashboard, sessions, analytics, settings.
// Navigates between pages via window.navigate(screen).
import { useLang } from '/frontend/i18n.jsx';

function Sidebar({ current, onLogout }) {
  useLang(); // re-render when language changes

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
    { id: 'settings', label: t('nav.settings'), icon: 'settings' },
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
        style={{ marginBottom: 8, justifyContent: 'flex-start', padding: '10px 12px' }}
        onClick={() => nav('editor', { newQuiz: 1 })}
      >
        <Icon name="plus" size={16} />
        {t('nav.new_quiz')}
      </button>

      <button
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '8px 10px', marginBottom: 12,
          borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
          background: 'var(--surface)', cursor: 'pointer',
          color: 'var(--text-faint)', fontSize: 13,
          transition: 'border-color 150ms, color 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-faint)'; }}
        onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
      >
        <Icon name="search" size={13} />
        <span style={{ flex: 1, textAlign: 'left' }}>{t('nav.search')}</span>
        <kbd style={{
          padding: '1px 5px', borderRadius: 4,
          fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          color: 'var(--text-faint)', flexShrink: 0,
        }}>{typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl+K'}</kbd>
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

      <div className="sidebar__section-label">{t('nav.library')}</div>
      <a className="nav-item" href={window.ROUTES.dashboard} onClick={(e) => { e.preventDefault(); nav('dashboard', { tab: 'mine' }); }}>
        <Icon name="folder" size={17} /> <span>{t('nav.my_quizzes')}</span>
      </a>
      <a className="nav-item">
        <Icon name="star" size={17} /> <span>{t('nav.starred')}</span>
      </a>
      <a
        className={`nav-item ${current === 'shared' ? 'nav-item--active' : ''}`}
        href="shared.html"
        onClick={(e) => { e.preventDefault(); window.location.href = 'shared.html'; }}
      >
        <Icon name="users" size={17} /> <span>{t('nav.shared')}</span>
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
            <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{t('nav.credits')}</div>
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
