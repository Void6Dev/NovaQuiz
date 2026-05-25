// === Command palette — Ctrl+K / ⌘K ===

const _isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

function CommandPalette() {
  window.useLang(); // re-render on language change

  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState('');
  const [quizzes, setQuizzes]   = useState([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef   = useRef(null);

  // ── Jump / action lists — recomputed each render so labels update on lang change ──
  const CP_JUMP = [
    { id: 'cp-home',      label: t('cp.browse'),    sub: 'dashboard',    icon: 'compass',  screen: 'dashboard',  hint: ['G','H'] },
    { id: 'cp-analytics', label: t('cp.analytics'), sub: 'last 30 days', icon: 'chart',    screen: 'analytics',  hint: ['G','A'] },
    { id: 'cp-sessions',  label: t('cp.sessions'),  sub: '',             icon: 'users',    screen: 'sessions',   hint: ['G','S'] },
    { id: 'cp-profile',   label: t('cp.profile'),   sub: '',             icon: 'user',     screen: 'profile',    hint: ['G','P'] },
    { id: 'cp-settings',  label: t('cp.settings'),  sub: '',             icon: 'settings', screen: 'settings',   hint: []        },
  ];

  const CP_ACTIONS = [
    {
      id: 'cp-new-quiz',
      label: t('cp.new_quiz'), sub: '',
      icon: 'plus', hint: ['N','Q'],
      run: () => window.navigate('editor', { newQuiz: 1 }),
    },
    {
      id: 'cp-run-live',
      label: t('cp.run_live'), sub: t('cp.pick_quiz'),
      icon: 'bolt', hint: ['N','L'],
      run: () => window.navigate('sessions'),
    },
  ];

  // ── Global shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Listen for programmatic open from sidebar button
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, []);

  // ── On open/close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) { setQuery(''); setActiveIdx(0); return; }
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 30);
    // Lazy-load quizzes
    if (quizzes.length === 0 && !loadingQ) {
      setLoadingQ(true);
      window.API.get('/quizzes/?mine=1')
        .then(data => {
          setQuizzes((data.quizzes || []).map(window.API.fromBackendQuiz));
          setLoadingQ(false);
        })
        .catch(() => setLoadingQ(false));
    }
  }, [open]);

  if (!open) return null;

  // ── Build filtered results ────────────────────────────────────────────────
  const q = query.trim().toLowerCase();

  const filteredQuizzes = q
    ? quizzes.filter(qz => qz.title.toLowerCase().includes(q)).slice(0, 6)
    : quizzes.slice(0, 5);

  const filteredJump    = CP_JUMP.filter(i => !q || i.label.toLowerCase().includes(q));
  const filteredActions = CP_ACTIONS.filter(i => !q || i.label.toLowerCase().includes(q));

  // Flat list for keyboard navigation (sections excluded)
  const selectables = [
    ...filteredQuizzes.map(qz => ({ _type: 'quiz',   ...qz })),
    ...filteredJump.map(i    => ({ _type: 'jump',   ...i  })),
    ...filteredActions.map(i => ({ _type: 'action', ...i  })),
  ];
  const cIdx = Math.min(activeIdx, Math.max(selectables.length - 1, 0));

  const execute = (item) => {
    setOpen(false);
    if (item._type === 'quiz')   window.navigate('editor', { quizId: item.id });
    else if (item._type === 'jump')   window.navigate(item.screen);
    else if (item._type === 'action' && item.run) item.run();
  };

  const onKeyDown = (e) => {
    if      (e.key === 'Escape')    { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, selectables.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); if (selectables[cIdx]) execute(selectables[cIdx]); }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  let gIdx = 0; // global selectable index

  const renderItem = (item, extraMeta) => {
    const myIdx = gIdx++;
    const active = cIdx === myIdx;
    const isQuiz = item._type === 'quiz';
    const topicInfo = isQuiz ? (window.TOPIC_BY_CODE?.[item.topic] || { hue: 200 }) : null;

    return (
      <button
        key={item.id}
        className={`cp-item${active ? ' cp-item--active' : ''}`}
        onClick={() => execute(item)}
        onMouseEnter={() => setActiveIdx(myIdx)}
      >
        <div className="cp-item__icon">
          {isQuiz ? (
            <span style={{
              width: 8, height: 8, borderRadius: 99,
              background: `oklch(65% 0.17 ${topicInfo.hue})`,
              display: 'inline-block',
            }} />
          ) : (
            <Icon name={item.icon} size={14} />
          )}
        </div>

        <div className="cp-item__body">
          <span className="cp-item__label">{item.label}</span>
          {(item.sub || extraMeta) && (
            <span className="cp-item__sub">{item.sub || extraMeta}</span>
          )}
        </div>

        {item.hint && item.hint.length > 0 && (
          <div className="cp-item__hint">
            {item.hint.map((k, i) => <kbd key={i} className="cp-kbd-sm">{k}</kbd>)}
          </div>
        )}
      </button>
    );
  };

  const kbdLabel = _isMac ? '⌘K' : 'Ctrl+K';
  const noResults = selectables.length === 0 && !loadingQ;

  return (
    <>
      {/* Backdrop */}
      <div
        className="cp-backdrop"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Modal wrapper */}
      <div className="cp-wrapper" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="cp-modal">
          {/* ── Search bar ── */}
          <div className="cp-search">
            <Icon name="search" size={15} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="cp-input"
              value={query}
              placeholder={t('cp.placeholder')}
              onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
              onKeyDown={onKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="cp-kbd">{kbdLabel}</kbd>
          </div>

          {/* ── Results ── */}
          <div className="cp-results">
            {noResults && q && (
              <div className="cp-empty">{t('cp.no_results')} "<strong>{query}</strong>"</div>
            )}

            {filteredQuizzes.length > 0 && (
              <section className="cp-section">
                <div className="cp-section__label">{q ? t('cp.quizzes') : t('cp.recent')}</div>
                {filteredQuizzes.map(qz => renderItem({ _type: 'quiz', ...qz }, qz.topic ? window.TOPIC_BY_CODE?.[qz.topic]?.label : ''))}
              </section>
            )}

            {filteredJump.length > 0 && (
              <section className="cp-section">
                <div className="cp-section__label">{t('cp.jump_to')}</div>
                {filteredJump.map(i => renderItem({ _type: 'jump', ...i }))}
              </section>
            )}

            {filteredActions.length > 0 && (
              <section className="cp-section">
                <div className="cp-section__label">{t('cp.actions')}</div>
                {filteredActions.map(i => renderItem({ _type: 'action', ...i }))}
              </section>
            )}

            {loadingQ && filteredQuizzes.length === 0 && !q && (
              <div className="cp-empty" style={{ color: 'var(--text-faint)' }}>{t('cp.loading')}</div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="cp-footer">
            <span className="cp-footer__hint"><kbd className="cp-kbd-sm">↑↓</kbd> {t('cp.navigate')}</span>
            <span className="cp-footer__hint"><kbd className="cp-kbd-sm">↵</kbd> {t('cp.select')}</span>
            <span className="cp-footer__hint"><kbd className="cp-kbd-sm">esc</kbd> {t('cp.close')}</span>
          </div>
        </div>
      </div>

      <style>{`
        .cp-backdrop {
          position: fixed; inset: 0;
          background: oklch(0% 0 0 / 0.40);
          backdrop-filter: blur(3px);
          z-index: 900;
          animation: cpFadeIn 140ms var(--ease);
        }
        .cp-wrapper {
          position: fixed; inset: 0; z-index: 901;
          display: flex; align-items: flex-start; justify-content: center;
          padding-top: clamp(60px, 12vh, 160px);
          pointer-events: none;
        }
        .cp-modal {
          pointer-events: auto;
          width: 100%; max-width: 560px; margin: 0 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow:
            0 40px 80px oklch(0% 0 0 / 0.22),
            0 10px 24px oklch(0% 0 0 / 0.10);
          overflow: hidden;
          animation: cpSlideDown 180ms var(--ease);
        }
        [data-theme="dark"] .cp-modal {
          box-shadow:
            0 40px 80px oklch(0% 0 0 / 0.55),
            0 10px 24px oklch(0% 0 0 / 0.30);
        }

        /* Search bar */
        .cp-search {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
        }
        .cp-input {
          flex: 1; font-size: 15px; font-weight: 500; letter-spacing: -0.01em;
          background: transparent; border: none; outline: none;
          color: var(--text);
        }
        .cp-input::placeholder { color: var(--text-faint); font-weight: 400; }
        .cp-kbd {
          padding: 2px 7px; border-radius: 5px;
          font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 600;
          background: var(--bg-2); border: 1px solid var(--border);
          color: var(--text-faint); white-space: nowrap; flex-shrink: 0;
        }
        .cp-kbd-sm {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 1px 5px; min-width: 20px; border-radius: 4px;
          font-size: 10px; font-family: 'JetBrains Mono', monospace; font-weight: 600;
          background: var(--bg-2); border: 1px solid var(--border);
          color: var(--text-faint);
        }

        /* Results */
        .cp-results {
          max-height: 340px; overflow-y: auto; padding: 4px 0;
        }
        .cp-section + .cp-section {
          border-top: 1px solid var(--border);
        }
        .cp-section__label {
          padding: 8px 14px 4px;
          font-size: 10px; font-weight: 700;
          color: var(--text-faint);
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .cp-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 8px 14px;
          font-size: 14px; font-weight: 500; color: var(--text);
          text-align: left; cursor: pointer;
          transition: background 60ms;
        }
        .cp-item:hover, .cp-item--active { background: var(--bg-2); }
        .cp-item__icon {
          width: 28px; height: 28px; border-radius: 7px;
          background: var(--bg-2); color: var(--text-muted);
          display: grid; place-items: center; flex-shrink: 0;
          transition: background 100ms, color 100ms;
        }
        .cp-item--active .cp-item__icon {
          background: oklch(from var(--accent) l c h / 0.15);
          color: var(--accent-strong);
        }
        .cp-item__body { flex: 1; min-width: 0; }
        .cp-item__label { display: block; }
        .cp-item__sub {
          display: block;
          font-size: 11px; font-weight: 400;
          color: var(--text-faint); margin-top: 1px;
        }
        .cp-item__hint { display: flex; gap: 3px; flex-shrink: 0; }
        .cp-empty {
          padding: 28px 16px; text-align: center;
          font-size: 13px; color: var(--text-faint);
        }

        /* Footer */
        .cp-footer {
          display: flex; align-items: center; gap: 16px;
          padding: 10px 14px;
          border-top: 1px solid var(--border);
          background: var(--bg-2);
        }
        .cp-footer__hint {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: var(--text-faint);
        }

        /* Animations */
        @keyframes cpFadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes cpSlideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.985); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </>
  );
}

window.CommandPalette = CommandPalette;
