// === Quiz Detail Page ===

function _relTime(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)    return 'just now';
  if (s < 3600)  return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString();
}

function _md(text) {
  if (!text) return '';
  if (window.marked) return window.marked.parse(text);
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Small avatar ─────────────────────────────────────────────────────────────
function SmallAvatar({ username, avatar, avatarTransform, size = 28 }) {
  if (avatar) {
    return (
      <div style={{ width: size, height: size, borderRadius: 999, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
        <div style={window.applyImageTransform(avatar, window.API.parseTransform(avatarTransform), 1)} />
      </div>
    );
  }
  const hue = (username || '').split('').reduce((h, c) => (h * 37 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0,
      background: `oklch(68% 0.16 ${hue})`, color: 'white',
      display: 'grid', placeItems: 'center',
      fontSize: Math.floor(size * 0.4), fontWeight: 700,
    }}>{(username || '?').slice(0, 2).toUpperCase()}</div>
  );
}

// ── Vote bar (👍 / 👎) ───────────────────────────────────────────────────────
function QuizVoteBar({ quizId, initialLikes, initialDislikes, initialMyVote }) {
  const [likes, setLikes]     = useState(initialLikes || 0);
  const [dislikes, setDislikes] = useState(initialDislikes || 0);
  const [myVote, setMyVote]   = useState(initialMyVote || 0);
  const u = window.CURRENT_USER;
  const isGuest = !u || u.username === 'guest';

  const vote = (v) => {
    if (isGuest) { window.navigate('login'); return; }
    const newV = myVote === v ? 0 : v;
    window.API.post('/quizzes/' + quizId + '/vote/', { value: newV })
      .then(d => { setLikes(d.likes); setDislikes(d.dislikes); setMyVote(d.my_vote); })
      .catch(err => window.showToast(err.message, 'error'));
  };

  const btn = (v, label, count) => (
    <button
      onClick={() => vote(v)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
        borderRadius: 'var(--r-md)', cursor: 'pointer', fontWeight: 600, fontSize: 14,
        transition: 'all 150ms var(--ease)',
        background: myVote === v
          ? (v === 1 ? 'var(--accent)' : 'oklch(62% 0.18 25 / 0.15)')
          : 'var(--surface)',
        color: myVote === v
          ? (v === 1 ? 'var(--accent-fg)' : 'oklch(50% 0.18 25)')
          : 'var(--text)',
        border: '1px solid ' + (myVote === v
          ? (v === 1 ? 'transparent' : 'oklch(62% 0.18 25)')
          : 'var(--border)'),
      }}
    >{label} <span>{count}</span></button>
  );

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {btn(1, '👍', likes)}
      {btn(-1, '👎', dislikes)}
    </div>
  );
}

// ── Comment editor (textarea + preview toggle) ───────────────────────────────
function CommentEditor({ placeholder, onSubmit, onCancel, initialValue = '', submitLabel }) {
  const [body, setBody]       = useState(initialValue);
  const [preview, setPreview] = useState(false);
  const label = submitLabel || t('quiz.comment_save');

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
        {['edit', 'preview'].map(tab => (
          <button key={tab} onClick={() => setPreview(tab === 'preview')} style={{
            fontSize: 12, fontWeight: 500, background: 'none', padding: '0 0 3px',
            color: ((tab === 'preview') === preview) ? 'var(--text)' : 'var(--text-faint)',
            borderBottom: ((tab === 'preview') === preview) ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer',
          }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
        ))}
      </div>
      {preview ? (
        <div
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: _md(body) }}
          style={{ minHeight: 60, padding: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, lineHeight: 1.6 }}
        />
      ) : (
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', minHeight: 80, padding: '10px 12px', resize: 'vertical',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', fontSize: 13,
            fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
          }}
        />
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="btn btn--accent btn--sm"
          onClick={() => body.trim() && onSubmit(body)}
          disabled={!body.trim()}
        >{label}</button>
        {onCancel && (
          <button className="btn btn--ghost btn--sm" onClick={onCancel}>
            {t('quiz.comment_cancel')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Single comment node (recursive) ─────────────────────────────────────────
function CommentNode({ c, quizId, onUpdate, depth }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [myVote, setMyVote]       = useState(c.my_vote || 0);
  const [voteScore, setVoteScore] = useState(c.vote_score || 0);
  const u   = window.CURRENT_USER;
  const isOwn   = u && u.username === c.author;
  const isGuest = !u || u.username === 'guest';

  const vote = (v) => {
    if (isGuest) { window.navigate('login'); return; }
    const newV = myVote === v ? 0 : v;
    window.API.post('/comments/' + c.id + '/vote/', { value: newV })
      .then(d => { setVoteScore(d.vote_score); setMyVote(d.my_vote); })
      .catch(err => window.showToast(err.message, 'error'));
  };

  const submitEdit = (body) => {
    window.API.patch('/comments/' + c.id + '/', { body })
      .then(() => { setEditOpen(false); onUpdate(); })
      .catch(err => window.showToast(err.message, 'error'));
  };

  const doDelete = () => {
    if (!confirm('Delete this comment?')) return;
    window.API.delete('/comments/' + c.id + '/')
      .then(() => onUpdate())
      .catch(err => window.showToast(err.message, 'error'));
  };

  const submitReply = (body) => {
    window.API.post('/quizzes/' + quizId + '/comments/', { body, parent_id: c.id })
      .then(() => { setReplyOpen(false); onUpdate(); })
      .catch(err => window.showToast(err.message, 'error'));
  };

  const hasReplies = c.replies && c.replies.length > 0;

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      {/* Left column: avatar + thread line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <button style={{ background: 'none', padding: 0, cursor: c.is_deleted ? 'default' : 'pointer' }}
          onClick={() => !c.is_deleted && window.navigate('profile', { user: c.author })}>
          <SmallAvatar username={c.author} avatar={c.author_avatar} avatarTransform={c.author_avatar_transform} />
        </button>
        {(hasReplies || replyOpen) && !collapsed && (
          <div
            onClick={() => setCollapsed(true)}
            style={{ width: 2, flex: 1, background: 'var(--border)', borderRadius: 1, marginTop: 6, cursor: 'pointer', minHeight: 20 }}
            title={t('quiz.collapse')}
          />
        )}
      </div>

      {/* Right column: content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
          {!c.is_deleted ? (
            <button
              onClick={() => window.navigate('profile', { user: c.author })}
              style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', background: 'none', padding: 0, cursor: 'pointer' }}
            >@{c.author}</button>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>[deleted]</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{_relTime(c.created_at)}</span>
          {c.edited_at && <span style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>{t('quiz.edited')}</span>}
          {voteScore !== 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: voteScore > 0 ? 'var(--accent-strong)' : 'oklch(50% 0.18 25)' }}>
              {voteScore > 0 ? '+' : ''}{voteScore}
            </span>
          )}
        </div>

        {/* Body */}
        {c.is_deleted ? (
          <p style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', margin: '0 0 6px' }}>{t('quiz.comment_deleted')}</p>
        ) : editOpen ? (
          <CommentEditor
            initialValue={c.body}
            placeholder={t('quiz.comment_ph')}
            onSubmit={submitEdit}
            onCancel={() => setEditOpen(false)}
          />
        ) : (
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: _md(c.body) }}
            style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 6 }}
          />
        )}

        {/* Actions */}
        {!c.is_deleted && !editOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: hasReplies && !collapsed ? 10 : 0 }}>
            <button onClick={() => vote(1)} style={{ background: 'none', padding: 0, cursor: 'pointer', fontSize: 14, opacity: myVote === 1 ? 1 : 0.5 }}>👍</button>
            <button onClick={() => vote(-1)} style={{ background: 'none', padding: 0, cursor: 'pointer', fontSize: 14, opacity: myVote === -1 ? 1 : 0.5 }}>👎</button>
            {!isGuest && (
              <button onClick={() => setReplyOpen(!replyOpen)} style={{ background: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--text-faint)' }}>
                {t('quiz.comment_reply')}
              </button>
            )}
            {isOwn && (
              <>
                <button onClick={() => { setEditOpen(true); setReplyOpen(false); }} style={{ background: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--text-faint)' }}>
                  {t('quiz.comment_edit')}
                </button>
                <button onClick={doDelete} style={{ background: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'oklch(52% 0.18 25)' }}>
                  {t('quiz.comment_delete')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Reply editor */}
        {replyOpen && (
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <CommentEditor
              placeholder={t('quiz.comment_ph')}
              onSubmit={submitReply}
              onCancel={() => setReplyOpen(false)}
              submitLabel={t('quiz.comment_reply')}
            />
          </div>
        )}

        {/* Collapsed indicator */}
        {collapsed && hasReplies && (
          <button onClick={() => setCollapsed(false)} style={{ background: 'none', padding: 0, cursor: 'pointer', fontSize: 12, color: 'var(--accent-strong)', marginBottom: 6 }}>
            {t('quiz.show_replies')} ({c.replies.length})
          </button>
        )}

        {/* Nested replies */}
        {hasReplies && !collapsed && (
          <div style={{ marginTop: 8 }}>
            {c.replies.map(r => (
              <CommentNode key={r.id} c={r} quizId={quizId} onUpdate={onUpdate} depth={(depth || 0) + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Comments section ─────────────────────────────────────────────────────────
function CommentsSection({ quizId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [sort, setSort]         = useState('top');
  const u       = window.CURRENT_USER;
  const isGuest = !u || u.username === 'guest';

  const load = () => {
    setLoading(true);
    window.API.get('/quizzes/' + quizId + '/comments/?sort=' + sort)
      .then(d => { setComments(d.comments || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [sort]);

  const submit = (body) => {
    window.API.post('/quizzes/' + quizId + '/comments/', { body })
      .then(() => load())
      .catch(err => window.showToast(err.message, 'error'));
  };

  const totalCount = comments.reduce(function count(acc, c) {
    return acc + 1 + (c.replies ? c.replies.reduce(count, 0) : 0);
  }, 0);

  return (
    <div style={{ marginTop: 8 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {t('quiz.comments_title')}
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>{totalCount}</span>
        </h3>
        <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', padding: 3 }}>
          {['top', 'new'].map(s => (
            <button key={s} onClick={() => setSort(s)} style={{
              padding: '5px 12px', fontSize: 12, fontWeight: 500,
              borderRadius: 5,
              background: sort === s ? 'var(--bg)' : 'transparent',
              color: sort === s ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: sort === s ? 'var(--shadow-sm)' : 'none',
              cursor: 'pointer',
            }}>{s === 'top' ? t('quiz.sort_top') : t('quiz.sort_new')}</button>
          ))}
        </div>
      </div>

      {/* New comment box */}
      {!isGuest ? (
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <CommentEditor placeholder={t('quiz.comment_ph')} onSubmit={submit} />
        </div>
      ) : (
        <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          <button onClick={() => window.navigate('login')} style={{ color: 'var(--accent-strong)', fontWeight: 600, background: 'none', cursor: 'pointer', padding: 0 }}>
            {t('quiz.login_comment')}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>{t('shared.loading')}</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-faint)', fontSize: 14 }}>
          {t('quiz.no_comments')}
        </div>
      ) : (
        comments.map(c => <CommentNode key={c.id} c={c} quizId={quizId} onUpdate={load} depth={0} />)
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function QuizDetailPage({ onNav }) {
  window.useLang();
  const [quiz, setQuiz]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQ, setShowQ] = useState(false);

  const params = window.getQueryParams();
  const quizId = params.id || params.quizId;

  useEffect(() => {
    if (!quizId) { setError('No quiz ID'); setLoading(false); return; }
    window.API.get('/quizzes/' + quizId + '/')
      .then(d => { setQuiz(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [quizId]);

  if (loading) return (
    <div className="page">
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>{t('shared.loading')}</div>
    </div>
  );

  if (error || !quiz) return (
    <div className="page">
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>{error || 'Quiz not found'}</div>
        <button className="btn btn--ghost" onClick={() => onNav('dashboard')}>Back</button>
      </div>
    </div>
  );

  const u = window.CURRENT_USER;
  const isOwn    = u && u.username === quiz.creator;
  const topicInfo = window.TOPIC_BY_CODE[quiz.topic] || { hue: 200, label: quiz.topic_display || quiz.topic };
  const questions  = quiz.questions || [];

  return (
    <div className="page fade-in">
      {/* ── Quiz header card ─────────────────────────────── */}
      <div className="card slide-up" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {/* Cover image */}
        {quiz.image ? (
          <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
            <div style={window.applyImageTransform(quiz.image, window.API.parseTransform(quiz.cover_transform), 16/9)} />
          </div>
        ) : (
          <div style={{ height: 120, background: `oklch(68% 0.14 ${topicInfo.hue} / 0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: `oklch(68% 0.14 ${topicInfo.hue})`, display: 'grid', placeItems: 'center' }}>
              <Icon name="grid" size={22} style={{ color: 'white' }} />
            </div>
          </div>
        )}

        <div style={{ padding: '20px 24px' }}>
          {/* Topic badge + title */}
          <div style={{ marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
              color: `oklch(50% 0.14 ${topicInfo.hue})`,
              background: `oklch(68% 0.14 ${topicInfo.hue} / 0.12)`,
              padding: '3px 8px', borderRadius: 4,
            }}>{topicInfo.label}</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>{quiz.title}</h1>
          {quiz.description && (
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>{quiz.description}</p>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16, fontSize: 13 }}>
            <span style={{ color: 'var(--text-faint)' }}>
              {t('quiz.by')} <button
                onClick={() => onNav('profile', { user: quiz.creator })}
                style={{ fontWeight: 600, color: 'var(--accent-strong)', background: 'none', cursor: 'pointer', padding: 0 }}
              >@{quiz.creator}</button>
            </span>
            <span className="mono" style={{ color: 'var(--text-faint)' }}>{questions.length} {t('quiz.questions_count')}</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <QuizVoteBar
              quizId={quiz.id}
              initialLikes={quiz.likes}
              initialDislikes={quiz.dislikes}
              initialMyVote={quiz.my_vote}
            />
            <div style={{ flex: 1 }} />
            <button className="btn btn--primary" onClick={() => onNav('player', { quizId: quiz.id })}>
              <Icon name="play" size={14} /> {t('quiz.play')}
            </button>
            {isOwn && (
              <>
                <button className="btn btn--secondary" onClick={() => onNav('editor', { quizId: quiz.id })}>
                  <Icon name="edit" size={14} /> Edit
                </button>
                <button className="btn btn--ghost" onClick={() => onNav('live', { quizId: quiz.id })}>
                  <Icon name="radio" size={14} /> {t('quiz.run_live')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Questions list (collapsible) ─────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div
          onClick={() => setShowQ(!showQ)}
          style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
        >
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {t('quiz.questions')}
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>{questions.length}</span>
          </span>
          <Icon name={showQ ? 'chevronDown' : 'chevronRight'} size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
        {showQ && questions.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {questions.map((q, i) => (
              <div key={q.id || i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '11px 20px',
                borderBottom: i < questions.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', width: 22, flexShrink: 0, paddingTop: 2 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{q.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3, display: 'flex', gap: 8 }}>
                    <span className="mono">{q.time_limit}s</span>
                    <span>·</span>
                    <span>{q.question_type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Comments ─────────────────────────────────────── */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <CommentsSection quizId={quizId} />
      </div>
    </div>
  );
}

window.QuizDetailPage = QuizDetailPage;
