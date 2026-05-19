// === Editor ===
function Editor({ onNav }) {
  const [quizId, setQuizId]         = useState(null);
  const quizIdRef                    = React.useRef(null);
  const [questions, setQuestions]   = useState([]);
  const [activeId, setActiveId]     = useState(null);
  const [title, setTitle]           = useState('Untitled quiz');
  const [topic, setTopic]           = useState('GK');
  const [description, setDesc]      = useState('');
  const [titleFocus, setTitleFocus] = useState(false);
  const [saved, setSaved]           = useState(true);
  const [loading, setLoading]       = useState(true);
  const [coverSaved, setCoverSaved] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const titleSaveTimer = React.useRef(null);
  const qSaveTimers    = React.useRef({});
  const quizCoverRef   = React.useRef(null);

  // Load or create quiz on mount
  useEffect(() => {
    const params = window.getQueryParams();
    if (params.quizId) {
      window.API.get('/quizzes/' + params.quizId + '/')
        .then(data => {
          setQuizId(data.id); quizIdRef.current = data.id;
          setTitle(data.title);
          setTopic(data.topic);
          setDesc(data.description || '');
          const qs = (data.questions || []).map(window.API.fromBackendQuestion);
          setQuestions(qs);
          if (qs.length > 0) setActiveId(qs[0].id);
        })
        .finally(() => setLoading(false));
    } else {
      window.API.post('/quizzes/create/', { title: 'Untitled quiz', topic: 'GK' })
        .then(data => {
          setQuizId(data.id); quizIdRef.current = data.id;
          history.replaceState(null, '', '?quizId=' + data.id);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  // Auto-save title / topic / description
  useEffect(() => {
    if (!quizIdRef.current || loading) return;
    setSaved(false);
    clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(() => {
      window.API.post('/quizzes/' + quizIdRef.current + '/update/', { title, topic, description })
        .then(() => setSaved(true)).catch(() => {});
    }, 800);
    return () => clearTimeout(titleSaveTimer.current);
  }, [title, topic, description]);

  const active      = questions.find(q => q.id === activeId);
  const activeIndex = questions.findIndex(q => q.id === activeId);

  const updateQuestion = (updates) => {
    setQuestions(qs => qs.map(q => {
      if (q.id !== activeId) return q;
      const updated = { ...q, ...updates };
      setSaved(false);
      clearTimeout(qSaveTimers.current[q.id]);
      qSaveTimers.current[q.id] = setTimeout(() => {
        const qid = quizIdRef.current;
        if (!qid) return;
        window.API.post('/quizzes/' + qid + '/questions/' + q.id + '/update/', {
          text: updated.prompt,
          image_url: updated.imageUrl || '',
          time_limit: updated.timeLimit || 30,
          points: updated.points || 100,
          shuffle_options: updated.shuffleOptions || false,
          question_type: updated.type,
          correct_answer: updated.answer || '',
          answers: (updated.options || []).map(o => ({
            ...(typeof o.id === 'number' ? { id: o.id } : {}),
            text: o.text,
            is_correct: o.correct,
          })),
        }).then(saved => {
          setQuestions(prev => prev.map(p => p.id === q.id
            ? {
                ...window.API.fromBackendQuestion(saved),
                type: updated.type,
                timeLimit: updated.timeLimit,
                points: updated.points,
                shuffleOptions: updated.shuffleOptions,
              }
            : p
          ));
          setSaved(true);
        }).catch(() => {});
      }, 800);
      return updated;
    }));
  };

  const addQuestion = (type) => {
    if (!quizIdRef.current) return;
    const defaultAnswers = type === 'truefalse'
      ? [{ text: 'True', is_correct: true }, { text: 'False', is_correct: false }]
      : [{ text: '', is_correct: false }, { text: '', is_correct: false },
         { text: '', is_correct: false }, { text: '', is_correct: false }];
    window.API.post('/quizzes/' + quizIdRef.current + '/questions/add/', {
      text: '', answers: defaultAnswers,
      time_limit: type === 'truefalse' ? 20 : 30, points: 100,
      question_type: type,
    }).then(q => {
      const newQ = { ...window.API.fromBackendQuestion(q), shuffleOptions: false };
      setQuestions(qs => [...qs, newQ]);
      setActiveId(newQ.id);
      setSaved(false);
    }).catch(() => {});
  };

  const duplicateQuestion = (id) => {
    const q = questions.find(x => x.id === id);
    if (!q || !quizIdRef.current) return;
    window.API.post('/quizzes/' + quizIdRef.current + '/questions/add/', {
      text: q.prompt,
      time_limit: q.timeLimit,
      points: q.points,
      question_type: q.type,
      correct_answer: q.answer || '',
      answers: (q.options || []).map(o => ({ text: o.text, is_correct: o.correct })),
    }).then(newQ => {
      const frontQ = {
        ...window.API.fromBackendQuestion(newQ),
        shuffleOptions: q.shuffleOptions,
      };
      const idx = questions.findIndex(x => x.id === id);
      setQuestions(qs => [...qs.slice(0, idx + 1), frontQ, ...qs.slice(idx + 1)]);
      setActiveId(frontQ.id);
    }).catch(() => {});
  };

  const deleteQuestion = (id) => {
    if (questions.length === 1) return;
    window.API.post('/quizzes/' + quizIdRef.current + '/questions/' + id + '/delete/')
      .then(() => {
        setQuestions(qs => {
          const next = qs.filter(x => x.id !== id);
          if (activeId === id) setActiveId(next[0]?.id || null);
          return next;
        });
      }).catch(() => {});
  };

  const moveQuestion = (id, dir) => {
    const idx = questions.findIndex(q => q.id === id);
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const reordered = [...questions];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    setQuestions(reordered);
    if (!quizIdRef.current) return;
    window.API.post('/quizzes/' + quizIdRef.current + '/questions/reorder/', {
      ids: reordered.map(q => q.id),
    }).catch(() => {});
  };

  const handleShare = () => {
    const url = window.location.origin + '/player.html?quizId=' + quizIdRef.current;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    } else {
      prompt('Copy this link:', url);
    }
  };

  if (loading) return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
      Loading editor…
    </div>
  );

  return (
    <div className="editor fade-in" data-screen-label="03 Editor">
      <div className="editor__topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <button className="btn btn--ghost btn--icon" onClick={() => onNav('dashboard')}>
            <Icon name="chevronLeft" size={18} />
          </button>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setSaved(false); }}
            onFocus={() => setTitleFocus(true)}
            onBlur={() => setTitleFocus(false)}
            style={{
              fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em',
              padding: '6px 10px', borderRadius: 8,
              background: titleFocus ? 'var(--surface)' : 'transparent',
              border: '1px solid ' + (titleFocus ? 'var(--border-strong)' : 'transparent'),
              minWidth: 200,
            }}
          />
          <TopicPicker value={topic} onChange={(v) => { setTopic(v); setSaved(false); }} />
          <span style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {saved ? <><Icon name="check" size={12} /> Saved</> : <>Saving…</>}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => quizCoverRef.current?.click()}>
            <Icon name="image" size={14} /> {coverSaved ? 'Saved!' : 'Cover'}
          </button>
          <input
            ref={quizCoverRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (!f || !quizIdRef.current) return;
              const fd = new FormData();
              fd.append('image', f);
              window.API.upload('/quizzes/' + quizIdRef.current + '/image/', fd)
                .then(() => { setCoverSaved(true); setTimeout(() => setCoverSaved(false), 2000); })
                .catch(err => alert(err.message));
              e.target.value = '';
            }}
          />
          <button className="btn btn--secondary btn--sm" onClick={handleShare}>
            <Icon name="share" size={14} /> {shareCopied ? 'Copied!' : 'Share'}
          </button>
          <button className="btn btn--secondary btn--sm" onClick={() => onNav('player', { quizId: quizIdRef.current })}>
            <Icon name="play" size={14} /> Practice
          </button>
          <button className="btn btn--accent btn--sm" onClick={() => onNav('live', { quizId: quizIdRef.current })}>
            <Icon name="bolt" size={14} /> Run live
          </button>
        </div>
      </div>

      <div className="editor__body">
        <div className="editor__list">
          <div className="editor__list-header">
            <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, color: 'var(--text-muted)' }}>
              Questions <span className="mono" style={{ color: 'var(--text-faint)' }}>· {questions.length}</span>
            </span>
            <AddQuestionMenu onAdd={addQuestion} />
          </div>
          <div className="editor__list-scroll">
            {questions.map((q, i) => (
              <QuestionListItem
                key={q.id}
                question={q}
                index={i}
                active={q.id === activeId}
                onClick={() => setActiveId(q.id)}
                onDuplicate={() => duplicateQuestion(q.id)}
                onDelete={() => deleteQuestion(q.id)}
                onMoveUp={i > 0 ? () => moveQuestion(q.id, 'up') : null}
                onMoveDown={i < questions.length - 1 ? () => moveQuestion(q.id, 'down') : null}
              />
            ))}
            <button onClick={() => addQuestion('single')} className="editor__add">
              <Icon name="plus" size={14} /> Add question
            </button>
          </div>
        </div>

        <div className="editor__canvas">
          {active && (
            <QuestionEditor
              question={active}
              index={activeIndex}
              total={questions.length}
              onChange={updateQuestion}
              quizId={quizIdRef.current}
            />
          )}
        </div>

        <div className="editor__inspector">
          <Inspector
            question={active}
            onChange={updateQuestion}
            description={description}
            onDescription={setDesc}
          />
        </div>
      </div>

      <style>{`
        .editor { height: 100vh; display: flex; flex-direction: column; }
        .editor__topbar {
          padding: 12px 20px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 16px;
          background: var(--bg-2); flex-shrink: 0;
        }
        .editor__body {
          display: grid; grid-template-columns: 280px 1fr 300px;
          flex: 1; min-height: 0;
        }
        .editor__list {
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          background: var(--bg-2);
        }
        .editor__list-header {
          padding: 16px 16px 10px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .editor__list-scroll { flex: 1; overflow-y: auto; padding: 0 10px 16px; }
        .editor__add {
          width: 100%; padding: 10px;
          border: 1px dashed var(--border-strong);
          border-radius: var(--r-md);
          color: var(--text-muted); font-size: 13px;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin-top: 8px; transition: all 150ms var(--ease);
        }
        .editor__add:hover { color: var(--text); border-color: var(--text-muted); background: var(--surface); }
        .editor__canvas {
          padding: 40px; overflow-y: auto;
          display: flex; flex-direction: column; align-items: center;
        }
        .editor__inspector {
          border-left: 1px solid var(--border);
          background: var(--bg-2); padding: 20px; overflow-y: auto;
        }
        .q-list-item__actions {
          display: flex; gap: 1px; flex-shrink: 0;
          opacity: 0; transition: opacity 120ms var(--ease);
        }
        .q-list-item:hover .q-list-item__actions { opacity: 1; }
      `}</style>
    </div>
  );
}

function TopicPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const TOPICS = window.TOPICS;
  const current = window.TOPIC_BY_CODE[value] || TOPICS[0];
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', fn);
    return () => window.removeEventListener('mousedown', fn);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn btn--secondary btn--sm" onClick={() => setOpen(o => !o)} style={{ gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: `oklch(70% 0.16 ${current.hue})` }} />
        <span style={{ fontWeight: 500 }}>{current.label}</span>
        <Icon name="chevronDown" size={12} style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <div className="card scale-in" style={{
          position: 'absolute', left: 0, top: 'calc(100% + 6px)',
          width: 240, padding: 4, boxShadow: 'var(--shadow-lg)', zIndex: 5,
          maxHeight: 320, overflowY: 'auto',
        }}>
          {TOPICS.map(t => (
            <button
              key={t.code}
              onClick={() => { onChange(t.code); setOpen(false); }}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 7,
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                background: t.code === value ? 'var(--bg-2)' : 'transparent',
                transition: 'background 100ms', fontSize: 13,
              }}
              onMouseEnter={e => { if (t.code !== value) e.currentTarget.style.background = 'var(--bg-2)'; }}
              onMouseLeave={e => { if (t.code !== value) e.currentTarget.style.background = ''; }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 99, background: `oklch(70% 0.16 ${t.hue})`, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{t.label}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddQuestionMenu({ onAdd }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('mousedown', fn);
    return () => window.removeEventListener('mousedown', fn);
  }, []);
  const types = [
    { id: 'single',    label: 'Single choice', desc: 'One correct answer',     icon: 'radio' },
    { id: 'truefalse', label: 'True / False',  desc: 'Binary question',        icon: 'flag'  },
    { id: 'multi',     label: 'Multi choice',  desc: 'Multiple correct answers', icon: 'check' },
    { id: 'open',      label: 'Open answer',   desc: 'Free-text response',     icon: 'type'  },
  ];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn--icon"
        style={{ background: 'var(--text)', color: 'var(--bg)', padding: 4, borderRadius: 6 }}
        onClick={() => setOpen(o => !o)}
      ><Icon name="plus" size={14} /></button>
      {open && (
        <div className="card scale-in" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          width: 240, padding: 6, boxShadow: 'var(--shadow-lg)', zIndex: 5,
        }}>
          {types.map(t => (
            <button
              key={t.id}
              onClick={() => { onAdd(t.id); setOpen(false); }}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
                <Icon name={t.icon} size={14} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionListItem({ question, index, active, onClick, onDuplicate, onDelete, onMoveUp, onMoveDown }) {
  const typeLabels = { single: 'Single', multi: 'Multi', truefalse: 'T/F', open: 'Open' };
  return (
    <div
      className="q-list-item"
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderRadius: 'var(--r-md)',
        background: active ? 'var(--surface)' : 'transparent',
        border: '1px solid ' + (active ? 'var(--border-strong)' : 'transparent'),
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
        cursor: 'pointer', marginBottom: 4,
        transition: 'all 150ms var(--ease)',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}
      onMouseEnter={e => !active && (e.currentTarget.style.background = 'var(--surface)')}
      onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
    >
      <div className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', width: 18, paddingTop: 2, flexShrink: 0 }}>
        {String(index + 1).padStart(2, '0')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.35, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {question.prompt || <span style={{ color: 'var(--text-faint)' }}>Untitled question</span>}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3, display: 'flex', gap: 8 }}>
          <span>{typeLabels[question.type]}</span>
          <span>·</span>
          <span className="mono">{question.timeLimit}s</span>
          <span>·</span>
          <span className="mono">{question.points}pt</span>
        </div>
      </div>
      <div className="q-list-item__actions" onClick={e => e.stopPropagation()}>
        {onMoveUp && (
          <button className="btn btn--ghost btn--icon" style={{ padding: 3 }} onClick={onMoveUp} title="Move up">
            <Icon name="chevronLeft" size={12} style={{ transform: 'rotate(90deg)', display: 'block' }} />
          </button>
        )}
        {onMoveDown && (
          <button className="btn btn--ghost btn--icon" style={{ padding: 3 }} onClick={onMoveDown} title="Move down">
            <Icon name="chevronLeft" size={12} style={{ transform: 'rotate(-90deg)', display: 'block' }} />
          </button>
        )}
        <button className="btn btn--ghost btn--icon" style={{ padding: 3 }} onClick={onDuplicate} title="Duplicate">
          <Icon name="copy" size={12} />
        </button>
        <button className="btn btn--ghost btn--icon" style={{ padding: 3, color: 'oklch(55% 0.18 25)' }} onClick={onDelete} title="Delete">
          <Icon name="trash" size={12} />
        </button>
      </div>
    </div>
  );
}

function QuestionEditor({ question, index, total, onChange, quizId }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const hasImage = !!(question.imageUrl && question.imageUrl.trim());

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image must be under 10 MB'); return; }
    if (!quizId || !question.id) return;
    const fd = new FormData();
    fd.append('image', file);
    setUploading(true);
    window.API.upload('/quizzes/' + quizId + '/questions/' + question.id + '/image/', fd)
      .then(data => onChange({ imageUrl: data.image }))
      .catch(err => alert(err.message))
      .finally(() => setUploading(false));
  };

  return (
    <div style={{ width: '100%', maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Question {index + 1} / {total}
        </span>
        <span className="pill">{question.type}</span>
      </div>

      <textarea
        value={question.prompt}
        onChange={e => onChange({ prompt: e.target.value })}
        placeholder="What's your question?"
        rows={2}
        style={{
          width: '100%', fontSize: 28, fontWeight: 600,
          letterSpacing: '-0.02em', lineHeight: 1.25,
          padding: '12px 0', resize: 'none', marginBottom: 24, textWrap: 'pretty',
        }}
      />

      <div
        className="card"
        style={{
          padding: hasImage ? 0 : 20, marginBottom: 12,
          aspectRatio: '16/9', display: 'grid', placeItems: 'center',
          background: 'var(--bg-2)', borderStyle: hasImage ? 'solid' : 'dashed',
          cursor: hasImage ? 'default' : 'pointer', maxHeight: 260,
          position: 'relative', overflow: 'hidden',
        }}
        onClick={() => !hasImage && fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleImageFile(e.dataTransfer.files?.[0]); }}
      >
        {hasImage ? (
          <>
            <img src={question.imageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6, zIndex: 2 }}>
              <button className="btn btn--sm" style={{ background: 'oklch(100% 0 0 / 0.9)', color: 'oklch(15% 0 0)', fontSize: 11 }}
                onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>Replace</button>
              <button className="btn btn--sm" style={{ background: 'oklch(100% 0 0 / 0.9)', color: 'oklch(45% 0.18 25)', fontSize: 11 }}
                onClick={e => { e.stopPropagation(); onChange({ imageUrl: '' }); }}>Remove</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-faint)', pointerEvents: 'none' }}>
            {uploading ? (
              <div style={{ fontSize: 13, fontWeight: 500 }}>Uploading…</div>
            ) : (
              <>
                <Icon name="image" size={28} />
                <div style={{ fontSize: 13, marginTop: 8, fontWeight: 500 }}>Click or drop an image</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>JPG, PNG · up to 10 MB</div>
              </>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { handleImageFile(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
          textTransform: 'uppercase', letterSpacing: '0.08em', pointerEvents: 'none',
        }}>URL</span>
        <input
          className="input"
          placeholder="or paste an image URL (https://...)"
          value={question.imageUrl || ''}
          onChange={e => onChange({ imageUrl: e.target.value })}
          style={{ paddingLeft: 52, fontSize: 13 }}
        />
      </div>

      {(question.type === 'single' || question.type === 'multi' || question.type === 'truefalse') && (
        <OptionsEditor question={question} onChange={onChange} />
      )}
      {question.type === 'open' && (
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Expected answer</label>
          <input
            className="input input--lg" style={{ marginTop: 8 }}
            value={question.answer || ''}
            onChange={e => onChange({ answer: e.target.value })}
            placeholder="Type the correct answer..."
          />
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>
            Player answers are auto-matched with fuzzy logic. You can review uncertain ones after the session.
          </p>
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ question, onChange }) {
  const updateOption = (id, updates) => {
    onChange({ options: question.options.map(o => o.id === id ? { ...o, ...updates } : o) });
  };
  const toggleCorrect = (id) => {
    if (question.type === 'single' || question.type === 'truefalse') {
      onChange({ options: question.options.map(o => ({ ...o, correct: o.id === id })) });
    } else {
      const o = question.options.find(o => o.id === id);
      updateOption(id, { correct: !o.correct });
    }
  };
  const addOption = () => {
    const newId = String.fromCharCode(97 + question.options.length);
    onChange({ options: [...question.options, { id: newId, text: '', correct: false }] });
  };
  const removeOption = (id) => {
    if (question.options.length <= 2) return;
    onChange({ options: question.options.filter(o => o.id !== id) });
  };
  return (
    <div>
      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'block' }}>
        {question.type === 'multi' ? 'Choose all correct answers' : 'Choose the correct answer'}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {question.options.map((opt, i) => (
          <div
            key={opt.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: 'var(--surface)',
              border: '1px solid ' + (opt.correct ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 'var(--r-md)', transition: 'border-color 150ms',
            }}
          >
            <button
              onClick={() => toggleCorrect(opt.id)}
              style={{
                width: 22, height: 22, borderRadius: question.type === 'multi' ? 6 : 999,
                border: '2px solid ' + (opt.correct ? 'var(--accent-strong)' : 'var(--border-strong)'),
                background: opt.correct ? 'var(--accent)' : 'transparent',
                display: 'grid', placeItems: 'center', color: 'var(--accent-fg)',
                flexShrink: 0, transition: 'all 150ms var(--ease)',
              }}
            >
              {opt.correct && <Icon name="check" size={12} strokeWidth={3} />}
            </button>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', width: 14 }}>{String.fromCharCode(65 + i)}</span>
            <input
              value={opt.text}
              onChange={e => updateOption(opt.id, { text: e.target.value })}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              disabled={question.type === 'truefalse'}
              style={{ flex: 1, fontSize: 15, padding: 0, opacity: question.type === 'truefalse' ? 0.7 : 1 }}
            />
            {question.type !== 'truefalse' && question.options.length > 2 && (
              <button className="btn btn--ghost btn--icon" onClick={() => removeOption(opt.id)}>
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      {question.type !== 'truefalse' && question.options.length < 6 && (
        <button onClick={addOption} className="btn btn--ghost btn--sm" style={{ marginTop: 10 }}>
          <Icon name="plus" size={14} /> Add option
        </button>
      )}
    </div>
  );
}

function Inspector({ question, onChange, description, onDescription }) {
  return (
    <div>
      {/* Quiz settings */}
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14 }}>
        Quiz
      </div>
      <Field label="Description">
        <textarea
          className="input"
          value={description}
          onChange={e => onDescription(e.target.value)}
          placeholder="Short description shown on quiz cards…"
          rows={3}
          style={{ fontSize: 13, resize: 'vertical', lineHeight: 1.5, width: '100%' }}
        />
      </Field>

      <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '20px 0' }} />

      {/* Question settings */}
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16 }}>
        Question
      </div>

      {question ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="Time limit" hint="seconds">
            <div style={{ display: 'flex', gap: 6 }}>
              {[10, 20, 30, 45, 60].map(t => (
                <button
                  key={t}
                  onClick={() => onChange({ timeLimit: t })}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 500,
                    borderRadius: 6,
                    background: question.timeLimit === t ? 'var(--text)' : 'var(--surface)',
                    color: question.timeLimit === t ? 'var(--bg)' : 'var(--text-muted)',
                    border: '1px solid ' + (question.timeLimit === t ? 'var(--text)' : 'var(--border)'),
                    fontFamily: 'JetBrains Mono',
                  }}
                >{t}</button>
              ))}
            </div>
          </Field>

          <Field label="Points" hint="per correct">
            <div style={{ display: 'flex', gap: 6 }}>
              {[50, 100, 150, 200].map(p => (
                <button
                  key={p}
                  onClick={() => onChange({ points: p })}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 500,
                    borderRadius: 6,
                    background: question.points === p ? 'var(--text)' : 'var(--surface)',
                    color: question.points === p ? 'var(--bg)' : 'var(--text-muted)',
                    border: '1px solid ' + (question.points === p ? 'var(--text)' : 'var(--border)'),
                    fontFamily: 'JetBrains Mono',
                  }}
                >{p}</button>
              ))}
            </div>
          </Field>

          <Field label="Shuffle options">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Randomize order per player</span>
              <Toggle on={question.shuffleOptions || false} onChange={v => onChange({ shuffleOptions: v })} />
            </div>
          </Field>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-faint)', textAlign: 'center', paddingTop: 12 }}>
          Select a question to edit its settings
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{label}</label>
        {hint && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

window.Editor = Editor;
