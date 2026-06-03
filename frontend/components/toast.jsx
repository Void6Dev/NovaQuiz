// === Toast notifications ===
// Usage: window.showToast('message', 'success' | 'error' | 'info' | 'achievement')
//        window.showAchievementToast('Name', 'Description')
// Mount <ToastContainer /> once inside PageShell / FullPage.

const { useState, useEffect } = React;

window._toastQueue    = window._toastQueue || [];
window._toastDispatch = window._toastDispatch || null;

const TOAST_DURATION = 3800;

window.showToast = function(msg, type) {
  type = type || 'info';
  if (window._toastDispatch) {
    window._toastDispatch({ msg, type });
  } else {
    window._toastQueue.push({ msg, type });
  }
};

window.showAchievementToast = function(name, desc) {
  if (window._toastDispatch) {
    window._toastDispatch({ msg: name, sub: desc, type: 'achievement' });
  } else {
    window._toastQueue.push({ msg: name, sub: desc, type: 'achievement' });
  }
};

function ToastItem({ id, msg, sub, type, onRemove }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(id), 280);
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => onRemove(id), 280);
  };

  const isAchievement = type === 'achievement';
  const iconMap = { success: 'check', error: 'x', info: 'info', achievement: 'star' };
  const accentVar = {
    success:     'oklch(60% 0.18 145)',
    error:       'oklch(62% 0.20 25)',
    info:        'var(--accent-strong)',
    achievement: 'oklch(76% 0.19 75)',
  };
  const accent = accentVar[type] || accentVar.info;

  return (
    <div
      className={`toast-item${leaving ? ' toast-leaving' : ''}`}
      onClick={dismiss}
      style={{ '--toast-accent': accent, '--toast-dur': `${TOAST_DURATION}ms` }}
    >
      <div className="toast-glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="toast-icon">
            <Icon name={iconMap[type] || 'info'} size={14} strokeWidth={2.4} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="toast-msg">
              {isAchievement && <span style={{ marginRight: 4 }}>🏆</span>}
              {msg}
            </div>
            {sub && <div className="toast-sub">{sub}</div>}
          </div>
        </div>
        <div className="toast-track">
          <div className="toast-bar" />
        </div>
      </div>
    </div>
  );
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const remove = React.useCallback((id) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const dispatch = React.useCallback((item) => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, ...item }]);
  }, []);

  useEffect(() => {
    window._toastDispatch = dispatch;
    const q = window._toastQueue.splice(0);
    q.forEach(item => dispatch(item));
    return () => { window._toastDispatch = null; };
  }, [dispatch]);

  return (
    <>
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onRemove={remove} />
        ))}
      </div>
      <style>{`
        /* ── Container ──────────────────────────────── */
        .toast-container {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9998;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
          pointer-events: none;
        }
        @media (max-width: 640px) {
          .toast-container {
            bottom: auto;
            top: 20px;
          }
        }

        /* ── Item enter / leave ─────────────────────── */
        .toast-item {
          pointer-events: all;
          cursor: pointer;
          animation: toastInDesktop 300ms cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
        .toast-item.toast-leaving {
          animation: toastOut 260ms cubic-bezier(0.32, 0.72, 0, 1) forwards !important;
        }
        @media (max-width: 640px) {
          .toast-item:not(.toast-leaving) {
            animation-name: toastInMobile;
          }
        }
        @keyframes toastInDesktop {
          from { opacity: 0; transform: translateY(14px) scale(0.93); filter: blur(2px); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0);   }
        }
        @keyframes toastInMobile {
          from { opacity: 0; transform: translateY(-14px) scale(0.93); filter: blur(2px); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    filter: blur(0);   }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: scale(1);    filter: blur(0);   }
          to   { opacity: 0; transform: scale(0.88); filter: blur(3px); }
        }

        /* ── Glass surface ──────────────────────────── */
        .toast-glass {
          position: relative;
          overflow: hidden;
          min-width: 260px;
          max-width: 400px;
          padding: 12px 18px 10px;
          border-radius: 18px;

          /* light mode liquid glass */
          background: oklch(99% 0.003 90 / 0.62);
          backdrop-filter: blur(32px) saturate(210%) brightness(110%);
          -webkit-backdrop-filter: blur(32px) saturate(210%) brightness(110%);
          border: 1px solid oklch(100% 0 0 / 0.68);
          box-shadow:
            0 2px 0   oklch(100% 0 0 / 0.70) inset,
            0 -1px 0  oklch(0%   0 0 / 0.04) inset,
            0 16px 40px oklch(0% 0 0 / 0.10),
            0 3px  8px  oklch(0% 0 0 / 0.05);
          color: var(--text);
        }
        [data-theme="dark"] .toast-glass {
          background: oklch(20% 0.008 270 / 0.85);
          backdrop-filter: blur(32px) saturate(170%) brightness(72%);
          -webkit-backdrop-filter: blur(32px) saturate(170%) brightness(72%);
          border: 1px solid oklch(100% 0 0 / 0.09);
          box-shadow:
            0 1px 0   oklch(100% 0 0 / 0.13) inset,
            0 16px 44px oklch(0% 0 0 / 0.60),
            0 3px  10px oklch(0% 0 0 / 0.35);
        }

        /* ── Icon badge ─────────────────────────────── */
        .toast-icon {
          width: 26px; height: 26px; border-radius: 7px;
          background: oklch(from var(--toast-accent) l c h / 0.14);
          border: 1px solid oklch(from var(--toast-accent) l c h / 0.28);
          display: grid; place-items: center;
          color: var(--toast-accent);
          flex-shrink: 0;
        }

        /* ── Text ───────────────────────────────────── */
        .toast-msg {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
          line-height: 1.4;
        }
        .toast-sub {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Progress bar ───────────────────────────── */
        .toast-track {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: oklch(0% 0 0 / 0.06);
        }
        [data-theme="dark"] .toast-track {
          background: oklch(100% 0 0 / 0.07);
        }
        .toast-bar {
          height: 100%;
          width: 100%;
          background: var(--toast-accent);
          border-radius: 1px;
          transform-origin: left;
          animation: toastProgress var(--toast-dur) linear forwards;
        }
        @keyframes toastProgress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </>
  );
}

window.ToastContainer = ToastContainer;
