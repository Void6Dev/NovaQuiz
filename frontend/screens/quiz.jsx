// === Quiz Detail Page ===

function _relTime(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)     return 'just now';
  if (s < 3600)   return Math.floor(s / 60) + 'm ago';
  if (s < 86400)  return Math.floor(s / 3600) + 'h ago';
  if (s < 604800) return Math.floor(s / 86400) + 'd ago';
  return new Date(iso).toLocaleDateString();
}

function _md(text) {
  if (!text) return '';
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = window.marked ? window.marked.parse(text) : escaped;
  // Always sanitize before this feeds dangerouslySetInnerHTML — marked does NOT
  // strip HTML, so raw <script>/onerror payloads in user comments would execute.
  if (window.DOMPurify) return window.DOMPurify.sanitize(html);
  // No sanitizer loaded → fall back to fully-escaped plain text, never raw HTML.
  return escaped;
}

// ── Avatar ───────────────────────────────────────────────────────────────────
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
    <div className="avatar" style={{ width: size, height: size, background: `oklch(68% 0.16 ${hue})`, fontSize: Math.floor(size * 0.4) }}>
      {(username || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Vote bar ─────────────────────────────────────────────────────────────────
function QuizVoteBar({ quizId, initialLikes, initialDislikes, initialMyVote }) {
  const [likes, setLikes]       = useState(initialLikes    || 0);
  const [dislikes, setDislikes] = useState(initialDislikes || 0);
  const [myVote, setMyVote]     = useState(initialMyVote   || 0);
  const isGuest = !window.CURRENT_USER || window.CURRENT_USER.username === 'guest';

  const vote = (v) => {
    if (isGuest) { window.navigate('login'); return; }
    const newV = myVote === v ? 0 : v;
    window.API.post('/quizzes/' + quizId + '/vote/', { value: newV })
      .then(d => { setLikes(d.likes); setDislikes(d.dislikes); setMyVote(d.my_vote); })
      .catch(err => window.showToast(err.message, 'error'));
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button className={`vote-btn vote-btn--like${myVote === 1 ? ' vote-btn--active' : ''}`} onClick={() => vote(1)}>
        <Icon name="arrowUp" size={15} /> <span>{likes}</span>
      </button>
      <button className={`vote-btn vote-btn--dislike${myVote === -1 ? ' vote-btn--active' : ''}`} onClick={() => vote(-1)}>
        <Icon name="arrowDown" size={15} /> <span>{dislikes}</span>
      </button>
    </div>
  );
}

// ── Comment editor ───────────────────────────────────────────────────────────
function CommentEditor({ placeholder, onSubmit, onCancel, initialValue = '', submitLabel }) {
  const [body, setBody]       = useState(initialValue);
  const [preview, setPreview] = useState(false);
  const label = submitLabel || t('quiz.comment_save');

  return (
    <div>
      <div className="comment-editor__tabs">
        {['edit', 'preview'].map(tab => (
          <button
            key={tab}
            onClick={() => setPreview(tab === 'preview')}
            className={`comment-editor__tab${(tab === 'preview') === preview ? ' comment-editor__tab--active' : ''}`}
          >{tab === 'edit' ? 'Edit' : 'Preview'}</button>
        ))}
      </div>
      {preview ? (
        <div className="markdown-body comment-editor__preview" dangerouslySetInnerHTML={{ __html: _md(body) }} />
      ) : (
        <textarea
          className="input"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight: 80, resize: 'vertical', lineHeight: 1.5 }}
        />
      )}
      <div className="comment-editor__footer">
        <button className="btn btn--accent btn--sm" onClick={() => body.trim() && onSubmit(body)} disabled={!body.trim()}>
          {label}
        </button>
        {onCancel && <button className="btn btn--ghost btn--sm" onClick={onCancel}>{t('quiz.comment_cancel')}</button>}
      </div>
    </div>
  );
}

// ── Single comment node (recursive) ─────────────────────────────────────────
function CommentNode({ c, quizId, onUpdate, depth }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen]   = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [myVote, setMyVote]       = useState(c.my_vote    || 0);
  const [voteScore, setVoteScore] = useState(c.vote_score || 0);
  const u      = window.CURRENT_USER;
  const isOwn  = u && u.username === c.author;
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
    window.API.delete('/comments/' + c.id + '/').then(() => onUpdate()).catch(err => window.showToast(err.message, 'error'));
  };

  const submitReply = (body) => {
    window.API.post('/quizzes/' + quizId + '/comments/', { body, parent_id: c.id })
      .then(() => { setReplyOpen(false); onUpdate(); })
      .catch(err => window.showToast(err.message, 'error'));
  };

  const hasReplies = c.replies && c.replies.length > 0;

  return (
    <div className="comment">
      <div className="comment__col">
        <button style={{ background: 'none', padding: 0, cursor: c.is_deleted ? 'default' : 'pointer' }}
          onClick={() => !c.is_deleted && window.navigate('profile', { user: c.author })}>
          <SmallAvatar username={c.author} avatar={c.author_avatar} avatarTransform={c.author_avatar_transform} />
        </button>
        {(hasReplies || replyOpen) && !collapsed && (
          <div className="comment__line" onClick={() => setCollapsed(true)} title={t('quiz.collapse')} />
        )}
      </div>

      <div className="comment__content">
        <div className="comment__header">
          {!c.is_deleted ? (
            <button className="comment__author" onClick={() => window.navigate('profile', { user: c.author })}>
              @{c.author}
              {c.author_permission === 'moderator' && <span className="badge-mod" style={{ marginLeft: 5 }}>MOD</span>}
            </button>
          ) : (
            <span className="comment__time">[deleted]</span>
          )}
          <span className="comment__time">{_relTime(c.created_at)}</span>
          {c.edited_at && <span className="comment__time" style={{ fontStyle: 'italic' }}>{t('quiz.edited')}</span>}
          {voteScore !== 0 && (
            <span className={`comment__score ${voteScore > 0 ? 'comment__score--pos' : 'comment__score--neg'}`}>
              {voteScore > 0 ? '+' : ''}{voteScore}
            </span>
          )}
        </div>

        {c.is_deleted ? (
          <p className="comment__time" style={{ fontStyle: 'italic', margin: '0 0 6px' }}>{t('quiz.comment_deleted')}</p>
        ) : editOpen ? (
          <CommentEditor initialValue={c.body} placeholder={t('quiz.comment_ph')} onSubmit={submitEdit} onCancel={() => setEditOpen(false)} />
        ) : (
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: _md(c.body) }} style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 6 }} />
        )}

        {!c.is_deleted && !editOpen && (
          <div className="comment__actions">
            <button className={`comment__vote${myVote === 1 ? ' comment__vote--active' : ''}`} onClick={() => vote(1)} title="Upvote">
              <Icon name="arrowUp" size={13} />
            </button>
            <button className={`comment__vote${myVote === -1 ? ' comment__vote--active' : ''}`} onClick={() => vote(-1)} title="Downvote">
              <Icon name="arrowDown" size={13} />
            </button>
            {!isGuest && (
              <button className="comment__action" onClick={() => setReplyOpen(!replyOpen)}>
                <Icon name="reply" size={13} /> {t('quiz.comment_reply')}
              </button>
            )}
            {isOwn && (
              <>
                <button className="comment__action" onClick={() => { setEditOpen(true); setReplyOpen(false); }}>
                  <Icon name="edit" size={13} /> {t('quiz.comment_edit')}
                </button>
                <button className="comment__action comment__action--danger" onClick={doDelete}>
                  <Icon name="trash" size={13} /> {t('quiz.comment_delete')}
                </button>
              </>
            )}
          </div>
        )}

        {replyOpen && (
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <CommentEditor placeholder={t('quiz.comment_ph')} onSubmit={submitReply} onCancel={() => setReplyOpen(false)} submitLabel={t('quiz.comment_reply')} />
          </div>
        )}

        {collapsed && hasReplies && (
          <button className="comment__action" style={{ color: 'var(--accent-strong)', marginBottom: 6 }} onClick={() => setCollapsed(false)}>
            {t('quiz.show_replies')} ({c.replies.length})
          </button>
        )}

        {hasReplies && !collapsed && (
          <div className="comment__replies">
            {c.replies.map(r => <CommentNode key={r.id} c={r} quizId={quizId} onUpdate={onUpdate} depth={(depth || 0) + 1} />)}
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
  const [dimmed, setDimmed]     = useState(false);
  const initialized             = useRef(false);
  const [sort, setSort]         = useState('top');
  const u = window.CURRENT_USER;
  const isGuest = !u || u.username === 'guest';

  const load = () => {
    if (!initialized.current) {
      setLoading(true);
    } else {
      setDimmed(true);
    }
    window.API.get('/quizzes/' + quizId + '/comments/?sort=' + sort)
      .then(d => {
        setComments(d.comments || []);
        setLoading(false);
        setDimmed(false);
        initialized.current = true;
      })
      .catch(() => { setLoading(false); setDimmed(false); });
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
    <div>
      <div className="page__header" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {t('quiz.comments_title')}
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>{totalCount}</span>
        </h3>
        <div className="seg-ctrl">
          {['top', 'new'].map(s => (
            <button key={s} className={`seg-ctrl__btn${sort === s ? ' seg-ctrl__btn--active' : ''}`} onClick={() => setSort(s)}>
              {s === 'top' ? t('quiz.sort_top') : t('quiz.sort_new')}
            </button>
          ))}
        </div>
      </div>

      {!isGuest ? (
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <CommentEditor placeholder={t('quiz.comment_ph')} onSubmit={submit} />
        </div>
      ) : (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          <button onClick={() => window.navigate('login')} style={{ color: 'var(--accent-strong)', fontWeight: 600, background: 'none', cursor: 'pointer', padding: 0 }}>
            {t('quiz.login_comment')}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>{t('shared.loading')}</div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-faint)', fontSize: 14 }}>
          {t('quiz.no_comments')}
        </div>
      ) : (
        <div style={{ opacity: dimmed ? 0.4 : 1, transition: 'opacity 180ms var(--ease)', pointerEvents: dimmed ? 'none' : 'auto' }}>
          {comments.map(c => <CommentNode key={c.id} c={c} quizId={quizId} onUpdate={load} depth={0} />)}
        </div>
      )}
    </div>
  );
}

// ── Similar quiz card ─────────────────────────────────────────────────────────
function SimilarCard({ quiz, onNav }) {
  const topicInfo = window.TOPIC_BY_CODE[quiz.topic] || { hue: 200 };
  return (
    <div className="sim-card" onClick={() => onNav('quiz', { id: quiz.id })}>
      <div className="sim-card__thumb">
        {quiz.image
          ? <div style={window.applyImageTransform(quiz.image, window.API.parseTransform(quiz.cover_transform), 1)} />
          : <div style={{ width: '100%', height: '100%', background: `oklch(68% 0.14 ${topicInfo.hue} / 0.18)`, display: 'grid', placeItems: 'center' }}>
              <Icon name="grid" size={16} style={{ color: `oklch(58% 0.14 ${topicInfo.hue})` }} />
            </div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sim-card__title">{quiz.title}</div>
        <div className="sim-card__meta">
          <span className="mono">{quiz.question_count} Qs</span>
          <span>·</span>
          <Icon name="arrowUp" size={10} />
          <span>{quiz.likes}</span>
        </div>
        <div className="sim-card__meta" style={{ marginTop: 2 }}>
          @{quiz.creator}
        </div>
      </div>
    </div>
  );
}

// ── Similar quizzes sidebar ───────────────────────────────────────────────────
function SimilarQuizzes({ quizId, onNav }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.API.get('/quizzes/' + quizId + '/similar/')
      .then(d => { setQuizzes(d.quizzes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [quizId]);

  if (loading) return (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1,2,3].map(i => <div key={i} className="skel" style={{ height: 52, borderRadius: 8 }} />)}
    </div>
  );
  if (!quizzes.length) return null;

  return (
    <div className="card" style={{ padding: '16px 0', overflow: 'hidden' }}>
      <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)', padding: '0 16px', marginBottom: 10 }}>
        Similar quizzes
      </h4>
      {quizzes.map(q => <SimilarCard key={q.id} quiz={q} onNav={onNav} />)}
    </div>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────
function StatTile({ icon, value, label, color }) {
  return (
    <div className="qd-stat">
      <Icon name={icon} size={16} style={{ color: color || 'var(--text-muted)' }} />
      <span className="qd-stat__val">{value}</span>
      <span className="qd-stat__label">{label}</span>
    </div>
  );
}

// ── Owner removal banner ──────────────────────────────────────────────────────
function OwnerRemovedBanner({ removal }) {
  const [appealing, setAppealing] = useState(false);
  const [appealText, setAppealText]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [err, setErr]                 = useState('');
  const [appealStatus, setAppealStatus] = useState(removal.appeal_status || 'none');

  const submit = async () => {
    if (!appealText.trim()) return;
    setLoading(true); setErr('');
    try {
      await window.API.post(`/deletions/${removal.deletion_id}/appeal/`, { text: appealText });
      setAppealStatus('pending');
      setAppealing(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const statusMsg =
    appealStatus === 'pending'  ? 'Appeal submitted — awaiting moderator review.' :
    appealStatus === 'accepted' ? 'Your appeal was accepted.' :
    appealStatus === 'rejected' ? 'Your appeal was rejected.' : null;

  return (
    <div style={{
      background: 'var(--warn-soft)', border: '1px solid var(--warn-soft-border)',
      borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 20,
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{ flexShrink: 0, marginTop: 2, color: 'var(--warn-text)' }}>
        <Icon name="flag" size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--warn-text)', marginBottom: 4 }}>
          This quiz has been removed by a moderator
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>Reason: </span>{removal.reason}
          <span style={{ color: 'var(--text-faint)', marginLeft: 8, fontSize: 12 }}>
            by @{removal.moderator} · {new Date(removal.deleted_at).toLocaleDateString()}
          </span>
        </div>

        {statusMsg ? (
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{statusMsg}</div>
        ) : !appealing ? (
          <button className="btn btn--sm btn--secondary" onClick={() => setAppealing(true)}>
            Submit appeal
          </button>
        ) : (
          <div>
            <textarea
              className="input"
              style={{ width: '100%', minHeight: 80, fontSize: 13, resize: 'vertical', marginBottom: 8 }}
              placeholder="Explain why this removal was a mistake…"
              value={appealText}
              onChange={e => setAppealText(e.target.value)}
              maxLength={1000}
            />
            {err && <div style={{ fontSize: 12, color: 'var(--danger-text)', marginBottom: 6 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--sm btn--accent" onClick={submit} disabled={loading || !appealText.trim()}>
                {loading ? 'Sending…' : 'Send appeal'}
              </button>
              <button className="btn btn--sm btn--ghost" onClick={() => { setAppealing(false); setErr(''); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function ModRemovedBanner({ removal, onNav, onRestored }) {
  const [actionLoading, setActionLoading] = useState('');

  const decide = async (action) => {
    setActionLoading(action);
    try {
      await window.API.post(`/appeals/${removal.deletion_id}/${action}/`);
      if (action === 'accept') {
        onRestored();
        window.showToast('Appeal accepted — quiz restored', 'success');
      } else {
        window.showToast('Appeal rejected', 'info');
        onNav('dashboard');
      }
    } catch (e) {
      window.showToast(e.message, 'error');
      setActionLoading('');
    }
  };

  const hasPendingAppeal = removal.appeal_status === 'pending';

  return (
    <div style={{
      background: 'var(--warn-soft)', border: '1px solid var(--warn-soft-border)',
      borderRadius: 'var(--r-md)', padding: '14px 18px', marginBottom: 20,
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{ flexShrink: 0, marginTop: 2, color: 'var(--warn-text)' }}>
        <Icon name="flag" size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--warn-text)', marginBottom: 4 }}>
          This quiz has been removed
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
          <span style={{ fontWeight: 500 }}>Reason: </span>{removal.reason}
          <span style={{ color: 'var(--text-faint)', marginLeft: 8, fontSize: 12 }}>
            by @{removal.moderator} · {new Date(removal.deleted_at).toLocaleDateString()}
          </span>
        </div>
        {hasPendingAppeal && (
          <div style={{ fontSize: 13, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 12px', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: 'var(--warn-text)' }}>Appeal: </span>{removal.appeal_text}
          </div>
        )}
        {hasPendingAppeal && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--sm btn--accent" onClick={() => decide('accept')} disabled={!!actionLoading}>
              {actionLoading === 'accept' ? 'Restoring…' : <><Icon name="check" size={12} /> Accept appeal</>}
            </button>
            <button className="btn btn--sm" style={{ background: 'var(--danger)', color: 'var(--danger-fg)' }} onClick={() => decide('reject')} disabled={!!actionLoading}>
              {actionLoading === 'reject' ? 'Rejecting…' : <><Icon name="x" size={12} /> Reject appeal</>}
            </button>
          </div>
        )}
        {!hasPendingAppeal && (
          <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            {removal.appeal_status === 'none' ? 'No appeal submitted yet.' : `Appeal ${removal.appeal_status}.`}
          </div>
        )}
      </div>
    </div>
  );
}


function QuizDetailPage({ onNav }) {
  window.useLang();
  const [quiz, setQuiz]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showQ, setShowQ]     = useState(false);

  const params = window.getQueryParams();
  const quizId = params.id || params.quizId;

  useEffect(() => {
    if (!quizId) { setError('No quiz ID'); setLoading(false); return; }
    window.API.get('/quizzes/' + quizId + '/')
      .then(d => { setQuiz(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [quizId]);

  if (loading) return (
    <div className="page" style={{ paddingTop: 80, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
      {t('shared.loading')}
    </div>
  );

  if (error || !quiz) return (
    <div className="page" style={{ paddingTop: 80, textAlign: 'center' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>{error || 'Quiz not found'}</div>
      <button className="btn btn--ghost" onClick={() => onNav('dashboard')}>Back</button>
    </div>
  );

  const u = window.CURRENT_USER;
  const isOwn     = u && u.username === quiz.creator;
  const isMod     = u && (u.permission === 'moderator' || u.is_superuser);
  const topicInfo = window.TOPIC_BY_CODE[quiz.topic] || { hue: 200, label: quiz.topic_display || quiz.topic };
  const questions = quiz.questions || [];
  const removal   = quiz.removal_info || null;

  return (
    <div className="page fade-in">
      {/* ── Removal banners ──────────────────────────────── */}
      {quiz.is_removed && isMod && removal && (
        <ModRemovedBanner removal={removal} onNav={onNav} onRestored={() => setQuiz(q => ({ ...q, is_removed: false, removal_info: null }))} />
      )}
      {quiz.is_removed && isOwn && !isMod && removal && (
        <OwnerRemovedBanner removal={removal} />
      )}

      {/* ── Quiz header card ──────────────────────────── */}
      <div className="card slide-up" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {quiz.image ? (
          <div className="qd-cover">
            <div style={window.applyImageTransform(quiz.image, window.API.parseTransform(quiz.cover_transform), 16/9)} />
          </div>
        ) : (
          <div className="qd-cover qd-cover--empty" style={{ background: `oklch(68% 0.14 ${topicInfo.hue} / 0.12)` }}>
            <div className="qd-cover-icon" style={{ background: `oklch(68% 0.14 ${topicInfo.hue})` }}>
              <Icon name="grid" size={22} style={{ color: 'white' }} />
            </div>
          </div>
        )}

        <div className="qd-body">
          <div style={{ marginBottom: 8 }}>
            <span className="pill" style={{ color: `oklch(50% 0.14 ${topicInfo.hue})`, background: `oklch(68% 0.14 ${topicInfo.hue} / 0.12)`, borderColor: 'transparent' }}>
              {topicInfo.label}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>{quiz.title}</h1>
          {quiz.description && (
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 12 }}>{quiz.description}</p>
          )}

          <div className="qd-meta">
            <span>
              {t('quiz.by')}{' '}
              <button onClick={() => onNav('profile', { user: quiz.creator })} style={{ fontWeight: 600, color: 'var(--accent-strong)', background: 'none', cursor: 'pointer', padding: 0 }}>
                @{quiz.creator}
              </button>
            </span>
            <span className="mono" style={{ color: 'var(--text-faint)' }}>
              {new Date(quiz.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="qd-actions">
            <QuizVoteBar quizId={quiz.id} initialLikes={quiz.likes} initialDislikes={quiz.dislikes} initialMyVote={quiz.my_vote} />
            <div style={{ flex: 1 }} />
            <button className="btn btn--primary" onClick={() => onNav('player', { quizId: quiz.id })}>
              <Icon name="play" size={14} /> {t('quiz.play')}
            </button>
            {isOwn ? (
              <>
                <button className="btn btn--secondary" onClick={() => onNav('editor', { quizId: quiz.id })}>
                  <Icon name="edit" size={14} /> Edit
                </button>
                <button className="btn btn--ghost" onClick={() => onNav('live', { quizId: quiz.id })}>
                  <Icon name="radio" size={14} /> {t('quiz.run_live')}
                </button>
              </>
            ) : (
              <button className="btn btn--ghost" onClick={() => onNav('live', { quizId: quiz.id })}>
                <Icon name="bolt" size={14} /> {t('quiz.run_live')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────── */}
      <div className="qd-stats">
        <StatTile icon="arrowUp"   value={quiz.likes}                          label="Likes"      color="var(--accent-strong)" />
        <StatTile icon="arrowDown" value={quiz.dislikes}                       label="Dislikes"   color="oklch(52% 0.18 25)" />
        <StatTile icon="list"      value={questions.length}                    label="Questions"  />
        <StatTile icon="message"   value={quiz.comment_count != null ? quiz.comment_count : '—'} label="Comments" />
      </div>

      {/* ── Two-column layout ─────────────────────────── */}
      <div className="qd-layout">
        <div className="qd-main">
          {/* Questions list */}
          <div className="card">
            <button
              onClick={() => setShowQ(!showQ)}
              style={{ width: '100%', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {t('quiz.questions')}
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 400, marginLeft: 8 }}>{questions.length}</span>
              </span>
              <Icon name={showQ ? 'chevronDown' : 'chevronRight'} size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            {showQ && questions.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {questions.map((q, i) => (
                  <div key={q.id || i} className="qd-question">
                    <span className="qd-question__num">{String(i + 1).padStart(2, '0')}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="qd-question__text">{q.text}</div>
                      <div className="qd-question__meta">
                        <span className="mono">{q.time_limit}s</span>
                        {' · '}
                        <span>{q.question_type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="card" style={{ padding: '20px 24px' }}>
            <CommentsSection quizId={quizId} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="qd-sidebar">
          <SimilarQuizzes quizId={quizId} onNav={onNav} />
        </div>
      </div>
    </div>
  );
}

window.QuizDetailPage = QuizDetailPage;
