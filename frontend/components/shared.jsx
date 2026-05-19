// === Shared UI primitives — used across pages ===
const { useState: sUseState, useEffect: sUseEffect } = React;

// === Page header ===
function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page__header">
      <div>
        <h1 className="page__title">{title}</h1>
        {subtitle && <div className="page__subtitle">{subtitle}</div>}
      </div>
      {children && <div className="page__actions">{children}</div>}
    </div>
  );
}

// === Search input ===
function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="search">
      <Icon name="search" size={16} />
      <input className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// === Modal — rendered via portal so backdrop covers the full viewport incl. sidebar ===
function Modal({ children, onClose, width }) {
  sUseEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={width ? { width } : null} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

// === Toggle ===
function Toggle({ on, onChange }) {
  return (
    <div className={`toggle ${on ? 'toggle--on' : ''}`} onClick={() => onChange(!on)} />
  );
}

// === Tooltip ===
function Tooltip({ label, children }) {
  return (
    <span style={{ position: 'relative' }} className="tt-wrap">
      {children}
      <span className="tt">{label}</span>
      <style>{`
        .tt-wrap .tt {
          position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
          background: var(--text); color: var(--bg);
          font-size: 11px; font-weight: 500; padding: 4px 8px; border-radius: 6px;
          white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 120ms;
        }
        .tt-wrap:hover .tt { opacity: 1; }
      `}</style>
    </span>
  );
}

// === Pretty stat ===
function Stat({ label, value, delta, hint }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, fontFamily: 'inherit' }}>{value}</div>
      {(delta || hint) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {delta && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: delta.startsWith('+') ? 'oklch(55% 0.15 145)' : 'var(--danger)',
            }}>{delta}</span>
          )}
          {hint && <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{hint}</span>}
        </div>
      )}
    </div>
  );
}

// === Image / cover placeholder ===
function CoverPlaceholder({ label, hue = 130, lightness = 90 }) {
  const bg1 = `oklch(${lightness}% 0.12 ${hue})`;
  const bg2 = `oklch(${lightness - 10}% 0.10 ${hue + 30})`;
  return (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(135deg, ${bg1}, ${bg2})`,
      backgroundImage: `linear-gradient(135deg, ${bg1}, ${bg2}), repeating-linear-gradient(45deg, transparent, transparent 8px, oklch(0% 0 0 / 0.04) 8px, oklch(0% 0 0 / 0.04) 9px)`,
      backgroundBlendMode: 'multiply',
      display: 'grid', placeItems: 'center',
      fontFamily: 'JetBrains Mono', fontSize: 11, letterSpacing: '0.04em',
      color: 'oklch(20% 0.06 130 / 0.6)',
      textTransform: 'uppercase',
    }}>{label}</div>
  );
}

Object.assign(window, { PageHeader, SearchInput, Modal, Toggle, Tooltip, Stat, CoverPlaceholder });
