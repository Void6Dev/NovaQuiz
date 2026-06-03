// === Analytics ===
function Analytics({ onNav }) {
  window.useLang();
  const [range, setRange] = useState('7d');
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    window.API.get('/analytics/?range=' + range)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  return (
    <div className="page fade-in" {...screenLabel('06 Analytics')}>
      <PageHeader title={t('anal.title')} subtitle={t('anal.subtitle')}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            display: 'flex', background: 'var(--surface)', borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)', padding: 3,
          }}>
            {['7d', '30d', '90d', 'all'].map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                style={{
                  padding: '6px 12px', fontSize: 12, fontWeight: 500,
                  borderRadius: 6,
                  background: range === r ? 'var(--bg)' : 'transparent',
                  color: range === r ? 'var(--text)' : 'var(--text-muted)',
                  boxShadow: range === r ? 'var(--shadow-sm)' : 'none',
                  fontFamily: 'JetBrains Mono', textTransform: 'uppercase',
                }}
              >{r}</button>
            ))}
          </div>
          <a
            href={'/api/analytics/export/?range=' + range}
            download
            className="btn btn--ghost btn--sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <Icon name="import" size={14} /> {t('anal.export_csv')}
          </a>
        </div>
      </PageHeader>

      <div className="anal-stats-grid">
        {loading ? (
          <>
            {[1,2,3,4].map(i => (
              <div key={i} className="card" style={{ padding: '18px 20px' }}>
                <div className="skel" style={{ height: 10, width: '50%', borderRadius: 4, marginBottom: 10 }} />
                <div className="skel" style={{ height: 28, width: '60%', borderRadius: 4, marginBottom: 6 }} />
                <div className="skel" style={{ height: 10, width: '40%', borderRadius: 4 }} />
              </div>
            ))}
          </>
        ) : (
          <>
            <Stat label={t('anal.sessions')}   value={data?.total_sessions ?? 0} />
            <Stat label={t('anal.completion')} value={(data?.completion_rate ?? 0) + '%'} />
            <Stat label={t('anal.avg_score')}  value={data?.avg_score ?? 0} hint={t('anal.per_player')} />
            <Stat label={t('anal.players')}    value={data?.players ?? 0} />
          </>
        )}
      </div>

      <div className="anal-chart-grid">
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('anal.plays_time')}</div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>
                {loading ? <div className="skel" style={{ height: 22, width: 120, borderRadius: 4, display: 'inline-block' }} /> : `${data?.total_sessions ?? 0} sessions`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--text)' }} /> {t('anal.this_week')}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} /> {t('anal.last_week')}
              </span>
            </div>
          </div>
          {loading
            ? <div className="skel" style={{ height: 200, borderRadius: 8 }} />
            : <SparkChart thisPeriod={data?.this_period || []} prevPeriod={data?.prev_period || []} labels={data?.period_labels || []} />
          }
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>{t('anal.score_dist')}</div>
          {loading
            ? <div className="skel" style={{ height: 180, borderRadius: 8 }} />
            : <ScoreDistribution buckets={data?.score_dist || []} />
          }
        </div>
      </div>

      <div className="anal-bottom-grid">
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('anal.top_quizzes')}</div>
            <button className="btn btn--ghost btn--sm" onClick={() => onNav('dashboard', { tab: 'mine' })}>{t('anal.view_all')}</button>
          </div>
          {loading
            ? Array.from({ length: 3 }, (_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 4px', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div className="skel" style={{ width: 18, height: 12, borderRadius: 3 }} />
                  <div className="skel" style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div className="skel" style={{ height: 13, width: '70%', borderRadius: 4 }} />
                    <div className="skel" style={{ height: 10, width: '45%', borderRadius: 4 }} />
                  </div>
                </div>
              ))
            : <TopQuizzes quizzes={data?.top_quizzes || []} onOpen={(id) => onNav('editor', { quizId: id })} />
          }
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('anal.hardest')}</div>
            <span className="pill"><Icon name="sparkle" size={11} /> {t('anal.ai_flagged')}</span>
          </div>
          {loading
            ? Array.from({ length: 3 }, (_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  <div className="skel" style={{ height: 13, width: '90%', borderRadius: 4 }} />
                  <div className="skel" style={{ height: 4, width: '100%', borderRadius: 99 }} />
                </div>
              ))
            : <HardestQuestions items={data?.hardest_questions || []} />
          }
        </div>
      </div>
    </div>
  );
}

function SparkChart({ thisPeriod, prevPeriod, labels }) {
  if (!thisPeriod.length) {
    return (
      <div style={{ height: 200, display: 'grid', placeItems: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
        {t('anal.no_data')}
      </div>
    );
  }
  const max = Math.max(...thisPeriod, ...prevPeriod, 1);
  const toPath = (pts) =>
    pts.map((p, i) => {
      const x = (i / Math.max(pts.length - 1, 1)) * 100;
      const y = 100 - (p / max) * 90;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

  const displayLabels = labels.length <= 14 ? labels : labels.filter((_, i) => i % Math.ceil(labels.length / 7) === 0);

  return (
    <div style={{ position: 'relative', height: 200 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1={0} y1={y} x2={100} y2={y} stroke="var(--border)" strokeWidth={0.2} vectorEffect="non-scaling-stroke" />
        ))}
        {prevPeriod.length > 0 && (
          <path d={toPath(prevPeriod)} fill="none" stroke="var(--accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
        )}
        <path d={toPath(thisPeriod) + ` L 100 100 L 0 100 Z`} fill="oklch(15% 0.005 270 / 0.06)" />
        <path d={toPath(thisPeriod)} fill="none" stroke="var(--text)" strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{
        position: 'absolute', bottom: -22, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono',
      }}>
        {displayLabels.map((d, i) => <span key={i}>{d}</span>)}
      </div>
    </div>
  );
}

function ScoreDistribution({ buckets = [] }) {
  const total = buckets.reduce((s, b) => s + b.count, 0);
  if (!total) {
    return (
      <div style={{ height: 180, display: 'grid', placeItems: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
        {t('anal.no_data')}
      </div>
    );
  }
  const max = Math.max(...buckets.map(b => b.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, padding: '12px 0 0' }}>
      {buckets.map((b, i) => (
        <div key={b.range} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{b.count}</span>
          <div style={{
            width: '100%',
            height: `${(b.count / max) * 130}px`,
            background: i >= 3 ? 'var(--accent)' : 'var(--bg-2)',
            border: '1px solid ' + (i >= 3 ? 'transparent' : 'var(--border)'),
            borderRadius: '4px 4px 0 0',
            animation: 'slideUp 600ms var(--ease) both',
            animationDelay: `${i * 60}ms`,
          }} />
          <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono' }}>{b.range}</span>
        </div>
      ))}
    </div>
  );
}

function TopQuizzes({ quizzes, onOpen }) {
  if (!quizzes.length) {
    return <div style={{ color: 'var(--text-faint)', fontSize: 13, padding: '12px 0' }}>{t('anal.no_quizzes')}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {quizzes.map((q, i) => (
        <div
          key={q.id}
          onClick={() => onOpen(q.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 4px',
            borderBottom: i < quizzes.length - 1 ? '1px solid var(--border)' : 'none',
            cursor: 'pointer',
          }}
        >
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', width: 18, fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
          <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
            <CoverPlaceholder label="" hue={(window.TOPIC_BY_CODE[q.topic] || {}).hue || 200} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
              <span className="mono">{q.session_count}</span> {t('anal.sessions_lower')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HardestQuestions({ items }) {
  if (!items.length) {
    return <div style={{ color: 'var(--text-faint)', fontSize: 13, padding: '12px 0' }}>{t('anal.no_questions')}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{it.question}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${it.correct_rate}%`, height: '100%', background: 'oklch(60% 0.18 25)', borderRadius: 99 }} />
            </div>
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', width: 36, textAlign: 'right' }}>
              {it.correct_rate}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

window.Analytics = Analytics;
