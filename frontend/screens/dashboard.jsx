// === Dashboard ===
const COVERS_KEY = 'quiz:covers';
function loadCovers() { try { return JSON.parse(localStorage.getItem(COVERS_KEY) || '{}'); } catch { return {}; } }
function saveCovers(c) { try { localStorage.setItem(COVERS_KEY, JSON.stringify(c)); } catch {} }

const COVER_TRANSFORMS_KEY = 'quiz:cover_transforms';
function loadCoverTransforms() { try { return JSON.parse(localStorage.getItem(COVER_TRANSFORMS_KEY) || '{}'); } catch { return {}; } }
function saveCoverTransforms(c) { try { localStorage.setItem(COVER_TRANSFORMS_KEY, JSON.stringify(c)); } catch {} }

function Dashboard({ onNav }) {
  window.useLang();
  const [tab, setTab]               = useState(() => { const q = window.getQueryParams().tab; return q === 'mine' ? 'mine' : q === 'shared' ? 'shared' : 'explore'; });
  const [exploreQuizzes, setExplore] = useState([]);
  const [myQuizzes, setMine]         = useState([]);
  const [sharedQuizzes, setShared]   = useState([]);
  const [covers, setCovers]               = useState(loadCovers);
  const [coverTransforms, setCoverTransforms] = useState(loadCoverTransforms);
  const [cropCoverId, setCropCoverId]     = useState(null);
  const [loading, setLoading]        = useState(true);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [search, setSearch]          = useState('');
  const [authorSearch, setAuthor]    = useState('');
  const [view, setView]              = useState('grid');
  const [filter, setFilter]          = useState('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const u = window.CURRENT_USER;
  const exploreTimerRef = useRef(null);

  // Mine + shared load once on mount
  useEffect(() => {
    Promise.all([
      window.API.get('/quizzes/?mine=1'),
      window.API.get('/quizzes/?shared=1'),
    ]).then(([mine, shared]) => {
      setMine(mine.quizzes.map(window.API.fromBackendQuiz));
      setShared(shared.quizzes.map(window.API.fromBackendQuiz));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Explore: server-side search + topic, debounced
  useEffect(() => {
    if (tab !== 'explore') return;
    clearTimeout(exploreTimerRef.current);
    setExploreLoading(true);
    const myUsername = window.CURRENT_USER.username;
    exploreTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (topicFilter !== 'all') params.set('topic', topicFilter);
      const qs = params.toString();
      window.API.get('/quizzes/' + (qs ? '?' + qs : ''))
        .then(data => {
          setExplore(data.quizzes.map(window.API.fromBackendQuiz).filter(q => (q.creator?.username || '') !== myUsername));
          setExploreLoading(false);
        })
        .catch(() => setExploreLoading(false));
    }, search ? 300 : 0);
    return () => clearTimeout(exploreTimerRef.current);
  }, [search, topicFilter, tab]);

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

  const togglePublic = (q) => {
    const next = !q.is_public;
    setMine(qs => qs.map(x =>
      x.id === q.id ? { ...x, is_public: next, status: next ? 'live' : 'draft' } : x
    ));
    window.API.post('/quizzes/' + q.id + '/update/', {
      title: q.title, topic: q.topic, description: q.description, is_public: next,
    }).catch(err => {
      setMine(qs => qs.map(x => x.id === q.id ? { ...x, is_public: q.is_public, status: q.status } : x));
      showToast(err.message, 'error');
    });
  };

  const setCover = (id, dataURL) => {
    const next = { ...covers, [id]: dataURL };
    setCovers(next); saveCovers(next);
    setCropCoverId(id);
  };
  const clearCover = (id) => {
    const nc = { ...covers }; delete nc[id];
    const nt = { ...coverTransforms }; delete nt[id];
    setCovers(nc); saveCovers(nc);
    setCoverTransforms(nt); saveCoverTransforms(nt);
  };
  const saveCoverTransform = (id, tr) => {
    const next = { ...coverTransforms, [id]: tr };
    setCoverTransforms(next); saveCoverTransforms(next);
  };

  const rawQuizzes     = tab === 'mine' ? myQuizzes : tab === 'shared' ? sharedQuizzes : exploreQuizzes;
  const currentQuizzes = rawQuizzes.map(q => ({ ...q, cover: covers[q.id] || null, localCoverTransform: coverTransforms[q.id] || null }));

  const filtered = currentQuizzes.filter(q => {
    if (tab === 'explore') {
      // search + topicFilter handled server-side; only filter author + status client-side
      if (authorSearch && !(q.creator?.username || '').toLowerCase().includes(authorSearch.toLowerCase())) return false;
      if (filter !== 'all' && q.status !== filter) return false;
    } else {
      if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter !== 'all' && q.status !== filter) return false;
      if (topicFilter !== 'all' && q.topic !== topicFilter) return false;
    }
    return true;
  });

  const switchTab = (t) => { setTab(t); setSearch(''); setAuthor(''); setFilter('all'); };

  return (
    <div className="page fade-in" {...screenLabel('02 Browse')}>
      <PageHeader
        title={tab === 'mine' ? t('dash.title_mine') : t('dash.title_browse')}
        subtitle={tab === 'mine' ? `${myQuizzes.length} ${t('dash.sub_mine')}` : t('dash.sub_browse')}
      >
        {tab === 'mine' && (
          <button className="btn btn--primary" onClick={() => onNav('editor', { newQuiz: true })}>
            <Icon name="plus" size={15} /> {t('dash.new_quiz')}
          </button>
        )}
      </PageHeader>

      {/* Tab switcher */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <SegmentedControl
          size="lg"
          ariaLabel="Browse, my quizzes or shared"
          value={tab}
          onChange={switchTab}
          options={[
            { value: 'explore', label: t('dash.tab_browse'), icon: 'compass' },
            { value: 'mine',    label: t('dash.tab_mine'),   icon: 'folder',
              badge: !loading && myQuizzes.length > 0 ? myQuizzes.length : undefined },
            { value: 'shared',  label: t('nav.shared'),      icon: 'users' },
          ]}
        />
      </div>

      {/* Toolbar */}
      <div className="toolbar-row">
        <div className="toolbar-row__left">
          <SearchInput value={search} onChange={setSearch} placeholder={t('dash.search')} />
          {tab === 'explore' && (
            <SearchInput value={authorSearch} onChange={setAuthor} placeholder={t('dash.search_author')} />
          )}
          {tab !== 'shared' && (
            <SegmentedControl
              ariaLabel="Filter by status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all',   label: t('dash.all') },
                { value: 'live',  label: t('dash.status_live') },
                { value: 'draft', label: t('dash.status_draft') },
              ]}
            />
          )}
        </div>

        <div className="toolbar-row__right">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} of {currentQuizzes.length}</span>
          <SegmentedControl
            size="sm"
            ariaLabel="View as grid or list"
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', icon: 'grid', iconSize: 15, tooltip: 'Grid' },
              { value: 'list', icon: 'list', iconSize: 15, tooltip: 'List' },
            ]}
          />
        </div>
      </div>

      <TopicChips selected={topicFilter} onSelect={setTopicFilter} />

      {loading || (tab === 'explore' && exploreLoading) ? (
        <div className="quiz-grid">
          {Array.from({ length: 8 }, (_, i) => <QuizCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          onCreate={tab === 'mine' ? () => onNav('editor', { newQuiz: true }) : null}
          message={tab === 'mine' ? t('dash.empty_mine') : tab === 'shared' ? t('shared.no_title') : t('dash.empty_browse')}
          hint={tab === 'mine' ? t('dash.empty_mine_hint') : tab === 'shared' ? t('shared.no_hint') : t('dash.empty_hint')}
        />
      ) : view === 'grid' ? (
        <div className="quiz-grid">
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
                onCropCover={isOwn && (q.cover || q.image) ? () => setCropCoverId(q.id) : null}
                onTogglePublic={isOwn ? () => togglePublic(q) : null}
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
          onTogglePublic={(q) => togglePublic(q)}
        />
      )}

      {cropCoverId && (() => {
        const cq = currentQuizzes.find(q => q.id === cropCoverId);
        const coverUrl = cq && (cq.cover || cq.image);
        if (!coverUrl) { setCropCoverId(null); return null; }
        const currentTr = cq.cover ? cq.localCoverTransform : cq.coverTransform;
        return (
          <ImageCropModal
            imageUrl={coverUrl}
            transform={currentTr}
            aspectRatio={16 / 9}
            onSave={newTr => {
              if (cq.cover) {
                saveCoverTransform(cropCoverId, newTr);
              } else {
                window.API.post('/quizzes/' + cropCoverId + '/update/', { cover_transform: JSON.stringify(newTr) }).catch(() => {});
              }
              setCropCoverId(null);
            }}
            onClose={() => setCropCoverId(null)}
          />
        );
      })()}

      {confirmDelete && (
        <Modal width={420} onClose={() => setConfirmDelete(null)}>
          <div style={{ padding: 28 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--danger-soft)', color: 'var(--danger-text)',
              display: 'grid', placeItems: 'center', marginBottom: 18,
            }}>
              <Icon name="trash" size={20} />
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>
              {t('dash.delete_title')}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 22 }}>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>"{confirmDelete.title}"</span> {t('dash.delete_msg')}
              {confirmDelete.plays > 0 && <> <span className="mono">{confirmDelete.plays.toLocaleString()}</span> {t('dash.delete_plays')}</>}
              {' '}{t('dash.cant_undo')}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn--secondary" onClick={() => setConfirmDelete(null)}>{t('dash.cancel')}</button>
              <button
                className="btn"
                style={{ background: 'var(--danger)', color: 'var(--danger-fg)' }}
                onClick={() => { deleteQuiz(confirmDelete.id); setConfirmDelete(null); }}
              >
                <Icon name="trash" size={14} /> {t('dash.delete_confirm')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// === QuizCard skeleton ===
function QuizCardSkeleton() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <div className="skel" style={{ aspectRatio: '16/9' }} />
      <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skel" style={{ height: 10, width: '38%' }} />
        <div className="skel" style={{ height: 16, width: '78%' }} />
        <div className="skel" style={{ height: 12, width: '56%' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <div className="skel" style={{ height: 10, width: 40 }} />
          <div className="skel" style={{ height: 10, width: 40 }} />
        </div>
      </div>
    </div>
  );
}

// === QuizCard ===
function QuizCard({ quiz, isOwn, onOpen, onPlay, onRunLive, onDelete, onDuplicate, onSetCover, onClearCover, onCropCover, onTogglePublic, delay }) {
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
      className={`holo-card slide-up${isOwn && !quiz.is_public ? ' holo-card--private' : ''}`}
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
          {(quiz.cover || quiz.image) ? (() => {
            const coverUrl = quiz.cover || quiz.image;
            const coverTr = quiz.cover ? quiz.localCoverTransform : quiz.coverTransform;
            return (
              <div style={{ ...window.applyImageTransform(coverUrl, coverTr, 16 / 9) }} />
            );
          })() : (
            <CoverPlaceholder label={topic.label} hue={topic.hue} />
          )}

          <div className="holo-card__top">
            {isOwn ? (
              <span className={`pill holo-card__status${!quiz.is_public ? ' holo-card__status--private' : ''}`}>
                {quiz.is_public
                  ? <><span className="status-dot" />{t('dash.vis_public')}</>
                  : <><Icon name="lock" size={10} />{t('dash.vis_private')}</>
                }
              </span>
            ) : (
              <span className="pill holo-card__status">
                {quiz.is_public
                  ? <><span className="status-dot" />{t('dash.vis_public')}</>
                  : 'Draft'
                }
              </span>
            )}
            {!isOwn && (
              <span className="pill holo-card__status" style={{ fontSize: 10 }}>
                <Icon name="user" size={10} /> @{quiz.creator?.username || '?'}
              </span>
            )}
          </div>

          {isOwn && (
            <div className="holo-card__actions" onClick={e => e.stopPropagation()}>
              <Tooltip label={t('dash.edit')}>
                <button className="holo-card__action" onClick={onOpen}>
                  <Icon name="edit" size={14} />
                </button>
              </Tooltip>
              <Tooltip label={quiz.is_public ? t('dash.make_private') : t('dash.make_public')}>
                <button
                  className={`holo-card__action${!quiz.is_public ? ' holo-card__action--lock' : ''}`}
                  onClick={() => onTogglePublic()}
                >
                  <Icon name={quiz.is_public ? 'globe' : 'lock'} size={14} />
                </button>
              </Tooltip>
              <Tooltip label={quiz.cover ? t('dash.replace_cover') : t('dash.set_cover')}>
                <button className="holo-card__action" onClick={() => fileInput.current?.click()}>
                  <Icon name="image" size={14} />
                </button>
              </Tooltip>
              {onCropCover && (
                <Tooltip label={t('ui.crop_title')}>
                  <button className="holo-card__action" onClick={onCropCover}>
                    <Icon name="crop" size={14} />
                  </button>
                </Tooltip>
              )}
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
              <Tooltip label={t('dash.dup_mine')}>
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
                <span>{t('dash.drop_cover')}</span>
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
            <span><span className="mono holo-card__num">{quiz.plays.toLocaleString()}</span> {t('dash.plays')}</span>
            {quiz.avgScore != null && (
              <>
                <span className="holo-card__sep">·</span>
                <span><span className="mono holo-card__num">{quiz.avgScore}%</span> {t('dash.avg')}</span>
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
      <MenuItem icon="bolt"  label={t('dash.run_live')}     onClick={onRunLive} />
      <MenuItem icon="copy"  label={t('dash.duplicate')}    onClick={onDuplicate} />
      {hasCover && <MenuItem icon="x" label={t('dash.remove_cover')} onClick={onClearCover} />}
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      <MenuItem icon="trash" label={t('dash.delete')} danger onClick={onDelete} />
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
        color: danger ? 'var(--danger-text)' : 'var(--text)',
        textAlign: 'left', transition: 'background 100ms',
      }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'var(--danger-soft)' : 'var(--bg-2)'}
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
        transition: transform 220ms var(--ease), box-shadow 220ms var(--ease), border-color 380ms var(--ease);
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
        transition: color 300ms var(--ease);
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
        transition: transform 120ms var(--ease), background 200ms, color 250ms var(--ease);
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

      /* Private card — red border glow */
      .holo-card--private .holo-card__inner {
        border-color: oklch(72% 0.14 25 / 0.45);
      }
      .holo-card--private:hover .holo-card__inner {
        border-color: oklch(62% 0.20 25 / 0.65);
        box-shadow: 0 24px 48px oklch(0% 0 0 / 0.12), 0 8px 16px oklch(0% 0 0 / 0.06),
          0 0 0 1px oklch(62% 0.20 25 / 0.28);
      }
      [data-theme="dark"] .holo-card--private:hover .holo-card__inner {
        box-shadow: 0 30px 60px oklch(0% 0 0 / 0.55),
          0 0 0 1px oklch(62% 0.20 25 / 0.40);
      }

      /* Lock action button — same glass, just red icon */
      .holo-card__action--lock {
        color: oklch(50% 0.20 25) !important;
      }
      .holo-card__action--lock:hover {
        color: oklch(38% 0.22 25) !important;
      }

      /* Private status pill — same glass, just red text */
      .holo-card__status--private {
        color: oklch(48% 0.20 25) !important;
      }
      [data-theme="dark"] .holo-card__status--private {
        color: oklch(68% 0.16 25) !important;
      }

    `}</style>
  );
}

// === List view ===
function QuizListView({ quizzes, myUsername, onOpen, onPlay, onRunLive, onDelete, onDuplicate, onTogglePublic }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="quiz-list-header">
        <div>{t('dash.col_title')}</div>
        <div className="qlc-meta">{t('dash.col_author')}</div>
        <div className="qlc-meta">{t('dash.col_status')}</div>
        <div className="qlc-meta">{t('dash.col_qs')}</div>
        <div className="qlc-meta">{t('dash.col_plays')}</div>
        <div className="qlc-meta">{t('dash.col_updated')}</div>
        <div />
      </div>
      {quizzes.map(q => {
        const topic  = window.TOPIC_BY_CODE[q.topic] || { label: q.topic, hue: 200 };
        const isOwn  = (q.creator?.username || '') === myUsername;
        return (
          <div
            key={q.id}
            onClick={() => isOwn ? onOpen(q.id) : onPlay(q.id)}
            className="quiz-row"
          >
            <div className="qlc-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-2)', position: 'relative' }}>
                {(q.cover || q.image) ? (() => {
                  const coverUrl = q.cover || q.image;
                  const coverTr = q.cover ? q.localCoverTransform : q.coverTransform;
                  return <div style={window.applyImageTransform(coverUrl, coverTr, 1)} />;
                })() : <CoverPlaceholder label="" hue={topic.hue} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{q.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{topic.label}</div>
              </div>
            </div>
            <div className="qlc-meta mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              @{q.creator?.username || '—'}
            </div>
            <div className="qlc-meta">
              {isOwn ? (
                q.is_public ? (
                  <span className="pill pill--dot" style={{ color: 'oklch(50% 0.15 145)' }}>
                    {t('dash.vis_public')}
                  </span>
                ) : (
                  <span className="pill" style={{ color: 'var(--danger-text)', background: 'var(--danger-soft)', borderColor: 'var(--danger-soft-border)' }}>
                    <Icon name="lock" size={10} />{t('dash.vis_private')}
                  </span>
                )
              ) : (
                <span className="pill pill--dot" style={q.is_public ? { color: 'oklch(50% 0.15 145)' } : {}}>
                  {q.status}
                </span>
              )}
            </div>
            <div className="qlc-meta mono" style={{ fontSize: 13 }}>{q.questions}</div>
            <div className="qlc-meta mono" style={{ fontSize: 13 }}>{q.plays.toLocaleString()}</div>
            <div className="qlc-meta" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{q.lastEdited}</div>
            <div className="quiz-row__actions" onClick={e => e.stopPropagation()}>
              <Tooltip label={t('dash.practice')}><button className="btn btn--ghost btn--icon" onClick={() => onPlay(q.id)}><Icon name="play" size={14} /></button></Tooltip>
              {isOwn && <>
                <Tooltip label={t('dash.run_live')}><button className="btn btn--ghost btn--icon" onClick={() => onRunLive(q.id)}><Icon name="bolt" size={14} /></button></Tooltip>
                <Tooltip label={t('dash.edit')}><button className="btn btn--ghost btn--icon" onClick={() => onOpen(q.id)}><Icon name="edit" size={14} /></button></Tooltip>
                <Tooltip label={q.is_public ? t('dash.make_private') : t('dash.make_public')}>
                  <button
                    className="btn btn--ghost btn--icon"
                    style={!q.is_public ? { color: 'var(--danger-text)' } : {}}
                    onClick={() => onTogglePublic(q)}
                  >
                    <Icon name={q.is_public ? 'globe' : 'lock'} size={14} />
                  </button>
                </Tooltip>
                <Tooltip label={t('dash.delete')}><button className="btn btn--ghost btn--icon" style={{ color: 'var(--danger-text)' }} onClick={() => onDelete(q)}><Icon name="trash" size={14} /></button></Tooltip>
              </>}
              <Tooltip label={t('dash.duplicate')}><button className="btn btn--ghost btn--icon" onClick={() => onDuplicate(q)}><Icon name="copy" size={14} /></button></Tooltip>
            </div>
          </div>
        );
      })}

      <style>{`
        /* Desktop: full 7-column grid */
        .quiz-list-header,
        .quiz-row {
          display: grid;
          grid-template-columns: 2fr 0.7fr 0.6fr 0.6fr 0.8fr 0.8fr 130px;
          gap: 16px; padding: 12px 20px; align-items: center;
        }
        .quiz-list-header {
          background: var(--bg-2); border-bottom: 1px solid var(--border);
          font-size: 11px; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--text-muted); font-weight: 600;
        }
        .quiz-row {
          padding: 14px 20px; border-bottom: 1px solid var(--border);
          cursor: pointer; transition: background 100ms;
        }
        .quiz-row:hover { background: var(--bg-2); }
        .quiz-row__actions {
          display: flex; gap: 2px; justify-content: flex-end;
          opacity: 0.35; transition: opacity 150ms;
        }
        .quiz-row:hover .quiz-row__actions { opacity: 1; }

        /* Mobile: 2-col card — title + actions */
        @media (max-width: 768px) {
          .quiz-list-header { display: none; }
          .quiz-row {
            display: flex; flex-wrap: wrap;
            gap: 6px; padding: 12px 14px; align-items: center;
          }
          .qlc-title { flex: 1; min-width: 0; }
          .qlc-meta { display: none; }
          .quiz-row__actions {
            opacity: 1; flex-shrink: 0;
            gap: 0;
          }
        }
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
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('dash.your_credits')}</span>
      </div>
      <div className="mono" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, position: 'relative' }}>{credits.toLocaleString()}</div>
      <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{t('dash.credits_hint')}</div>
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
      >{t('dash.all_topics')}</button>
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
          <Icon name="plus" size={14} /> {t('dash.new_quiz')}
        </button>
      )}
    </div>
  );
}

window.Dashboard = Dashboard;
