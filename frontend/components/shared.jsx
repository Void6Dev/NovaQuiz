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

// === Brand logo mark — SVG with n-orbit geometry ===
// Strokes use currentColor; accent dot uses --accent; knockout uses --bg.
function NQLogo({ size = 28 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* n letterform: caps-height 24 · stem stroke 5.5 */}
      <path
        d="M14 48 L14 18 C14 10 40 10 40 27 L40 48"
        stroke="currentColor" strokeWidth="5.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
      {/* orbit: rx 26 · ry 11 · rotate -22° */}
      <ellipse
        cx="30" cy="34" rx="26" ry="11"
        transform="rotate(-22 30 34)"
        stroke="currentColor" strokeWidth="2" fill="none"
      />
      {/* body outline — knocks back orbit line behind the dot */}
      <circle cx="54" cy="29" r="6" style={{ fill: 'var(--bg, #fff)' }} />
      {/* orbiting body: r 4 · center (54, 29) */}
      <circle cx="54" cy="29" r="4" style={{ fill: 'var(--accent, oklch(62% 0.28 130))' }} />
    </svg>
  );
}

// === Segmented control — tabs / filters / view toggle ===
// options: [{ value, label?, icon?, iconSize?, badge?, tooltip? }]
function SegmentedControl({ options, value, onChange, size = 'md', ariaLabel }) {
  const trackRef = useRef(null);
  const [ind, setInd] = React.useState(null);
  const [animated, setAnimated] = React.useState(false);

  // Measure active button — synchronously before paint to avoid flicker
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const active = track.querySelector('[aria-selected="true"]');
    if (!active) return;
    const tr = track.getBoundingClientRect();
    const br = active.getBoundingClientRect();
    setInd({ left: br.left - tr.left, top: br.top - tr.top, width: br.width, height: br.height });
  }, [value]);

  // Enable sliding transition only after first measurement so it doesn't animate from 0 on mount
  useEffect(() => {
    if (ind && !animated) {
      const id = requestAnimationFrame(() => setAnimated(true));
      return () => cancelAnimationFrame(id);
    }
  }, [ind, animated]);

  const cls = 'seg-ctrl' +
    (size === 'lg' ? ' seg-ctrl--lg' : size === 'sm' ? ' seg-ctrl--sm' : '');

  return (
    <div className={cls} role="tablist" aria-label={ariaLabel} ref={trackRef}>
      {ind && (
        <div
          className={`seg-ctrl__indicator${animated ? ' seg-ctrl__indicator--anim' : ''}`}
          style={{ left: ind.left, top: ind.top, width: ind.width, height: ind.height }}
        />
      )}
      {options.map(opt => {
        const active = opt.value === value;
        const btn = (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`seg-ctrl__btn${active ? ' seg-ctrl__btn--active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon && <Icon name={opt.icon} size={opt.iconSize || 14} />}
            {opt.label && <span>{opt.label}</span>}
            {opt.badge != null && <span className="seg-ctrl__badge">{opt.badge}</span>}
          </button>
        );
        return opt.tooltip
          ? <Tooltip key={opt.value} label={opt.tooltip}>{btn}</Tooltip>
          : btn;
      })}
    </div>
  );
}

// ── Image crop ────────────────────────────────────────────────────────────────

function _cropMinZoom(r, A) {
  const a = ((r % 360) + 360) % 360;
  const ea = a > 180 ? 360 - a : a;
  const ea2 = ea > 90 ? 180 - ea : ea;
  if (ea2 === 0) return 1;
  const rad = ea2 * Math.PI / 180;
  return Math.max(A * Math.sin(rad) + Math.cos(rad), (Math.sin(rad) + A * Math.cos(rad)) / A);
}

// Returns inline styles for a position:absolute; inset:0 div inside overflow:hidden.
// transform = {x, y, z, r} — pan fractions, zoom multiplier, rotation degrees.
function applyImageTransform(url, transform, aspectRatio) {
  const { x = 0, y = 0, z = 1, r = 0 } = transform || {};
  const A = aspectRatio != null ? aspectRatio : 16 / 9;
  const effectiveZ = Math.max(z, _cropMinZoom(r, A));
  const hasT = x !== 0 || y !== 0 || effectiveZ !== 1 || r !== 0;
  return {
    position: 'absolute', inset: 0,
    backgroundImage: `url(${url})`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    transformOrigin: 'center',
    ...(hasT ? { transform: `translate(${x * 100}%, ${y * 100}%) scale(${effectiveZ}) rotate(${r}deg)` } : {}),
  };
}
window.applyImageTransform = applyImageTransform;

function ImageCropModal({ imageUrl, transform, aspectRatio, shape, onSave, onClose }) {
  const A = aspectRatio != null ? aspectRatio : 16 / 9;
  const [loc, setLoc]       = sUseState({ x: 0, y: 0, z: 1, r: 0, ...(transform || {}) });
  const [dragging, setDrag] = sUseState(false);
  const contRef = React.useRef(null);
  const drag    = React.useRef(null);

  const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const clampXY = (x, y, z) => { const m = Math.max(0, (z - 1) / 2); return { x: clamp(x, -m, m), y: clamp(y, -m, m) }; };

  const onPD = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, bx: loc.x, by: loc.y };
    setDrag(true);
  };
  const onPM = (e) => {
    if (!drag.current) return;
    const ct = contRef.current;
    if (!ct) return;
    const { width, height } = ct.getBoundingClientRect();
    const dx = (e.clientX - drag.current.sx) / width;
    const dy = (e.clientY - drag.current.sy) / height;
    setLoc(l => ({ ...l, ...clampXY(drag.current.bx + dx, drag.current.by + dy, l.z) }));
  };
  const onPU = () => { drag.current = null; setDrag(false); };

  sUseEffect(() => {
    const el = contRef.current;
    if (!el) return;
    const fn = (e) => {
      e.preventDefault();
      const d = e.deltaY < 0 ? 0.08 : -0.08;
      setLoc(l => { const nz = clamp(l.z + d, 1, 4); return { ...l, z: nz, ...clampXY(l.x, l.y, nz) }; });
    };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, []);

  const isDefault = loc.x === 0 && loc.y === 0 && loc.z === 1 && loc.r === 0;

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 520, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>

        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{t('ui.crop_title')}</div>
          <button className="btn btn--ghost btn--icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          <div
            ref={contRef}
            style={{
              position: 'relative', overflow: 'hidden',
              aspectRatio: String(A),
              borderRadius: shape === 'circle' ? '50%' : 10,
              background: 'var(--bg-2)',
              cursor: dragging ? 'grabbing' : 'grab',
              userSelect: 'none', touchAction: 'none',
              boxShadow: 'inset 0 0 0 1px var(--border)',
            }}
            onPointerDown={onPD}
            onPointerMove={onPM}
            onPointerUp={onPU}
            onPointerCancel={onPU}
          >
            <div style={applyImageTransform(imageUrl, loc, A)} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {['33.33%', '66.66%'].map(p => (
                <React.Fragment key={p}>
                  <div style={{ position: 'absolute', left: p, top: 0, bottom: 0, width: 1, background: 'oklch(100% 0 0 / 0.18)' }} />
                  <div style={{ position: 'absolute', top: p, left: 0, right: 0, height: 1, background: 'oklch(100% 0 0 / 0.18)' }} />
                </React.Fragment>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', marginTop: 6 }}>
            {t('ui.crop_hint')}
          </p>
        </div>

        <div style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Icon name="image" size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <input type="range" min={1} max={4} step={0.02} value={loc.z}
              onChange={e => { const nz = parseFloat(e.target.value); setLoc(l => ({ ...l, z: nz, ...clampXY(l.x, l.y, nz) })); }}
              style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <Icon name="image" size={17} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 42, textAlign: 'right' }}>
              {Math.round(loc.z * 100)}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-faint)', minWidth: 52, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {t('edit.img_rotation')}
            </span>
            <div style={{ display: 'flex', gap: 3 }}>
              {[-90, 0, 90, 180].map(deg => (
                <button key={deg} onClick={() => setLoc(l => ({ ...l, r: deg }))} style={{
                  padding: '4px 8px', fontSize: 11, fontFamily: 'JetBrains Mono',
                  borderRadius: 6, cursor: 'pointer', lineHeight: 1.4,
                  background: loc.r === deg ? 'var(--text)' : 'var(--surface)',
                  color: loc.r === deg ? 'var(--bg)' : 'var(--text-muted)',
                  border: '1px solid ' + (loc.r === deg ? 'var(--text)' : 'var(--border)'),
                }}>{deg}°</button>
              ))}
            </div>
            <input type="range" min={-180} max={180} step={1} value={loc.r}
              onChange={e => setLoc(l => ({ ...l, r: parseInt(e.target.value) }))}
              style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer', minWidth: 60 }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 30, textAlign: 'right' }}>{loc.r}°</span>
          </div>
        </div>

        <div style={{ padding: '0 20px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isDefault && (
            <button className="btn btn--ghost btn--sm"
              onClick={() => setLoc({ x: 0, y: 0, z: 1, r: 0 })}
              style={{ fontSize: 11, color: 'var(--text-faint)' }}
            >{t('edit.img_reset')}</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn--secondary" onClick={onClose}>{t('edit.cancel')}</button>
          <button className="btn btn--accent"
            onClick={() => onSave({ x: loc.x, y: loc.y, z: loc.z, r: loc.r })}
          >{t('ui.apply')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
window.ImageCropModal = ImageCropModal;

function launchConfetti() {
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '9999',
  });
  document.body.appendChild(canvas);
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#f87171','#fb923c','#fbbf24','#4ade80','#34d399','#60a5fa','#a78bfa','#f472b6'];
  const particles = Array.from({ length: 180 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    w: 6 + Math.random() * 10, h: 4 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 3.5, vy: 1.5 + Math.random() * 4,
    angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.18,
    wobble: Math.random() * Math.PI * 2,
  }));
  let raf;
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.055;
      p.angle += p.spin; p.wobble += 0.06; p.vx += Math.sin(p.wobble) * 0.04;
      if (p.y < canvas.height + 30) alive = true;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive) raf = requestAnimationFrame(tick);
    else canvas.remove();
  };
  raf = requestAnimationFrame(tick);
  setTimeout(() => { cancelAnimationFrame(raf); canvas.remove(); }, 6000);
}

Object.assign(window, { PageHeader, SearchInput, Modal, Toggle, Tooltip, Stat, CoverPlaceholder, NQLogo, SegmentedControl, launchConfetti });
