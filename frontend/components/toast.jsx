// === Toast notifications ===
// Usage: window.showToast('message', 'success' | 'error' | 'info')
// Mount <ToastContainer /> once inside PageShell / FullPage.

const { useState, useEffect } = React;

window._toastQueue    = window._toastQueue || [];
window._toastDispatch = window._toastDispatch || null;

window.showToast = function(msg, type) {
  type = type || 'info';
  if (window._toastDispatch) {
    window._toastDispatch(msg, type);
  } else {
    window._toastQueue.push({ msg, type });
  }
};

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const remove = (id) => setToasts(ts => ts.filter(t => t.id !== id));

  const dispatch = React.useCallback((msg, type) => {
    const id = Date.now() + Math.random();
    setToasts(ts => [...ts, { id, msg, type }]);
    setTimeout(() => remove(id), 3800);
  }, []);

  useEffect(() => {
    window._toastDispatch = dispatch;
    const q = window._toastQueue.splice(0);
    q.forEach(({ msg, type }) => dispatch(msg, type));
    return () => { window._toastDispatch = null; };
  }, [dispatch]);

  const icons = { success: 'check', error: 'x', info: 'info' };
  const colors = {
    success: { bg: 'oklch(96% 0.06 145)', border: 'oklch(80% 0.12 145)', color: 'oklch(28% 0.10 145)' },
    error:   { bg: 'oklch(96% 0.04 25)',  border: 'oklch(80% 0.12 25)',  color: 'oklch(35% 0.14 25)'  },
    info:    { bg: 'var(--surface)',       border: 'var(--border-strong)', color: 'var(--text)'         },
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9998, display: 'flex', flexDirection: 'column-reverse', gap: 8, alignItems: 'center',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const c = colors[t.type] || colors.info;
        return (
          <div
            key={t.id}
            className="fade-in"
            onClick={() => remove(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 18px', borderRadius: 'var(--r-lg)',
              background: c.bg, border: `1px solid ${c.border}`, color: c.color,
              fontSize: 14, fontWeight: 500, maxWidth: 420, whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-lg)', pointerEvents: 'all', cursor: 'pointer',
            }}
          >
            <Icon name={icons[t.type] || 'info'} size={15} strokeWidth={2.4} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

window.ToastContainer = ToastContainer;
