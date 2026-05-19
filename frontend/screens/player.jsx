// === Player view (solo practice mode — loads quiz once, runs fully offline) ===

function Player({ onNav }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [gameKey, setGameKey] = useState(0);
  const quizId = window.getQueryParams().quizId;

  useEffect(() => {
    if (!quizId) {
      setError('No quiz selected. Go back and pick a quiz to practice.');
      setLoading(false);
      return;
    }
    window.API.get('/quizzes/' + quizId + '/')
      .then(data => {
        setQuizTitle(data.title || 'Untitled quiz');
        const qs = (data.questions || []).map(window.API.fromBackendQuestion);
        if (!qs.length) {
          setError('This quiz has no questions yet. Add some in the editor first.');
          setLoading(false);
          return;
        }
        setQuestions(qs);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Could not load quiz.');
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
      <span className="mono" style={{ fontSize: 13 }}>Loading quiz…</span>
    </div>
  );

  if (error) return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'oklch(95% 0.04 25)', color: 'oklch(45% 0.18 25)',
          display: 'grid', placeItems: 'center', margin: '0 auto 20px',
        }}>
          <Icon name="x" size={24} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>
          Couldn't load quiz
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 24 }}>
          {error}
        </p>
        <button className="btn btn--primary" onClick={() => onNav('dashboard')}>
          Back to dashboard
        </button>
      </div>
    </div>
  );

  return (
    <PlayerGame
      key={gameKey}
      questions={questions}
      quizTitle={quizTitle}
      quizId={quizId}
      onNav={onNav}
      onPlayAgain={() => setGameKey(k => k + 1)}
    />
  );
}

function PlayerGame({ questions, quizTitle, quizId, onNav, onPlayAgain }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('question'); // question | answered | reveal | done
  const [selected, setSelected] = useState(null);
  const [selectedMulti, setSelectedMulti] = useState([]);
  const [openAnswer, setOpenAnswer] = useState('');
  const [scores, setScores] = useState([]);
  const [timeLeft, setTimeLeft] = useState(questions[0].timeLimit);
  const selectedMultiRef = React.useRef([]);
  const openAnswerRef = React.useRef('');

  const currentRaw = questions[idx];
  const current = React.useMemo(() => {
    if (!currentRaw.shuffleOptions || !currentRaw.options?.length) return currentRaw;
    const opts = [...currentRaw.options].sort(() => Math.random() - 0.5);
    return { ...currentRaw, options: opts };
  }, [currentRaw.id]);

  useEffect(() => {
    if (phase !== 'question') return;
    setTimeLeft(current.timeLimit);
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, current.timeLimit - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(tick);
        const t = current.type;
        if (t === 'multi') commitAnswer(selectedMultiRef.current);
        else if (t === 'open') commitAnswer(openAnswerRef.current);
        else commitAnswer(null);
      }
    }, 60);
    return () => clearInterval(tick);
  }, [idx, phase]);

  const commitAnswer = (val) => {
    let correct = false;
    let award = 0;
    if (current.type === 'single' || current.type === 'truefalse') {
      const opt = current.options.find(o => o.id === val);
      correct = !!opt?.correct;
    } else if (current.type === 'multi') {
      const correctSet = new Set(current.options.filter(o => o.correct).map(o => o.id));
      const picked = new Set(val || []);
      correct = correctSet.size === picked.size && [...correctSet].every(x => picked.has(x));
    } else if (current.type === 'open') {
      correct = (val || '').trim().toLowerCase() === (current.answer || '').toLowerCase();
    }
    if (correct) {
      const timeBonus = Math.round((timeLeft / current.timeLimit) * 0.5 * current.points);
      award = current.points + timeBonus;
    }
    setScores(s => [...s, { correct, award, question: current.id }]);
    setPhase('answered');
    setTimeout(() => setPhase('reveal'), 600);
  };

  const next = () => {
    if (idx === questions.length - 1) {
      setPhase('done');
    } else {
      setIdx(i => i + 1);
      setSelected(null);
      setSelectedMulti([]);
      selectedMultiRef.current = [];
      setOpenAnswer('');
      openAnswerRef.current = '';
      setPhase('question');
    }
  };

  const totalScore = scores.reduce((s, x) => s + x.award, 0);

  if (phase === 'done') {
    return (
      <PlayerResult
        scores={scores}
        total={questions.length}
        quizTitle={quizTitle}
        quizId={quizId}
        onExit={() => onNav('dashboard')}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  const progressPct = ((idx + (phase !== 'question' ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="player fade-in" data-screen-label="04 Player">
      <div className="player__header">
        <button className="btn btn--ghost btn--icon" onClick={() => onNav('dashboard')}>
          <Icon name="x" size={18} />
        </button>
        <div className="player__progress">
          <div className="player__progress-bar">
            <div style={{ width: progressPct + '%', transition: 'width 400ms var(--ease)' }} />
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            {idx + 1} / {questions.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {quizTitle && (
            <span style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
              maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{quizTitle}</span>
          )}
          <span className="pill mono">
            <Icon name="star" size={12} /> {totalScore}
          </span>
        </div>
      </div>

      <div className="player__stage">
        <div key={idx} className="player__qcard slide-up">
          <div className="player__meta">
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Question {idx + 1}
            </span>
            <Timer remaining={timeLeft} total={current.timeLimit} active={phase === 'question'} />
          </div>

          {current.imageUrl && (
            <div style={{ marginBottom: 24, borderRadius: 'var(--r-lg)', overflow: 'hidden', maxHeight: 240 }}>
              <img src={current.imageUrl} alt="" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          <h2 className="player__prompt">{current.prompt}</h2>

          {(current.type === 'single' || current.type === 'truefalse') && (
            <SingleChoiceOptions
              options={current.options}
              selected={selected}
              phase={phase}
              onSelect={(id) => {
                if (phase !== 'question') return;
                setSelected(id);
                setTimeout(() => commitAnswer(id), 250);
              }}
            />
          )}

          {current.type === 'multi' && (
            <MultiChoiceOptions
              options={current.options}
              selected={selectedMulti}
              phase={phase}
              onToggle={(id) => {
                if (phase !== 'question') return;
                setSelectedMulti(prev => {
                  const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
                  selectedMultiRef.current = next;
                  return next;
                });
              }}
            />
          )}

          {current.type === 'open' && (
            <OpenAnswer
              value={openAnswer}
              onChange={(val) => { setOpenAnswer(val); openAnswerRef.current = val; }}
              phase={phase}
              expected={current.answer}
              correct={scores[idx]?.correct}
            />
          )}

          {current.type === 'multi' && phase === 'question' && (
            <button
              className="btn btn--primary btn--lg"
              style={{ marginTop: 24, alignSelf: 'flex-start' }}
              disabled={selectedMulti.length === 0}
              onClick={() => commitAnswer(selectedMulti)}
            >
              Submit answer <Icon name="arrowRight" size={14} />
            </button>
          )}
          {current.type === 'open' && phase === 'question' && (
            <button
              className="btn btn--primary btn--lg"
              style={{ marginTop: 24, alignSelf: 'flex-start' }}
              disabled={!openAnswer.trim()}
              onClick={() => commitAnswer(openAnswer)}
            >
              Submit answer <Icon name="arrowRight" size={14} />
            </button>
          )}

          {phase === 'reveal' && (
            <div className="player__feedback scale-in" style={{
              background: scores[idx]?.correct ? 'oklch(96% 0.08 145)' : 'oklch(95% 0.04 30)',
              color: scores[idx]?.correct ? 'oklch(30% 0.10 145)' : 'oklch(35% 0.10 30)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 999,
                  background: scores[idx]?.correct ? 'oklch(55% 0.18 145)' : 'oklch(60% 0.18 25)',
                  color: 'white', display: 'grid', placeItems: 'center',
                }}>
                  <Icon name={scores[idx]?.correct ? 'check' : 'x'} size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
                    {scores[idx]?.correct ? 'Correct!' : 'Not quite.'}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {scores[idx]?.correct
                      ? `+${scores[idx].award} points · time bonus included`
                      : 'The correct answer was highlighted above.'}
                  </div>
                </div>
                <button className="btn btn--primary" style={{ marginLeft: 'auto' }} onClick={next}>
                  {idx === questions.length - 1 ? 'See results' : 'Next'} <Icon name="arrowRight" size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .player {
          height: 100vh;
          display: flex; flex-direction: column;
          background: var(--bg);
        }
        .player__header {
          display: flex; align-items: center; gap: 16px;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
        }
        .player__progress {
          flex: 1; display: flex; align-items: center; gap: 12px;
        }
        .player__progress-bar {
          flex: 1; height: 4px; background: var(--bg-2);
          border-radius: 99px; overflow: hidden;
          border: 1px solid var(--border);
        }
        .player__progress-bar > div {
          height: 100%; background: var(--text); border-radius: 99px;
        }
        .player__stage {
          flex: 1;
          display: grid; place-items: center;
          padding: 40px 24px;
          overflow-y: auto;
        }
        .player__qcard {
          width: 100%; max-width: 720px;
          display: flex; flex-direction: column;
        }
        .player__meta {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 28px;
        }
        .player__prompt {
          font-size: clamp(28px, 3.5vw, 44px);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin-bottom: 40px;
          text-wrap: balance;
        }
        .player__feedback {
          margin-top: 28px;
          padding: 18px 20px;
          border-radius: var(--r-lg);
        }
      `}</style>
    </div>
  );
}

function Timer({ remaining, total, active }) {
  const pct = (remaining / total) * 100;
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const danger = pct < 25;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={44} height={44} viewBox="0 0 44 44" style={{ overflow: 'visible' }}>
        <circle cx={22} cy={22} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
        <circle
          cx={22} cy={22} r={r} fill="none"
          stroke={danger ? 'var(--danger)' : 'var(--text)'}
          strokeWidth={3} strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 22 22)"
          style={{ transition: 'stroke-dasharray 60ms linear, stroke 200ms' }}
        />
      </svg>
      <span className="mono" style={{
        fontSize: 14, fontWeight: 600,
        color: danger ? 'var(--danger)' : 'var(--text)',
        minWidth: 26, textAlign: 'right',
      }}>{Math.ceil(remaining)}</span>
    </div>
  );
}

function SingleChoiceOptions({ options, selected, phase, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {options.map((opt, i) => {
        const isSelected = selected === opt.id;
        const showCorrect = (phase === 'reveal' || phase === 'answered') && opt.correct;
        const showWrong = phase === 'reveal' && isSelected && !opt.correct;
        let bg = 'var(--surface)';
        let border = 'var(--border)';
        let color = 'var(--text)';
        if (showCorrect) { bg = 'var(--accent)'; border = 'transparent'; color = 'var(--accent-fg)'; }
        else if (showWrong) { bg = 'oklch(95% 0.06 30)'; border = 'oklch(60% 0.18 30)'; }
        else if (isSelected) { bg = 'var(--text)'; border = 'var(--text)'; color = 'var(--bg)'; }
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            disabled={phase !== 'question'}
            style={{
              padding: '20px 22px',
              background: bg,
              border: '1.5px solid ' + border,
              borderRadius: 'var(--r-lg)',
              textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 14,
              fontSize: 17, fontWeight: 500,
              color,
              transition: 'all 220ms var(--ease)',
              minHeight: 72,
              cursor: phase === 'question' ? 'pointer' : 'default',
            }}
          >
            <span className="mono" style={{
              width: 28, height: 28, borderRadius: 7,
              background: isSelected || showCorrect ? 'oklch(0% 0 0 / 0.1)' : 'var(--bg-2)',
              display: 'grid', placeItems: 'center',
              fontSize: 13, fontWeight: 600,
              flexShrink: 0,
            }}>{String.fromCharCode(65 + i)}</span>
            <span style={{ flex: 1 }}>{opt.text}</span>
            {showCorrect && <Icon name="check" size={20} strokeWidth={2.5} />}
            {showWrong && <Icon name="x" size={20} strokeWidth={2.5} />}
          </button>
        );
      })}
    </div>
  );
}

function MultiChoiceOptions({ options, selected, phase, onToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt, i) => {
        const isSelected = selected.includes(opt.id);
        const showCorrect = (phase === 'reveal' || phase === 'answered') && opt.correct;
        const showWrong = phase === 'reveal' && isSelected && !opt.correct;
        let bg = 'var(--surface)';
        let border = 'var(--border)';
        let color = 'var(--text)';
        if (showCorrect) { bg = 'var(--accent)'; border = 'transparent'; color = 'var(--accent-fg)'; }
        else if (showWrong) { bg = 'oklch(95% 0.06 30)'; border = 'oklch(60% 0.18 30)'; }
        else if (isSelected) { border = 'var(--text)'; }
        return (
          <button
            key={opt.id}
            onClick={() => onToggle(opt.id)}
            disabled={phase !== 'question'}
            style={{
              padding: '16px 20px',
              background: bg,
              border: '1.5px solid ' + border,
              borderRadius: 'var(--r-lg)',
              textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 14,
              fontSize: 16, fontWeight: 500,
              color,
              transition: 'all 220ms var(--ease)',
            }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: 6,
              border: '2px solid ' + (isSelected || showCorrect ? 'currentColor' : 'var(--border-strong)'),
              background: isSelected ? 'currentColor' : (showCorrect ? 'oklch(0% 0 0 / 0.15)' : 'transparent'),
              display: 'grid', placeItems: 'center',
              flexShrink: 0, transition: 'all 150ms',
            }}>
              {isSelected && <Icon name="check" size={12} strokeWidth={3} style={{ color: 'var(--bg)' }} />}
              {!isSelected && showCorrect && <Icon name="check" size={12} strokeWidth={3} />}
            </span>
            <span style={{ flex: 1 }}>{opt.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function OpenAnswer({ value, onChange, phase, expected, correct }) {
  return (
    <div>
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={phase !== 'question'}
        placeholder="Type your answer..."
        style={{
          width: '100%', fontSize: 24, fontWeight: 500,
          letterSpacing: '-0.01em',
          padding: '20px 22px',
          background: 'var(--surface)',
          border: '2px solid ' + (phase === 'reveal'
            ? (correct ? 'var(--accent)' : 'oklch(60% 0.18 30)')
            : 'var(--border)'),
          borderRadius: 'var(--r-lg)',
        }}
      />
      {phase === 'reveal' && !correct && (
        <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-muted)' }}>
          Expected: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{expected}</span>
        </div>
      )}
    </div>
  );
}

function PlayerResult({ scores, total, quizTitle, quizId, onExit, onPlayAgain }) {
  const correct    = scores.filter(s => s.correct).length;
  const totalPoints = scores.reduce((s, x) => s + x.award, 0);
  const pct        = Math.round((correct / total) * 100);
  const [creditInfo, setCreditInfo] = useState(null); // null = loading

  useEffect(() => {
    if (!quizId) { setCreditInfo({ credits_earned: 0, already_rewarded: false, own_quiz: true }); return; }
    window.API.post('/quizzes/' + quizId + '/practice/', { correct })
      .then(data => {
        if (data.credits_total !== undefined) {
          window.API.saveUser({ ...window.CURRENT_USER, credits: data.credits_total });
        }
        setCreditInfo(data);
      })
      .catch(() => setCreditInfo({ credits_earned: 0, already_rewarded: false }));
  }, []);

  const creditsEarned  = creditInfo?.credits_earned ?? 0;
  const alreadyRewarded = creditInfo?.already_rewarded ?? false;
  const isOwnQuiz      = creditInfo && !alreadyRewarded && creditsEarned === 0 && correct > 0;

  return (
    <div className="player fade-in" data-screen-label="04b Player result">
      <div className="player__header">
        <button className="btn btn--ghost btn--icon" onClick={onExit}><Icon name="x" size={18} /></button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          {quizTitle && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{quizTitle}</span>
          )}
        </div>
        <div style={{ width: 36 }} />
      </div>
      <div className="player__stage">
        <div className="slide-up" style={{ textAlign: 'center', maxWidth: 540 }}>
          <div style={{
            width: 96, height: 96, borderRadius: 999,
            background: 'var(--accent)', color: 'var(--accent-fg)',
            display: 'grid', placeItems: 'center',
            margin: '0 auto 28px',
          }}>
            <Icon name="star" size={42} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Your result</div>
          <h1 style={{ fontSize: 80, fontWeight: 700, letterSpacing: '-0.04em', marginTop: 8, lineHeight: 1 }} className="mono">
            {totalPoints}
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-muted)', marginTop: 12 }}>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>{correct} of {total}</span> correct · <span className="mono">{pct}%</span>
          </p>

          {creditInfo === null ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
              padding: '14px 22px', borderRadius: 999, marginTop: 24,
              color: 'var(--text-faint)', fontSize: 13,
            }}>
              <span className="mono">Calculating credits…</span>
            </div>
          ) : creditsEarned > 0 ? (
            <div className="credits-earned scale-in" style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              background: 'var(--surface)', border: '1px solid var(--border)',
              padding: '14px 22px', borderRadius: 999,
              marginTop: 24, boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 999,
                background: 'var(--accent)', color: 'var(--accent-fg)',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name="star" size={16} strokeWidth={2.4} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>+{creditsEarned}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>Credits earned</div>
              </div>
            </div>
          ) : alreadyRewarded ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
              padding: '14px 22px', borderRadius: 999, marginTop: 24,
              color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
            }}>
              <Icon name="check" size={15} />
              Already completed — no credits awarded again
            </div>
          ) : isOwnQuiz ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
              padding: '14px 22px', borderRadius: 999, marginTop: 24,
              color: 'var(--text-muted)', fontSize: 13, fontWeight: 500,
            }}>
              <Icon name="folder" size={15} />
              Your own quiz — no credits for self-play
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
            {scores.map((s, i) => (
              <div key={i} style={{
                width: 32, height: 32, borderRadius: 8,
                background: s.correct ? 'var(--accent)' : 'oklch(90% 0.04 30)',
                color: s.correct ? 'var(--accent-fg)' : 'oklch(50% 0.10 30)',
                display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 600,
                fontFamily: 'JetBrains Mono',
              }}>{i + 1}</div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 40 }}>
            <button className="btn btn--secondary btn--lg" onClick={onExit}>Back to dashboard</button>
            <button className="btn btn--primary btn--lg" onClick={onPlayAgain}>
              Play again <Icon name="arrowRight" size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.Player = Player;
