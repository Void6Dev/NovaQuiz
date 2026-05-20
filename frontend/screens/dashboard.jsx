// === Dashboard ===
const COVERS_KEY = 'quiz:covers';
function loadCovers() { try { return JSON.parse(localStorage.getItem(COVERS_KEY) || '{}'); } catch { return {}; } }
function saveCovers(c) { try { localStorage.setItem(COVERS_KEY, JSON.stringify(c)); } catch {} }

function Dashboard({ onNav }) {
  const [tab, setTab]               = useState(() => window.getQueryParams().tab === 'mine' ? 'mine' : 'explore');
  const [exploreQuizzes, setExplore] = useState([]);
  const [myQuizzes, setMine]         = useState([]);
  const [covers, setCovers]          = useState(loadCovers);
  const [loading, setLoading]        = useState(true);
  const [search, setSearch]          = useState('');
  const [authorSearch, setAuthor]    = useState('');
  const [view, setView]              = useState('grid');
  const [filter, setFilter]          = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const u = window.CURRENT_USER;

  useEffect(() => {
    Promise.all([
      window.API.get('/quizzes/'),
      window.API.get('/quizzes/?mine=1'),
    ]).then(([all, mine]) => {
      const myUsername = window.CURRENT_USER.username;
      setExplore(all.quizzes.map(window.API.fromBackendQuiz).filter(q => (q.creator?.username || '') !== myUsername));
      setMine(mine.quizzes.map(window.API.fromBackendQuiz));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const deleteQuiz = (id) => {
    window.API.post('/quizzes/' + id + '/delete/')
      .then(() => {
        setMine(qs => qs.filter(q => q.id !== id));
      })
      .catch(err => showToast(err.message, 'error'));
  };

  const duplicateQuiz = (q) => {
    window.API.post('/quizzes/' + q.id + '/duplicate/')
      .then(newQ => {
        const quiz = window.API.fromBackendQuiz(newQ);
        setMine(qs => [quiz, ...qs]);
      })
      .catch(err => showToast(err.message, 'error'));
  };

  const setCover = (id, dataURL) => {
    const next = { ...covers, [id]: dataURL };
    setCovers(next); saveCovers(next);
  };
  const clearCover = (id) => {
    const next = { ...covers }; delete next[id];
    setCovers(next); saveCovers(next);
  };

  const rawQuizzes     = tab === 'mine' ? myQuizzes : exploreQuizzes;
  const currentQuizzes = rawQuizzes.map(q => ({ ...q, cover: covers[q.id] || null }));

  const filtered = currentQuizzes.filter(q => {
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === 'explore' && authorSearch && !(q.creator?.username || '').toLowerCase().includes(authorSearch.toLowerCase())) return false;
    if (filter !== 'all' && q.status !== filter) return false;
    if (topicFilter !== 'all' && q.topic !== topicFilter) return false;
    return true;
  });

  const switchTab = (t) => { setTab(t); setSearch(''); setAuthor(''); setFilter('all'); };

  return (
    <div className="page fade-in" data-screen-label="02 Browse">
      <PageHeader
        title={tab === 'mine' ? `My quizzes` : 'Browse'}
        subtitle={tab === 'mine' ? `${myQuizzes.length} quiz${myQuizzes.length !== 1 ? 'zes' : ''} in your library.` : 'Discover public quizzes from the community.'}
      >
        {tab === 'mine' && (
          <button className="btn btn--primary" onClick={() => onNav('editor', { newQuiz: true })}>
            <Icon name="plus" size={15} /> New quiz
          </button>
        )}
      </PageHeader>

      {/* Tab switcher */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div style={{
          display: 'flex', background: 'var(--surface)', borderRadius: 'var(--r-lg)',
          border: '1px solid var(--border)', padding: 4, gap: 2,
        }}>
          {[
            { id: 'explore', label: 'Browse',     icon: 'compass' },
            { id: 'mine',    label: 'My Quizzes', icon: 'folder'  },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 7,
                background: tab === t.id ? 'var(--bg)' : 'transparent',
                boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
                color: tab === t.id ? 'var(--text)' : 'var(--text-muted)',
                transition: 'all 150ms var(--ease)',
              }}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
              {t.id === 'mine' && !loading && myQuizzes.length > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
                  background: tab === 'mine' ? 'var(--accent)' : 'var(--bg-2)',
                  color: tab === 'mine' ? 'var(--accent-fg)' : 'var(--text-faint)',
                }}>{myQuizzes.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search quizzes…" />
          {tab === 'explore' && (
            <SearchInput value={authorSearch} onChange={setAuthor} placeholder="Search by author…" />
          )}
          <div style={{
            display: 'flex', background: 'var(--surface)', borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)', padding: 3, flexShrink: 0,
          }}>
            {['all', 'live', 'draft'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px', fontSize: 13, fontWeight: 500,
                  borderRadius: 7, textTransform: 'capitalize',
                  background: filter === f ? 'var(--bg)' : 'transparent',
                  color: filter === f ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: filter === f ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 150ms var(--ease)',
                }}
              >{f}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} of {currentQuizzes.length}</span>
          <div style={{
            display: 'flex', background: 'var(--surface)', borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)', padding: 3,
          }}>
            <Tooltip label="Grid">
              <button onClick={() => setView('grid')} style={{
                padding: 6, borderRadius: 6,
                background: view === 'grid' ? 'var(--bg)' : 'transparent',
                color: view === 'grid' ? 'var(--text)' : 'var(--text-muted)',
              }}><Icon name="grid" size={15} /></button>
            </Tooltip>
            <Tooltip label="List">
              <button onClick={() => setView('list')} style={{
                padding: 6, borderRadius: 6,
                background: view === 'list' ? 'var(--bg)' : 'transparent',
                color: view === 'list' ? 'var(--text)' : 'var(--text-muted)',
              }}><Icon name="list" size={15} /></button>
            </Tooltip>
          </div>
        </div>
      </div>

      <TopicChips selected={topicFilter} onSelect={setTopicFilter} />

      {loading ? (
        <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading quizzes…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          onCreate={tab === 'mine' ? () => onNav('editor', { newQuiz: true }) : null}
          message={tab === 'mine' ? 'No quizzes yet' : 'Nothing found'}
          hint={tab === 'mine'
            ? "You haven't created any quizzes. Start with a new one!"
            : "Try a different search or filter."}
        />
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {filtered.map((q, i) => {
            const isOwn = (q.creator?.username || '') === u.username;
            return (
              <QuizCard
                key={q.id}
                quiz={q}
                isOwn={isOwn}
                onOpen={isOwn ? () => onNav('editor', { quizId: q.id }) : null}
                onPlay={() => onNav('player', { quizId: q.id })}
                onRunLive={isOwn ? () => onNav('live', { quizId: q.id }) : null}
                onDelete={isOwn ? () => setConfirmDelete(q) : null}
                onDuplicate={() => duplicateQuiz(q)}
                onSetCover={isOwn ? (dataURL) => setCover(q.id, dataURL) : null}
                onClearCover={isOwn ? () => clearCover(q.id) : null}
                delay={i * 30}
              />
            );
          })}
        </div>
      ) : (
        <QuizListView
          quizzes={filtered}
          myUsername={u.username}
          onOpen={(id) => onNav('editor', { quizId: id })}
          onPlay={(id) => onNav('player', { quizId: id })}
          onRunLive={(id) => onNav('live', { quizId: id })}
          onDelete={(q) => setConfirmDelete(q)}
          onDuplicate={(q) => duplicateQuiz(q)}
        />
      )}

      {confirmDelete && (
        <Modal width={420} onClose={() => setConfirmDelete(null)}>
          <div style={{ padding: 28 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'oklch(95% 0.04 25)', color: 'oklch(40% 0.16 25)',
              display: 'grid', placeItems: 'center', marginBottom: 18,
            }}>
              <Icon name="trash" size={20} />
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>
              Delete this quiz?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 22 }}>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>"{confirmDelete.title}"</span> will be removed from your library.
              {confirmDelete.plays > 0 && <> All <span className="mono">{confirmDelete.plays.toLocaleString()}</span> session plays remain in analytics.</>}
              {' '}This can't be undone.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn--secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: 'oklch(60% 0.20 25)', color: 'white' }}
                onClick={() => { deleteQuiz(confirmDelete.id); setConfirmDelete(null); }}
              >
                <Icon name="trash" size={14} /> Delete quiz
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// === QuizCard ===
function QuizCard({ quiz, isOwn, onOpen, onPlay, onRunLive, onDelete, onDuplicate, onSetCover, onClearCover, delay }) {
  const topic = window.TOPIC_BY_CODE[quiz.topic] || { label: quiz.topic, hue: 200 };
  const fileInput = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef(null);

  const onMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
    el.style.setProperty('--shine', '1');
  };
  const onMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--shine', '0');
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return;
    if (f.size > 4 * 1024 * 1024) { showToast('Please pick an image under 4 MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => onSetCover(reader.result);
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isOwn) return;
    const f = e.dataTransfer.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => onSetCover(reader.result);
    reader.readAsDataURL(f);
  };

  const handleCardClick = () => {
    if (onOpen) onOpen();
    else onPlay();
  };

  return (
    <div
      ref={cardRef}
      className="holo-card slide-up"
      style={{ animationDelay: `${delay}ms` }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={handleCardClick}
      onDragOver={isOwn ? (e) => { e.preventDefault(); cardRef.current?.classList.add('holo-card--drag'); } : undefined}
      onDragLeave={isOwn ? () => cardRef.current?.classList.remove('holo-card--drag') : undefined}
      onDrop={isOwn ? (e) => { cardRef.current?.classList.remove('holo-card--drag'); onDrop(e); } : undefined}
    >
      <div className="holo-card__inner">
        <div className="holo-card__cover">
          {(quiz.cover || quiz.image) ? (
            <img src={quiz.cover || quiz.image} alt="" className="holo-card__cover-img" />
          ) : (
            <CoverPlaceholder label={topic.label} hue={topic.hue} />
          )}

          <div className="holo-card__top">
            <span className="pill holo-card__status">
              {quiz.status === 'live' ? <><span className="status-dot" /> Live</> : 'Draft'}
            </span>
            {!isOwn && (
              <span className="pill holo-card__status" style={{ fontSize: 10 }}>
                <Icon name="user" size={10} /> @{quiz.creator?.username || '?'}
              </span>
            )}
          </div>

          {isOwn && (
            <div className="holo-card__actions" onClick={e => e.stopPropagation()}>
              <Tooltip label="Edit">
                <button className="holo-card__action" onClick={onOpen}>
                  <Icon name="edit" size={14} />
                </button>
              </Tooltip>
              <Tooltip label={quiz.cover ? 'Replace cover' : 'Set cover'}>
                <button className="holo-card__action" onClick={() => fileInput.current?.click()}>
                  <Icon name="image" size={14} />
                </button>
              </Tooltip>
              <div style={{ position: 'relative' }}>
                <button className="holo-card__action" onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}>
                  <Icon name="more" size={14} />
                </button>
                {menuOpen && (
                  <CardMenu
                    hasCover={!!quiz.cover}
                    onClose={() => setMenuOpen(false)}
                    onRunLive={() => { onRunLive(); setMenuOpen(false); }}
                    onDuplicate={() => { onDuplicate(); setMenuOpen(false); }}
                    onClearCover={() => { onClearCover(); setMenuOpen(false); }}
                    onDelete={() => { onDelete(); setMenuOpen(false); }}
                  />
                )}
              </div>
            </div>
          )}

          {!isOwn && (
            <div className="holo-card__actions" onClick={e => e.stopPropagation()}>
              <Tooltip label="Duplicate to my quizzes">
                <button className="holo-card__action" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                  <Icon name="copy" size={14} />
                </button>
              </Tooltip>
            </div>
          )}

          <button
            className="holo-card__play"
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
          ><Icon name="play" size={14} /></button>

          {isOwn && (
            <>
              <div className="holo-card__drop">
                <Icon name="upload" size={20} />
                <span>Drop image to set as cover</span>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={onFile}
              />
            </>
          )}

          <div className="holo-card__shine" aria-hidden />
          <div className="holo-card__foil" aria-hidden />
        </div>

        <div className="holo-card__body">
          <div className="holo-card__topic">
            <span className="holo-card__topic-dot" style={{ background: `oklch(70% 0.16 ${topic.hue})` }} />
            <span>{topic.label}</span>
            {!isOwn && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono' }}>
                @{quiz.creator?.username || '?'}
              </span>
            )}
          </div>
          <h3 className="holo-card__title">{quiz.title}</h3>
          <p className="holo-card__desc">{quiz.description}</p>
          <div className="holo-card__meta">
            <span><span className="mono holo-card__num">{quiz.questions}</span> Qs</span>
            <span className="holo-card__sep">·</span>
            <span><span className="mono holo-card__num">{quiz.plays.toLocaleString()}</span> plays</span>
            {quiz.avgScore != null && (
              <>
                <span className="holo-card__sep">·</span>
                <span><span className="mono holo-card__num">{quiz.avgScore}%</span> avg</span>
              </>
            )}
            <span className="holo-card__edited">{quiz.lastEdited}</span>
          </div>
        </div>
      </div>

      <HoloCardStyles />
    </div>
  );
}

function CardMenu({ onRunLive, onDuplicate, onClearCover, onDelete, hasCover, onClose }) {
  useEffect(() => {
    const fn = () => onClose();
    window.addEventListener('click', fn);
    return () => window.removeEventListener('click', fn);
  }, [onClose]);
  return (
    <div className="card scale-in" onClick={e => e.stopPropagation()} style={{
      position: 'absolute', right: 0, top: 'calc(100% + 6px)',
      minWidth: 180, padding: 4, boxShadow: 'var(--shadow-lg)',
      zIndex: 20,
    }}>
      <MenuItem icon="bolt"  label="Run live"  onClick={onRunLive} />
      <MenuItem icon="copy"  label="Duplicate" onClick={onDuplicate} />
      {hasCover && <MenuItem icon="x" label="Remove cover" onClick={onClearCover} />}
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <MenuItem icon="trash" label="Delete" danger onClick={onDelete} />
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '8px 10px',
        borderRadius: 7, display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 13, fontWeight: 500,
        color: danger ? 'oklch(55% 0.18 25)' : 'var(--text)',
        textAlign: 'left', transition: 'background 100ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'oklch(96% 0.04 25)' : 'var(--bg-2)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <Icon name={icon} size={14} /> {label}
    </button>
  );
}

function HoloCardStyles() {
  return (
    <style>{`
      .holo-card {
        --mx: 50%; --my: 50%; --rx: 0deg; --ry: 0deg; --shine: 0;
        position: relative; cursor: pointer;
        border-radius: var(--r-lg);
        transform-style: preserve-3d; perspective: 900px;
        transition: transform 400ms var(--ease);
      }
      .holo-card__inner {
        position: relative;
        background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--r-lg); overflow: hidden;
        display: flex; flex-direction: column;
        transform: perspective(900px) rotateX(var(--rx)) rotateY(var(--ry));
        transition: transform 220ms var(--ease), box-shadow 220ms var(--ease), border-color 200ms;
        will-change: transform;
      }
      .holo-card:hover .holo-card__inner {
        box-shadow: 0 24px 48px oklch(0% 0 0 / 0.12), 0 8px 16px oklch(0% 0 0 / 0.06),
          0 0 0 1px oklch(from var(--accent) l c h / calc(0.35 * var(--shine)));
        border-color: oklch(from var(--accent) l c h / 0.4);
      }
      [data-theme="dark"] .holo-card:hover .holo-card__inner {
        box-shadow: 0 30px 60px oklch(0% 0 0 / 0.6),
          0 0 0 1px oklch(from var(--accent) l c h / calc(0.4 * var(--shine)));
      }
      .holo-card__cover {
        position: relative; aspect-ratio: 16/9;
        overflow: hidden; background: var(--bg-2);
      }
      .holo-card__cover-img {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; display: block;
      }
      .holo-card__top {
        position: absolute; top: 12px; left: 12px;
        display: flex; gap: 6px; z-index: 3;
      }
      .holo-card__status {
        background: oklch(100% 0 0 / 0.92); backdrop-filter: blur(8px);
        color: oklch(20% 0 0); border: 0;
      }
      .status-dot {
        width: 6px; height: 6px; border-radius: 99px;
        background: oklch(60% 0.18 145); display: inline-block;
        box-shadow: 0 0 0 0 oklch(60% 0.18 145 / 0.6);
        animation: holoPulse 1.8s ease-out infinite;
      }
      @keyframes holoPulse {
        0%   { box-shadow: 0 0 0 0   oklch(60% 0.18 145 / 0.5); }
        100% { box-shadow: 0 0 0 6px oklch(60% 0.18 145 / 0);   }
      }
      .holo-card__actions {
        position: absolute; top: 10px; right: 10px;
        display: flex; gap: 4px; z-index: 4;
        opacity: 0; transform: translateY(-4px);
        transition: opacity 180ms var(--ease), transform 180ms var(--ease);
        pointer-events: none;
      }
      .holo-card:hover .holo-card__actions {
        opacity: 1; transform: none; pointer-events: auto;
      }
      .holo-card__action {
        width: 30px; height: 30px; border-radius: 8px;
        background: oklch(100% 0 0 / 0.92); backdrop-filter: blur(10px);
        color: oklch(20% 0 0); display: grid; place-items: center;
        box-shadow: var(--shadow-sm);
        transition: transform 120ms var(--ease), background 120ms;
      }
      .holo-card__action:hover { background: white; transform: translateY(-1px); }
      .holo-card__play {
        position: absolute; bottom: 12px; right: 12px;
        width: 38px; height: 38px; border-radius: 999px;
        background: oklch(100% 0 0 / 0.96); color: oklch(15% 0 0);
        display: grid; place-items: center;
        box-shadow: var(--shadow-md);
        transition: transform 150ms var(--ease); z-index: 3;
      }
      .holo-card__play:hover { transform: scale(1.08); }
      .holo-card__drop {
        position: absolute; inset: 0;
        background: oklch(from var(--accent) l c h / 0.85); color: var(--accent-fg);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 10px; font-size: 13px; font-weight: 600; letter-spacing: -0.01em;
        opacity: 0; pointer-events: none;
        transition: opacity 150ms var(--ease); z-index: 5;
      }
      .holo-card--drag .holo-card__drop { opacity: 1; }
      .holo-card--drag .holo-card__inner { border-color: var(--accent-strong); }
      .holo-card__shine {
        position: absolute; inset: 0; pointer-events: none;
        background: radial-gradient(circle 280px at var(--mx) var(--my),
          oklch(100% 0 0 / 0.45), oklch(100% 0 0 / 0.15) 25%, transparent 55%);
        mix-blend-mode: overlay;
        opacity: calc(var(--shine) * 0.95);
        transition: opacity 280ms var(--ease); z-index: 2;
      }
      .holo-card__foil {
        position: absolute; inset: 0; pointer-events: none;
        background: conic-gradient(from calc(var(--ry) * 16deg) at var(--mx) var(--my),
          oklch(82% 0.20 30), oklch(85% 0.20 80), oklch(85% 0.22 145),
          oklch(82% 0.20 220), oklch(78% 0.22 290), oklch(82% 0.20 350), oklch(82% 0.20 30));
        -webkit-mask: radial-gradient(circle 220px at var(--mx) var(--my), black, transparent 70%);
                mask: radial-gradient(circle 220px at var(--mx) var(--my), black, transparent 70%);
        mix-blend-mode: color-dodge;
        opacity: calc(var(--shine) * 0.30);
        transition: opacity 280ms var(--ease); z-index: 2;
      }
      [data-theme="dark"] .holo-card__foil { mix-blend-mode: overlay; opacity: calc(var(--shine) * 0.45); }
      .holo-card__body {
        padding: 14px 18px 18px; display: flex; flex-direction: column; gap: 4px;
        position: relative; z-index: 1;
      }
      .holo-card__topic {
        display: flex; align-items: center; gap: 6px;
        font-size: 11px; color: var(--text-faint);
        text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin-bottom: 4px;
      }
      .holo-card__topic-dot { width: 6px; height: 6px; border-radius: 99px; }
      .holo-card__title {
        font-size: 16px; font-weight: 600; letter-spacing: -0.015em;
        margin-bottom: 4px; text-wrap: pretty;
        background: linear-gradient(180deg, var(--text), var(--text) 60%, oklch(from var(--text) calc(l + 0.05) c h));
        -webkit-background-clip: text; background-clip: text;
      }
      .holo-card__desc {
        font-size: 13px; color: var(--text-muted); line-height: 1.45;
        margin-bottom: 12px; height: 36px; overflow: hidden; text-wrap: pretty;
      }
      .holo-card__meta {
        display: flex; align-items: center; gap: 10px;
        font-size: 12px; color: var(--text-faint);
      }
      .holo-card__sep { opacity: 0.6; }
      .holo-card__num { color: var(--text); font-weight: 600; }
      .holo-card__edited { margin-left: auto; }
    `}</style>
  );
}

// === List view ===
function QuizListView({ quizzes, myUsername, onOpen, onPlay, onRunLive, onDelete, onDuplicate }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.6fr 0.6fr 0.8fr 0.8fr 130px',
        gap: 16, padding: '12px 20px',
        background: 'var(--bg-2)', borderBottom: '1px solid var(--border)',
        fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: 'var(--text-muted)', fontWeight: 600,
      }}>
        <div>Title</div><div>Author</div><div>Status</div><div>Qs</div><div>Plays</div><div>Updated</div><div />
      </div>
      {quizzes.map(q => {
        const topic  = window.TOPIC_BY_CODE[q.topic] || { label: q.topic, hue: 200 };
        const isOwn  = (q.creator?.username || '') === myUsername;
        return (
          <div
            key={q.id}
            onClick={() => isOwn ? onOpen(q.id) : onPlay(q.id)}
            className="quiz-row"
            style={{
              display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.6fr 0.6fr 0.8fr 0.8fr 130px',
              gap: 16, padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              alignItems: 'center', cursor: 'pointer',
              transition: 'background 100ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)' }}>
                {(q.cover || q.image)
                  ? <img src={q.cover || q.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <CoverPlaceholder label="" hue={topic.hue} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{q.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{topic.label}</div>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              @{q.creator?.username || '—'}
            </div>
            <div>
              <span className="pill pill--dot" style={q.status === 'live' ? { color: 'oklch(50% 0.15 145)' } : {}}>
                {q.status}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 13 }}>{q.questions}</div>
            <div className="mono" style={{ fontSize: 13 }}>{q.plays.toLocaleString()}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{q.lastEdited}</div>
            <div className="quiz-row__actions" onClick={e => e.stopPropagation()}>
              <Tooltip label="Practice"><button className="btn btn--ghost btn--icon" onClick={() => onPlay(q.id)}><Icon name="play" size={14} /></button></Tooltip>
              {isOwn && <>
                <Tooltip label="Run live"><button className="btn btn--ghost btn--icon" onClick={() => onRunLive(q.id)}><Icon name="bolt" size={14} /></button></Tooltip>
                <Tooltip label="Edit"><button className="btn btn--ghost btn--icon" onClick={() => onOpen(q.id)}><Icon name="edit" size={14} /></button></Tooltip>
                <Tooltip label="Delete"><button className="btn btn--ghost btn--icon" style={{ color: 'oklch(55% 0.18 25)' }} onClick={() => onDelete(q)}><Icon name="trash" size={14} /></button></Tooltip>
              </>}
              <Tooltip label="Duplicate"><button className="btn btn--ghost btn--icon" onClick={() => onDuplicate(q)}><Icon name="copy" size={14} /></button></Tooltip>
            </div>
          </div>
        );
      })}

      <style>{`
        .quiz-row:hover { background: var(--bg-2); }
        .quiz-row__actions {
          display: flex; gap: 2px; justify-content: flex-end;
          opacity: 0.35; transition: opacity 150ms;
        }
        .quiz-row:hover .quiz-row__actions { opacity: 1; }
      `}</style>
    </div>
  );
}

function CreditsStat({ credits }) {
  return (
    <div className="card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -10, left: -10,
        width: 100, height: 100, borderRadius: 999,
        background: 'oklch(85% 0.18 130 / 0.15)', filter: 'blur(20px)',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, position: 'relative' }}>
        <Icon name="star" size={13} style={{ color: 'var(--accent-strong)' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your credits</span>
      </div>
      <div className="mono" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, position: 'relative' }}>{credits.toLocaleString()}</div>
      <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>+5 per correct · +1 first-bonus</div>
    </div>
  );
}

function TopicChips({ selected, onSelect }) {
  const TOPICS = window.TOPICS;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
      <button
        onClick={() => onSelect('all')}
        className="pill"
        style={{
          cursor: 'pointer',
          background: selected === 'all' ? 'var(--text)' : 'var(--surface)',
          color: selected === 'all' ? 'var(--bg)' : 'var(--text-muted)',
          borderColor: selected === 'all' ? 'var(--text)' : 'var(--border)',
          padding: '6px 12px', fontSize: 12,
        }}
      >All topics</button>
      {TOPICS.map(t => (
        <button
          key={t.code}
          onClick={() => onSelect(t.code)}
          className="pill"
          style={{
            cursor: 'pointer',
            background: selected === t.code ? 'var(--text)' : 'var(--surface)',
            color: selected === t.code ? 'var(--bg)' : 'var(--text-muted)',
            borderColor: selected === t.code ? 'var(--text)' : 'var(--border)',
            padding: '6px 12px', fontSize: 12,
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 99, background: `oklch(70% 0.16 ${t.hue})`, display: 'inline-block' }} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ onCreate, message, hint }) {
  return (
    <div style={{
      padding: '80px 20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', gap: 14,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'var(--surface)', border: '1px solid var(--border)',
        display: 'grid', placeItems: 'center', color: 'var(--text-faint)',
      }}>
        <Icon name="folder" size={24} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{message || 'Nothing here'}</h3>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.5 }}>
        {hint || 'Try a different filter.'}
      </p>
      {onCreate && (
        <button className="btn btn--primary" style={{ marginTop: 8 }} onClick={onCreate}>
          <Icon name="plus" size={14} /> New quiz
        </button>
      )}
    </div>
  );
}

window.Dashboard = Dashboard;
