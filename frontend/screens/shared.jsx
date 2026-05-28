// === Shared With Me ===
function SharedWithMe({ onNav }) {
  window.useLang();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [view, setView]       = useState('grid');
  const u = window.CURRENT_USER;

  useEffect(() => {
    window.API.get('/quizzes/?shared=1')
      .then(data => setQuizzes(data.quizzes.map(window.API.fromBackendQuiz)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const duplicateQuiz = (q) => {
    window.API.post('/quizzes/' + q.id + '/duplicate/')
      .then(newQ => {
        window.navigate('editor', { quizId: newQ.id });
      })
      .catch(err => showToast(err.message, 'error'));
  };

  const filtered = quizzes.filter(q => {
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (topicFilter !== 'all' && q.topic !== topicFilter) return false;
    return true;
  });

  return (
    <div className="page fade-in" data-screen-label="Shared with me">
      <PageHeader title={t('shared.title')} subtitle={t('shared.subtitle')} />

      {!loading && quizzes.length === 0 ? (
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
            <Icon name="users" size={24} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{t('shared.no_title')}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.5 }}>
            {t('shared.no_hint')}
          </p>
          <button className="btn btn--secondary" style={{ marginTop: 8 }} onClick={() => onNav('settings')}>
            <Icon name="users" size={14} /> {t('shared.go_ws')}
          </button>
        </div>
      ) : (
        <>
          <div className="toolbar-row">
            <div className="toolbar-row__left">
              <SearchInput value={search} onChange={setSearch} placeholder={t('shared.search')} />
            </div>
            <div className="toolbar-row__right">
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} {t('shared.of')} {quizzes.length}</span>
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
            <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>{t('shared.loading')}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              {t('shared.no_match')}
            </div>
          ) : view === 'grid' ? (
            <div className="quiz-grid">
              {filtered.map((q, i) => (
                <QuizCard
                  key={q.id}
                  quiz={q}
                  isOwn={false}
                  onPlay={() => onNav('player', { quizId: q.id })}
                  onDuplicate={() => duplicateQuiz(q)}
                  delay={i * 30}
                />
              ))}
            </div>
          ) : (
            <QuizListView
              quizzes={filtered}
              myUsername={u.username}
              onOpen={() => {}}
              onPlay={(id) => onNav('player', { quizId: id })}
              onRunLive={() => {}}
              onDelete={() => {}}
              onDuplicate={(q) => duplicateQuiz(q)}
            />
          )}
        </>
      )}
    </div>
  );
}

window.SharedWithMe = SharedWithMe;
