// === SiteFooter — public marketing footer ===
// Used on landing + auth. The app shell does not show a footer.

function SiteFooter({ variant = 'full' }) {
  if (variant === 'compact') {
    return (
      <footer className="site-footer site-footer--compact mono">
        © 2026 Quiz, Inc. · <a>Privacy</a> · <a>Terms</a>
      </footer>
    );
  }
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <div>
          <div className="site-footer__brand">
            <div className="sidebar__logo-mark">Q</div>
            <span>Quiz</span>
          </div>
          <p className="site-footer__tag">A premium-grade quiz studio. Crafted in OKLCH.</p>
        </div>
        <div className="site-footer__cols">
          <FooterCol title="Product" links={['Editor', 'Live mode', 'Analytics', 'Templates', 'Changelog']} />
          <FooterCol title="Company" links={['About', 'Customers', 'Pricing', 'Careers']} />
          <FooterCol title="Resources" links={['Docs', 'API', 'Community', 'Status']} />
          <FooterCol title="Legal"     links={['Privacy', 'Terms', 'Security']} />
        </div>
      </div>
      <div className="site-footer__bottom">
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)' }}>© 2026 Quiz, Inc.</span>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-muted)' }}>
          <a>Twitter</a><a>GitHub</a><a>RSS</a>
        </div>
      </div>

      <style>{`
        .site-footer {
          border-top: 1px solid var(--border);
          padding: 56px 40px 28px;
          background: var(--bg-2);
        }
        .site-footer__top {
          max-width: 1320px; margin: 0 auto;
          display: grid; grid-template-columns: 1.1fr 2fr; gap: 48px;
          padding-bottom: 40px;
          border-bottom: 1px solid var(--border);
        }
        .site-footer__brand {
          display: flex; align-items: center; gap: 10px;
          font-weight: 700; font-size: 16px; letter-spacing: -0.02em;
          margin-bottom: 12px;
        }
        .site-footer__tag {
          font-size: 14px; color: var(--text-muted);
          line-height: 1.5; max-width: 280px; text-wrap: pretty;
        }
        .site-footer__cols {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px;
        }
        .site-footer__bottom {
          max-width: 1320px; margin: 0 auto;
          padding-top: 24px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .site-footer__bottom a { cursor: pointer; transition: color 120ms; }
        .site-footer__bottom a:hover { color: var(--text); }

        .site-footer--compact {
          padding: 18px 40px;
          font-size: 11px;
          color: var(--text-faint);
          text-align: center;
          border-top: 1px solid var(--border);
        }
        .site-footer--compact a { color: var(--text-muted); cursor: pointer; }

        @media (max-width: 800px) {
          .site-footer__top { grid-template-columns: 1fr; }
          .site-footer__cols { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {links.map(l => (
          <a key={l} style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 120ms' }}
             onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
             onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            {l}
          </a>
        ))}
      </div>
    </div>
  );
}

// === SiteHeader — public marketing top nav (landing) ===
function SiteHeader({ activeLink, transparent }) {
  const nav = window.navigate;
  return (
    <header className="site-header" style={transparent ? { background: 'transparent', borderBottom: 0 } : null}>
      <a className="site-header__brand" href="index.html" onClick={(e) => { e.preventDefault(); nav('landing'); }}>
        <div className="sidebar__logo-mark">Q</div>
        <span>Quiz</span>
      </a>
      <nav className="site-header__links">
        {['Product', 'Templates', 'Pricing', 'Changelog'].map(l => (
          <a key={l} className={activeLink === l ? 'is-active' : ''}>{l}</a>
        ))}
      </nav>
      <div style={{ display: 'flex', gap: 8 }}>
        <a className="btn btn--ghost btn--sm" href="auth.html?mode=login"
           onClick={(e) => { e.preventDefault(); nav('login'); }}>Sign in</a>
        <a className="btn btn--primary btn--sm" href="dashboard.html"
           onClick={(e) => { e.preventDefault(); nav('dashboard'); }}>Open app</a>
      </div>

      <style>{`
        .site-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 40px;
          border-bottom: 1px solid var(--border);
          background: oklch(from var(--bg) l c h / 0.7);
          backdrop-filter: blur(20px);
          position: sticky; top: 0; z-index: 10;
        }
        .site-header__brand {
          display: flex; align-items: center; gap: 10px;
          font-weight: 700; font-size: 16px; letter-spacing: -0.02em;
          cursor: pointer;
        }
        .site-header__links { display: flex; gap: 28px; font-size: 14px; color: var(--text-muted); font-weight: 500; }
        .site-header__links a { cursor: pointer; transition: color 150ms; }
        .site-header__links a:hover, .site-header__links a.is-active { color: var(--text); }
      `}</style>
    </header>
  );
}

Object.assign(window, { SiteFooter, SiteHeader });
