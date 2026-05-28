// === Live mode (host view) ===

function QRCodeCanvas({ value, size }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value || !window.qrcode) return;
    const qr = window.qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const cells = qr.getModuleCount();
    const cell = Math.floor(size / cells);
    const actual = cell * cells;
    canvas.width = actual; canvas.height = actual;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, actual, actual);
    ctx.fillStyle = '#000';
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if (qr.isDark(r, c)) ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
  }, [value, size]);
  return <canvas ref={ref} style={{ borderRadius: 8, display: 'block' }} />;
}

function hashColor(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 37 + s.charCodeAt(i)) & 0xffff;
  return h % 360;
}

function avatarText(username) {
  return (username || '?').slice(0, 2).toUpperCase();
}

function LiveHost({ onNav }) {
  window.useLang();
  const [phase, setPhase] = useState('loading'); // loading | error | lobby | question | waiting | results | podium
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const sessionIdRef = React.useRef(null);
  const [pin, setPin] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const questionsRef = React.useRef([]);
  const [participants, setParticipants] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const qIdxRef = React.useRef(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answerDist, setAnswerDist] = useState([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [hostSettings, setHostSettings] = useState({ timePerQuestion: 30, maxPlayers: 20 });

  // Create session + load quiz on mount
  useEffect(() => {
    const params = window.getQueryParams();
    const quizId = params.quizId;
    if (!quizId) {
      setError(t('live.no_quiz'));
      setPhase('error');
      return;
    }
    Promise.all([
      window.API.post('/sessions/create/', { quiz_id: parseInt(quizId, 10) }),
      window.API.get('/quizzes/' + quizId + '/'),
    ]).then(([session, quiz]) => {
      setSessionId(session.id);
      sessionIdRef.current = session.id;
      setPin(session.code);
      setQuizTitle(quiz.title);
      const qs = (quiz.questions || []).map(window.API.fromBackendQuestion);
      setQuestions(qs);
      questionsRef.current = qs;
      setPhase('lobby');
    }).catch(err => {
      setError(err.message || t('live.err_create'));
      setPhase('error');
    });
  }, []);

  // Poll real players in lobby every 2.5s
  useEffect(() => {
    if (phase !== 'lobby' || !sessionIdRef.current) return;
    const poll = () => {
      window.API.get('/sessions/' + sessionIdRef.current + '/')
        .then(data => setParticipants(data.players || []))
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, 2500);
    return () => clearInterval(id);
  }, [phase]);

  // Question: countdown + poll answer count
  useEffect(() => {
    if (phase !== 'question' || !sessionIdRef.current) return;
    const q = questionsRef.current[qIdxRef.current];
    if (!q) return;

    setAnsweredCount(0);
    setTimeLeft(hostSettings.timePerQuestion);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setTimeout(() => setPhase('waiting'), 300);
    };

    const tick = setInterval(() => {
      setTimeLeft(prev => {
        const next = parseFloat((prev - 0.1).toFixed(1));
        if (next <= 0) { finish(); return 0; }
        return next;
      });
    }, 100);

    const pollId = setInterval(() => {
      window.API.get('/sessions/' + sessionIdRef.current + '/questions/' + q.id + '/status/')
        .then(data => {
          setAnsweredCount(data.answered);
          if (data.total > 0 && data.answered >= data.total) finish();
        }).catch(() => {});
    }, 1500);

    return () => { clearInterval(tick); clearInterval(pollId); };
  }, [phase, qIdx, hostSettings.timePerQuestion]);

  // Waiting: fetch final distribution + refresh scores, then advance to results
  useEffect(() => {
    if (phase !== 'waiting' || !sessionIdRef.current) return;
    const q = questionsRef.current[qIdxRef.current];
    if (q) {
      window.API.get('/sessions/' + sessionIdRef.current + '/questions/' + q.id + '/status/')
        .then(data => setAnswerDist(data.distribution || []))
        .catch(() => {});
    }
    window.API.get('/sessions/' + sessionIdRef.current + '/')
      .then(data => setParticipants(data.players || []))
      .catch(() => {});
    const t = setTimeout(() => setPhase('results'), 1000);
    return () => clearTimeout(t);
  }, [phase]);

  const kickParticipant = (userId) => {
    window.API.post('/sessions/' + sessionId + '/kick/', { user_id: userId })
      .then(() => setParticipants(ps => ps.filter(p => p.user_id !== userId)))
      .catch(() => {});
  };

  const startQuiz = () => {
    if (questionsRef.current.length === 0) {
      showToast(t('live.no_q_toast'), 'error');
      return;
    }
    window.API.post('/sessions/' + sessionId + '/start/', {
      time_per_question: hostSettings.timePerQuestion,
      max_players: hostSettings.maxPlayers,
    }).then(() => {
      qIdxRef.current = 0;
      setQIdx(0);
      setPhase('question');
    }).catch(err => showToast(err.message, 'error'));
  };

  const nextQuestion = () => {
    const next = qIdx + 1;
    if (next >= questionsRef.current.length) {
      setPhase('podium');
    } else {
      qIdxRef.current = next;
      setQIdx(next);
      setPhase('question');
    }
  };

  if (phase === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
        {t('live.loading')}
      </div>
    );
  }
  if (phase === 'error') {
    return (
      <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{t('live.err_title')}</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 20 }}>{error}</div>
          <button className="btn btn--primary" onClick={() => onNav('dashboard')}>{t('live.back_dash')}</button>
        </div>
      </div>
    );
  }

  const currentQ = questions[qIdx];

  if (phase === 'lobby') return (
    <LiveLobby
      pin={pin}
      quizTitle={quizTitle}
      participants={participants}
      onStart={startQuiz}
      onExit={() => onNav('dashboard')}
      onKick={kickParticipant}
      hostSettings={hostSettings}
      onHostSettingsChange={setHostSettings}
    />
  );
  if (phase === 'question') return (
    <LiveQuestion
      question={currentQ}
      idx={qIdx}
      total={questions.length}
      answered={answeredCount}
      totalP={participants.length}
      timeLeft={timeLeft}
      timePerQuestion={hostSettings.timePerQuestion}
      onExit={() => onNav('dashboard')}
      onSkip={() => setPhase('waiting')}
    />
  );
  if (phase === 'waiting') return (
    <LiveWaitForOthers
      answered={answeredCount}
      totalP={participants.length}
      idx={qIdx}
      total={questions.length}
      onExit={() => onNav('dashboard')}
    />
  );
  if (phase === 'results') return (
    <LiveResults
      question={currentQ}
      answerDist={answerDist}
      idx={qIdx}
      total={questions.length}
      participants={participants}
      onNext={nextQuestion}
      onExit={() => onNav('dashboard')}
    />
  );
  if (phase === 'podium') return (
    <LivePodium
      participants={participants}
      onExit={() => onNav('dashboard')}
      onAnalytics={() => onNav('analytics')}
    />
  );
  return null;
}

function LiveLobby({ pin, quizTitle, participants, onStart, onExit, onKick, hostSettings, onHostSettingsChange }) {
  return (
    <div className="live fade-in" data-screen-label="05a Live lobby">
      <div className="live__header">
        <button className="btn btn--ghost btn--icon" onClick={onExit}><Icon name="x" size={18} /></button>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          {t('live.hosting')} <span style={{ color: 'var(--text)' }}>{quizTitle || 'Quiz'}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="pill" style={{ background: 'oklch(60% 0.18 25 / 0.12)', color: 'oklch(50% 0.18 25)', border: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'oklch(60% 0.18 25)', animation: 'pulse-ring 1.5s infinite' }} />
            {t('live.live_pill')}
          </span>
        </div>
      </div>

      <div className="live__lobby">
        <div className="live__lobby-side">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('live.join_at')}</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 32 }}>quiz.io/play</div>

          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{t('live.game_code')}</div>
          <div className="mono" style={{ fontSize: 76, fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1, marginBottom: 20 }}>
            {pin}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
            <button className="btn btn--secondary" onClick={() => { navigator.clipboard?.writeText(pin); showToast(t('live.code_copied'), 'success'); }}>
              <Icon name="copy" size={14} /> {t('live.copy_code')}
            </button>
            <button className="btn btn--secondary" onClick={() => { const u = window.location.origin + '/sessions.html?code=' + pin; navigator.clipboard?.writeText(u); showToast(t('live.link_copied'), 'success'); }}>
              <Icon name="share" size={14} /> {t('live.copy_link')}
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{t('live.scan')}</div>
            <div style={{
              display: 'inline-block', padding: 10, background: '#fff',
              borderRadius: 12, border: '1px solid var(--border)',
            }}>
              <QRCodeCanvas value={window.location.origin + '/sessions.html?code=' + pin} size={140} />
            </div>
          </div>

          <HostSettings settings={hostSettings} onChange={onHostSettingsChange} />

          <button className="btn btn--accent btn--xl" onClick={onStart} style={{ alignSelf: 'flex-start', marginTop: 24 }}>
            {t('live.start_with')} {participants.length} {participants.length === 1 ? t('live.player') : t('live.players')} <Icon name="arrowRight" size={16} />
          </button>
        </div>

        <div className="live__lobby-participants">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {t('live.lobby_players')}
            </div>
            <span className="mono pill" style={{ fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: 'oklch(60% 0.18 145)', animation: 'pulse-ring 2s infinite' }} />
              {participants.length}
            </span>
          </div>
          <div className="live__lobby-grid">
            {participants.map((p, i) => {
              const hue = hashColor(p.username);
              return (
                <div key={p.user_id || p.username} className="scale-in participant-chip" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: 12, borderRadius: 'var(--r-md)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  animationDelay: `${i * 60}ms`,
                  position: 'relative',
                }}>
                  <div className="avatar" style={{
                    background: `linear-gradient(135deg, oklch(80% 0.14 ${hue}), oklch(70% 0.18 ${hue + 40}))`,
                    color: `oklch(20% 0.05 ${hue})`,
                  }}>{avatarText(p.username)}</div>
                  <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.username}</span>
                  <button
                    className="participant-kick"
                    onClick={(e) => { e.stopPropagation(); onKick(p.user_id); }}
                    title={`Remove ${p.username}`}
                  >
                    <Icon name="x" size={13} strokeWidth={2.4} />
                  </button>
                </div>
              );
            })}
            {participants.length === 0 && (
              <div style={{
                padding: 24, borderRadius: 'var(--r-md)',
                background: 'transparent',
                border: '1px dashed var(--border-strong)',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-faint)',
                gridColumn: '1 / -1',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>{t('live.wait_p')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>{t('live.share_hint')}</div>
                </div>
              </div>
            )}
            {participants.length > 0 && (
              <div style={{
                padding: 12, borderRadius: 'var(--r-md)',
                background: 'transparent',
                border: '1px dashed var(--border-strong)',
                display: 'grid', placeItems: 'center',
                color: 'var(--text-faint)',
                minHeight: 56,
              }}>
                <span style={{ fontSize: 12 }}>{t('live.wait_more')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {liveStyles}
    </div>
  );
}

function LiveQuestion({ question, idx, total, answered, totalP, timeLeft, timePerQuestion, onSkip, onExit }) {
  const pct = totalP > 0 ? (answered / totalP) * 100 : 0;
  const timePct = (timeLeft / timePerQuestion) * 100;
  return (
    <div className="live fade-in" data-screen-label="05b Live question">
      <div className="live__header">
        <button className="btn btn--ghost btn--icon" onClick={onExit}><Icon name="x" size={18} /></button>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Q{idx + 1} / {total}
        </span>
        <div style={{ flex: 1 }} />
        <span className="pill mono"><Icon name="users" size={12} /> {totalP}</span>
        <button className="btn btn--secondary btn--sm" onClick={onSkip}>{t('live.end_q')}</button>
      </div>

      <div className="live__qstage">
        <div style={{ maxWidth: 1100, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <div style={{ position: 'relative', width: 96, height: 96 }}>
              <svg width={96} height={96} viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={48} cy={48} r={42} fill="none" stroke="var(--bg-2)" strokeWidth={6} />
                <circle
                  cx={48} cy={48} r={42} fill="none"
                  stroke={timePct < 25 ? 'var(--danger)' : 'var(--text)'}
                  strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={`${(timePct / 100) * (2 * Math.PI * 42)} ${2 * Math.PI * 42}`}
                  style={{ transition: 'stroke-dasharray 100ms linear' }}
                />
              </svg>
              <div className="mono" style={{
                position: 'absolute', inset: 0,
                display: 'grid', placeItems: 'center',
                fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em',
              }}>{Math.ceil(timeLeft)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{
                fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700,
                letterSpacing: '-0.03em', lineHeight: 1.15,
                textWrap: 'balance',
              }}>{question ? question.prompt : ''}</h1>
            </div>
          </div>

          {question && (question.type === 'single' || question.type === 'multi' || question.type === 'truefalse') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {question.options.map((opt, i) => (
                <div key={opt.id} style={{
                  padding: '20px 22px',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--r-lg)',
                  display: 'flex', alignItems: 'center', gap: 14,
                  fontSize: 18, fontWeight: 500,
                  minHeight: 76,
                }}>
                  <span className="mono" style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'var(--bg-2)',
                    display: 'grid', placeItems: 'center',
                    fontSize: 14, fontWeight: 600,
                  }}>{String.fromCharCode(65 + i)}</span>
                  <span>{opt.text}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              <span className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{answered}</span>
              <span style={{ marginLeft: 4 }}>/ {totalP} {t('live.answered')}</span>
            </div>
            <div style={{ flex: 1, height: 8, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{
                width: pct + '%', height: '100%',
                background: 'var(--accent)',
                borderRadius: 99,
                transition: 'width 300ms var(--ease)',
              }} />
            </div>
            <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{Math.round(pct)}%</span>
          </div>
        </div>
      </div>

      {liveStyles}
    </div>
  );
}

function LiveResults({ question, answerDist, idx, total, participants, onNext, onExit }) {
  // Use real distribution if available, fall back to question options with 0
  const dist = answerDist.length > 0
    ? answerDist
    : (question ? question.options.map(o => ({ id: o.id, text: o.text, is_correct: o.correct, count: 0 })) : []);

  const totalAnswers = dist.reduce((s, d) => s + d.count, 0) || 1;
  const maxCount = Math.max(...dist.map(d => d.count), 1);
  const top3 = [...participants].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className="live fade-in" data-screen-label="05d Live results">
      <div className="live__header">
        <button className="btn btn--ghost btn--icon" onClick={onExit}><Icon name="x" size={18} /></button>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('live.q_label')}{idx + 1} {t('live.results_label')}</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn--accent" onClick={onNext}>
          {idx === total - 1 ? t('live.show_podium') : t('live.next_q')} <Icon name="arrowRight" size={14} />
        </button>
      </div>

      <div className="live__results">
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 28, textWrap: 'balance' }}>
            {question ? question.prompt : ''}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dist.map((d, i) => (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px',
                background: d.is_correct ? 'oklch(95% 0.08 130)' : 'var(--surface)',
                border: '1px solid ' + (d.is_correct ? 'oklch(75% 0.20 130)' : 'var(--border)'),
                borderRadius: 'var(--r-lg)',
              }}>
                <span className="mono" style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: d.is_correct ? 'var(--accent)' : 'var(--bg-2)',
                  color: d.is_correct ? 'var(--accent-fg)' : 'var(--text-muted)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 12, fontWeight: 600,
                  flexShrink: 0,
                }}>{String.fromCharCode(65 + i)}</span>
                <span style={{ fontSize: 15, fontWeight: 500, minWidth: 140 }}>{d.text}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(d.count / maxCount) * 100}%`,
                    height: '100%',
                    background: d.is_correct ? 'oklch(70% 0.20 130)' : 'var(--text-faint)',
                    borderRadius: 99,
                    animation: 'slideUp 600ms var(--ease)',
                  }} />
                </div>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, minWidth: 50, textAlign: 'right' }}>
                  {d.count} <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>({Math.round((d.count / totalAnswers) * 100)}%)</span>
                </span>
                {d.is_correct && <Icon name="check" size={16} style={{ color: 'oklch(50% 0.16 130)' }} />}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            {t('live.leaderboard')}
          </div>
          {top3.length === 0 ? (
            <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>{t('live.no_players')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {top3.map((p, i) => {
                const hue = hashColor(p.username);
                return (
                  <div key={p.user_id || p.username} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                  }}>
                    <span className="mono" style={{ fontSize: 18, fontWeight: 600, color: i === 0 ? 'oklch(70% 0.16 80)' : 'var(--text-muted)', width: 20 }}>
                      {i + 1}
                    </span>
                    <div className="avatar" style={{
                      background: `linear-gradient(135deg, oklch(80% 0.14 ${hue}), oklch(70% 0.18 ${hue + 40}))`,
                    }}>{avatarText(p.username)}</div>
                    <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{p.username}</span>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{p.score}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {liveStyles}
    </div>
  );
}

function LivePodium({ participants, onExit, onAnalytics }) {
  const top3 = [...participants].sort((a, b) => b.score - a.score).slice(0, 3);
  const [first, second, third] = top3;
  const order = [second, first, third].filter(Boolean);
  const heights = { 1: 220, 0: 160, 2: 120 };

  return (
    <div className="live fade-in" data-screen-label="05e Live podium" style={{ background: 'var(--bg-2)' }}>
      <div className="live__header">
        <button className="btn btn--ghost btn--icon" onClick={onExit}><Icon name="x" size={18} /></button>
        <div style={{ flex: 1 }} />
        <button className="btn btn--primary btn--sm" onClick={onAnalytics}>{t('live.view_analytics')} <Icon name="arrowRight" size={14} /></button>
      </div>

      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center', maxWidth: 800, width: '100%' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('live.final_podium')}</div>
          <h1 style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 8, marginBottom: 60 }}>
            {t('live.game_over')}
          </h1>

          {top3.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>{t('live.no_participated')}</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16 }}>
              {order.map((p, i) => {
                const rank = top3.indexOf(p);
                const hue = hashColor(p.username);
                return (
                  <div key={p.user_id || p.username} className="slide-up" style={{ width: 200, animationDelay: `${i * 150}ms` }}>
                    <div className="avatar avatar--lg" style={{
                      margin: '0 auto 12px',
                      width: rank === 0 ? 64 : 52, height: rank === 0 ? 64 : 52,
                      fontSize: rank === 0 ? 20 : 17,
                      background: `linear-gradient(135deg, oklch(80% 0.14 ${hue}), oklch(70% 0.18 ${hue + 40}))`,
                    }}>{avatarText(p.username)}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{p.username}</div>
                    <div className="mono" style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>{p.score} {t('live.pts')}</div>
                    <div style={{
                      height: heights[i],
                      background: rank === 0 ? 'var(--accent)' : 'var(--surface)',
                      borderRadius: '12px 12px 0 0',
                      border: '1px solid ' + (rank === 0 ? 'transparent' : 'var(--border)'),
                      borderBottom: 'none',
                      display: 'grid', placeItems: 'center',
                      color: rank === 0 ? 'var(--accent-fg)' : 'var(--text-muted)',
                      fontSize: 48, fontWeight: 700, letterSpacing: '-0.04em',
                      fontFamily: 'JetBrains Mono',
                    }}>{rank + 1}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {liveStyles}
    </div>
  );
}

const liveStyles = (
  <style>{`
    .live {
      height: 100vh;
      display: flex; flex-direction: column;
      background: var(--bg);
    }
    .live__header {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 16px;
      background: var(--bg-2);
    }
    .live__lobby {
      flex: 1;
      display: grid; grid-template-columns: 1.1fr 1fr;
      gap: 40px;
      padding: 48px 40px;
      max-width: 1320px;
      margin: 0 auto;
      width: 100%;
    }
    .live__lobby-side { display: flex; flex-direction: column; }
    .live__lobby-participants {
      background: var(--bg-2);
      border: 1px solid var(--border);
      border-radius: var(--r-xl);
      padding: 24px;
      overflow-y: auto;
    }
    .live__lobby-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 8px;
    }
    .live__qstage {
      flex: 1;
      display: grid; place-items: center;
      padding: 40px;
    }
    .live__results {
      flex: 1;
      display: grid; grid-template-columns: 1.4fr 1fr;
      gap: 40px;
      padding: 40px;
      max-width: 1320px;
      margin: 0 auto;
      width: 100%;
    }

    .participant-chip { transition: border-color 150ms var(--ease), background 150ms var(--ease); }
    .participant-chip:hover { border-color: var(--border-strong); background: var(--surface-2); }
    .participant-kick {
      width: 22px; height: 22px; border-radius: 999px;
      display: grid; place-items: center;
      background: transparent; color: var(--text-faint);
      opacity: 0;
      transition: all 150ms var(--ease);
      flex-shrink: 0;
    }
    .participant-chip:hover .participant-kick { opacity: 1; }
    .participant-kick:hover {
      background: oklch(60% 0.18 25 / 0.12);
      color: oklch(55% 0.20 25);
    }
    .participant-kick:focus-visible { opacity: 1; outline: 2px solid var(--text); outline-offset: 2px; }
  `}</style>
);

function HostSettings({ settings, onChange }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon name="settings" size={12} />
        {t('live.hs_title')}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>{t('live.hs_time')}</label>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{settings.timePerQuestion}s</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[10, 20, 30, 45, 60, 90].map(t => (
            <button
              key={t}
              onClick={() => onChange({ ...settings, timePerQuestion: t })}
              className="mono"
              style={{
                flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 500, borderRadius: 6,
                background: settings.timePerQuestion === t ? 'var(--text)' : 'var(--bg-2)',
                color: settings.timePerQuestion === t ? 'var(--bg)' : 'var(--text-muted)',
                border: '1px solid ' + (settings.timePerQuestion === t ? 'var(--text)' : 'var(--border)'),
              }}
            >{t}</button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>{t('live.hs_max')}</label>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{settings.maxPlayers}</span>
        </div>
        <input
          type="range"
          min={2} max={100} step={1}
          value={settings.maxPlayers}
          onChange={e => onChange({ ...settings, maxPlayers: +e.target.value })}
          style={{ width: '100%', accentColor: 'var(--text)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
          <span>2</span><span>25</span><span>50</span><span>75</span><span>100</span>
        </div>
      </div>
    </div>
  );
}

function LiveWaitForOthers({ answered, totalP, idx, total, onExit }) {
  return (
    <div className="live fade-in" data-screen-label="05c Live wait">
      <div className="live__header">
        <button className="btn btn--ghost btn--icon" onClick={onExit}><Icon name="x" size={18} /></button>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Q{idx + 1} / {total}</span>
        <div style={{ flex: 1 }} />
      </div>
      <div className="live__qstage">
        <div className="slide-up" style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 999,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'grid', placeItems: 'center',
            margin: '0 auto 24px',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: -8, borderRadius: 999,
              border: '2px solid var(--accent)',
              animation: 'pulse-ring 1.6s infinite',
            }} />
            <Icon name="clock" size={28} strokeWidth={1.6} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {t('live.times_up')}
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 8, lineHeight: 1.05 }}>
            <span className="mono">{answered}</span>
            <span style={{ color: 'var(--text-muted)' }}> / </span>
            <span className="mono">{totalP}</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>
            {t('live.showing_results')}
          </p>

          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from({ length: Math.min(totalP, 20) }).map((_, i) => (
              <div key={i} style={{
                height: 4, borderRadius: 99,
                background: i < answered ? 'var(--accent)' : 'var(--bg-2)',
                transition: 'background 200ms var(--ease)',
                transitionDelay: `${i * 30}ms`,
              }} />
            ))}
          </div>
        </div>
      </div>
      {liveStyles}
    </div>
  );
}

// Router: host view if ?quizId, participant view if ?sessionId
function Live({ onNav }) {
  const p = window.getQueryParams();
  if (p.sessionId && !p.quizId) return <LiveParticipant sessionId={+p.sessionId} onNav={onNav} />;
  return <LiveHost onNav={onNav} />;
}

// ─── Participant (player) live view ──────────────────────────────────────────
function LiveParticipant({ sessionId, onNav }) {
  window.useLang();
  const [phase, setPhase]       = useState('loading'); // loading|error|waiting|question|feedback|done
  const [session, setSession]   = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx]         = useState(0);
  const [selected, setSelected] = useState(null);
  const [answerResult, setAnswerResult] = useState(null); // { correct }
  const [totalScore, setTotalScore]     = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [error, setError]       = useState('');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Load session on mount
  useEffect(() => {
    window.API.get('/sessions/' + sessionId + '/')
      .then(async (s) => {
        setSession(s);
        if (s.has_ended) { setPhase('done'); return; }
        if (!s.has_started) { setPhase('waiting'); return; }
        const quiz = await window.API.get('/quizzes/' + s.quiz_id + '/');
        const qs = (quiz.questions || []).map(window.API.fromBackendQuestion);
        if (!qs.length) { setError('This quiz has no questions.'); setPhase('error'); return; }
        setQuestions(qs);
        setPhase('question');
      })
      .catch(err => { setError(err.message || 'Could not load session.'); setPhase('error'); });
  }, []);

  // Poll for start while in lobby
  useEffect(() => {
    if (phase !== 'waiting') return;
    const id = setInterval(async () => {
      try {
        const s = await window.API.get('/sessions/' + sessionId + '/');
        setSession(s);
        if (s.has_ended) { setPhase('done'); clearInterval(id); return; }
        if (s.has_started) {
          const quiz = await window.API.get('/quizzes/' + s.quiz_id + '/');
          const qs = (quiz.questions || []).map(window.API.fromBackendQuestion);
          setQuestions(qs);
          setPhase('question');
          clearInterval(id);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [phase]);

  // Countdown per question
  useEffect(() => {
    if (phase !== 'question') return;
    const tpq = session?.time_per_question || 30;
    setTimeLeft(tpq);
    const start = Date.now();
    const tick = setInterval(() => {
      const left = Math.max(0, tpq - (Date.now() - start) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(tick);
        if (phaseRef.current === 'question') { // didn't answer
          setAnswerResult({ correct: false });
          setPhase('feedback');
          setTimeout(() => advance(qIdx), 2000);
        }
      }
    }, 100);
    return () => clearInterval(tick);
  }, [phase, qIdx]);

  const advance = (idx) => {
    const next = idx + 1;
    if (next >= questions.length) { setPhase('done'); }
    else { setQIdx(next); setSelected(null); setAnswerResult(null); setPhase('question'); }
  };

  const submitAnswer = (opt, currentIdx) => {
    if (phaseRef.current !== 'question') return;
    setSelected(opt.id);
    setPhase('feedback');
    window.API.post('/sessions/' + sessionId + '/answer/', {
      question_id: questions[currentIdx].id,
      answer_id: opt.id,
    }).then(data => {
      setAnswerResult({ correct: data.correct });
      if (data.correct) setCorrectCount(c => c + 1);
      setTotalScore(data.score || 0);
    }).catch(() => {
      setAnswerResult({ correct: opt.correct });
      if (opt.correct) setCorrectCount(c => c + 1);
    });
    setTimeout(() => advance(currentIdx), 2000);
  };

  // ── Loading ──
  if (phase === 'loading') return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
      <span className="mono" style={{ fontSize: 13 }}>{t('live.connecting')}</span>
    </div>
  );

  // ── Error ──
  if (phase === 'error') return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>{error}</p>
        <button className="btn btn--secondary" onClick={() => onNav('sessions')}>{t('live.back_sessions')}</button>
      </div>
    </div>
  );

  // ── Waiting for host ──
  if (phase === 'waiting') return (
    <div className="live fade-in" data-screen-label="05p Participant lobby">
      <div className="live__header">
        <button className="btn btn--ghost btn--icon" onClick={() => onNav('sessions')}><Icon name="x" size={18} /></button>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
          {t('live.joined')} <span style={{ color: 'var(--text)' }}>{session?.quiz_title || 'Quiz'}</span>
        </span>
        <div style={{ flex: 1 }} />
      </div>
      <div className="live__qstage">
        <div className="slide-up" style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 999,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'grid', placeItems: 'center', margin: '0 auto 24px',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', inset: -8, borderRadius: 999, border: '2px solid var(--accent)', animation: 'pulse-ring 1.6s infinite' }} />
            <Icon name="users" size={30} strokeWidth={1.6} />
          </div>
          <div className="mono" style={{ fontSize: 64, fontWeight: 700, letterSpacing: '0.1em', lineHeight: 1, color: 'var(--accent)', marginBottom: 16 }}>
            {session?.code || '------'}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>
            {t('live.wait_host')}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {t('live.joined_hint_1')} <strong>{session?.quiz_title}</strong>. {t('live.joined_hint_2')}
          </p>
        </div>
      </div>
      {liveStyles}
    </div>
  );

  // ── Done ──
  if (phase === 'done') return (
    <div className="live fade-in" data-screen-label="05p Participant done">
      <div className="live__header">
        <button className="btn btn--ghost btn--icon" onClick={() => onNav('sessions')}><Icon name="x" size={18} /></button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{session?.quiz_title}</div>
        <div style={{ width: 36 }} />
      </div>
      <div className="live__qstage">
        <div className="slide-up" style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{
            width: 96, height: 96, borderRadius: 999,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            display: 'grid', placeItems: 'center', margin: '0 auto 24px',
          }}>
            <Icon name="star" size={44} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('live.your_result')}</div>
          <div className="mono" style={{ fontSize: 80, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginTop: 8 }}>{totalScore}</div>
          <p style={{ fontSize: 18, color: 'var(--text-muted)', marginTop: 12 }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{correctCount} of {questions.length}</span> {t('live.of_correct')}
          </p>
          <button className="btn btn--primary btn--lg" style={{ marginTop: 32 }} onClick={() => onNav('sessions')}>
            {t('live.back_sess_btn')}
          </button>
        </div>
      </div>
      {liveStyles}
    </div>
  );

  // ── Question / Feedback ──
  const q = questions[qIdx];
  const tpq = session?.time_per_question || 30;
  const timePct = (timeLeft / tpq) * 100;
  const danger = timePct < 25;
  const progressPct = ((qIdx + (phase !== 'question' ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="live fade-in" data-screen-label="05p Participant play">
      <div className="live__header">
        <button className="btn btn--ghost btn--icon" onClick={() => onNav('sessions')}><Icon name="x" size={18} /></button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, margin: '0 16px' }}>
          <div style={{ flex: 1, height: 4, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{ width: progressPct + '%', height: '100%', background: 'var(--text)', borderRadius: 99, transition: 'width 400ms var(--ease)' }} />
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{qIdx + 1} / {questions.length}</span>
        </div>
        <span className="pill mono"><Icon name="star" size={12} /> {totalScore}</span>
      </div>

      <div className="live__qstage">
        <div key={qIdx} className="slide-up" style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {t('live.q_label')} {qIdx + 1}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width={44} height={44} viewBox="0 0 44 44">
                <circle cx={22} cy={22} r={18} fill="none" stroke="var(--border)" strokeWidth={3} />
                <circle cx={22} cy={22} r={18} fill="none"
                  stroke={danger ? 'var(--danger)' : 'var(--text)'}
                  strokeWidth={3} strokeLinecap="round"
                  strokeDasharray={`${(timePct / 100) * (2 * Math.PI * 18)} ${2 * Math.PI * 18}`}
                  transform="rotate(-90 22 22)"
                  style={{ transition: 'stroke-dasharray 100ms linear' }}
                />
              </svg>
              <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: danger ? 'var(--danger)' : 'var(--text)' }}>{Math.ceil(timeLeft)}</span>
            </div>
          </div>

          {q.imageUrl && (
            <div style={{ marginBottom: 24, borderRadius: 'var(--r-lg)', overflow: 'hidden', maxHeight: 240 }}>
              <img src={q.imageUrl} alt="" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          <h2 style={{ fontSize: 'clamp(24px, 3vw, 38px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 36, textWrap: 'balance' }}>
            {q.prompt}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {q.options.map((opt, i) => {
              const isSelected = selected === opt.id;
              const showCorrect = phase === 'feedback' && opt.correct;
              const showWrong   = phase === 'feedback' && isSelected && !opt.correct;
              let bg = 'var(--surface)', border = 'var(--border)', color = 'var(--text)';
              if (showCorrect)      { bg = 'var(--accent)';           border = 'transparent';               color = 'var(--accent-fg)'; }
              else if (showWrong)   { bg = 'oklch(95% 0.06 30)';     border = 'oklch(60% 0.18 30)'; }
              else if (isSelected && phase === 'feedback') { bg = 'var(--bg-2)'; }
              return (
                <button key={opt.id} onClick={() => submitAnswer(opt, qIdx)}
                  disabled={phase !== 'question'}
                  style={{
                    padding: '20px 22px', background: bg, border: '1.5px solid ' + border,
                    borderRadius: 'var(--r-lg)', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 14,
                    fontSize: 17, fontWeight: 500, color,
                    transition: 'all 220ms var(--ease)', minHeight: 72,
                    cursor: phase === 'question' ? 'pointer' : 'default',
                  }}>
                  <span className="mono" style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'var(--bg-2)', display: 'grid', placeItems: 'center',
                    fontSize: 13, fontWeight: 600, flexShrink: 0,
                  }}>{String.fromCharCode(65 + i)}</span>
                  <span style={{ flex: 1 }}>{opt.text}</span>
                  {showCorrect && <Icon name="check" size={20} strokeWidth={2.5} />}
                  {showWrong   && <Icon name="x"     size={20} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>

          {phase === 'feedback' && (
            <div className="scale-in" style={{
              marginTop: 28, padding: '18px 20px', borderRadius: 'var(--r-lg)',
              background: answerResult?.correct ? 'oklch(96% 0.08 145)' : 'oklch(95% 0.04 30)',
              color:      answerResult?.correct ? 'oklch(30% 0.10 145)' : 'oklch(35% 0.10 30)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 999,
                  background: answerResult?.correct ? 'oklch(55% 0.18 145)' : 'oklch(60% 0.18 25)',
                  color: 'white', display: 'grid', placeItems: 'center',
                }}>
                  <Icon name={answerResult?.correct ? 'check' : 'x'} size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {answerResult?.correct ? t('live.correct') : selected ? t('live.not_quite') : t('live.times_up_p')}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {answerResult?.correct ? t('live.next_coming') : t('live.correct_above')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {liveStyles}
    </div>
  );
}

window.Live = Live;
