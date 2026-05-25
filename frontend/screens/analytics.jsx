// === Analytics ===
function Analytics({ onNav }) {
  window.useLang();
  const [range, setRange] = useState('7d');
  return (
    <div className="page fade-in" data-screen-label="06 Analytics">
      <PageHeader title={t('anal.title')} subtitle={t('anal.subtitle')}>
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
        <button className="btn btn--secondary"><Icon name="share" size={15} /> {t('anal.export')}</button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Stat label={t('anal.sessions')}   value="1,284" delta="+18%" hint={t('anal.last_7d')} />
        <Stat label={t('anal.completion')} value="91.2%" delta="+2.1%" />
        <Stat label={t('anal.avg_score')}  value="73%"   delta="+4%" />
        <Stat label={t('anal.avg_dur')}    value="4:32"  hint={t('anal.per_session')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('anal.plays_time')}</div>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>1,284 sessions</div>
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
          <SparkChart />
        </div>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>{t('anal.score_dist')}</div>
          <ScoreDistribution />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('anal.top_quizzes')}</div>
            <button className="btn btn--ghost btn--sm">{t('anal.view_all')}</button>
          </div>
          <TopQuizzes onOpen={() => onNav('editor')} />
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('anal.hardest')}</div>
            <span className="pill"><Icon name="sparkle" size={11} /> {t('anal.ai_flagged')}</span>
          </div>
          <HardestQuestions />
        </div>
      </div>
    </div>
  );
}

function SparkChart() {
  const points1 = [38, 42, 39, 56, 48, 71, 65, 82, 78, 90, 85, 96, 88, 102];
  const points2 = [30, 35, 33, 41, 38, 52, 48, 60, 56, 68, 62, 71, 70, 78];
  const max = Math.max(...points1, ...points2);
  const toPath = (pts) => {
    return pts.map((p, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 100 - (p / max) * 90;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };
  return (
    <div style={{ position: 'relative', height: 200 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1={0} y1={y} x2={100} y2={y} stroke="var(--border)" strokeWidth={0.2} vectorEffect="non-scaling-stroke" />
        ))}
        <path d={toPath(points2)} fill="none" stroke="var(--accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeDasharray="3 3" />
        <path d={toPath(points1) + ` L 100 100 L 0 100 Z`} fill="oklch(15% 0.005 270 / 0.06)" />
        <path d={toPath(points1)} fill="none" stroke="var(--text)" strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{
        position: 'absolute', bottom: -22, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono',
      }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
      </div>
    </div>
  );
}

function ScoreDistribution() {
  const buckets = [
    { range: '0-20', count: 18 },
    { range: '20-40', count: 32 },
    { range: '40-60', count: 78 },
    { range: '60-80', count: 142 },
    { range: '80-100', count: 96 },
  ];
  const max = Math.max(...buckets.map(b => b.count));
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

function TopQuizzes({ onOpen }) {
  const items = window.MOCK_QUIZZES.slice(0, 5).map((q, i) => ({
    ...q,
    growth: [12, 8, 24, -3, 6][i],
  }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((q, i) => (
        <div
          key={q.id}
          onClick={onOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 4px',
            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
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
              <span className="mono">{q.plays.toLocaleString()}</span> {t('dash.plays')} · <span className="mono">{q.avgScore || '—'}%</span> {t('dash.avg')}
            </div>
          </div>
          <div className="mono" style={{
            fontSize: 12, fontWeight: 600,
            color: q.growth > 0 ? 'oklch(55% 0.15 145)' : 'var(--danger)',
          }}>{q.growth > 0 ? '+' : ''}{q.growth}%</div>
        </div>
      ))}
    </div>
  );
}

function HardestQuestions() {
  const items = [
    { q: 'What is the time complexity of binary search?', correctRate: 23 },
    { q: 'Which protocol does HTTPS layer over?', correctRate: 31 },
    { q: 'Default value of `display` for <span>?', correctRate: 42 },
    { q: 'What is a closure in JavaScript?', correctRate: 48 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{it.q}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${it.correctRate}%`, height: '100%', background: 'oklch(60% 0.18 25)', borderRadius: 99 }} />
            </div>
            <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', width: 30, textAlign: 'right' }}>
              {it.correctRate}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

window.Analytics = Analytics;
