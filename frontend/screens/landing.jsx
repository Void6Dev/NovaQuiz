// === Landing page ===
function Landing({ onEnter }) {
  const [pin, setPin] = useState('');
  return (
    <div className="landing" data-screen-label="01 Landing">
      <SiteHeader />

      <section className="hero">
        <div className="hero__inner">
          <span className="pill" style={{ marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--accent-strong)', display: 'inline-block' }} />
            New — Live mode with 10k participants
          </span>
          <h1 className="hero__title">
            Quizzes<br/>
            that actually <em>feel</em><br/>
            <span style={{ color: 'var(--text-muted)' }}>worth playing.</span>
          </h1>
          <p className="hero__sub">
            A premium-grade quiz studio. Author rich questions, run live sessions,
            and see live analytics — built for teams that care about craft.
          </p>
          <div className="hero__cta">
            <button className="btn btn--accent btn--xl" onClick={() => onEnter('editor', { newQuiz: true })}>
              Start a quiz <Icon name="arrowRight" size={16} />
            </button>
            <div className="hero__join">
              <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>or join with code</span>
              <input
                className="input mono"
                placeholder="ABCD12"
                value={pin}
                onChange={e => setPin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                style={{ width: 120, textAlign: 'center', letterSpacing: '0.15em', fontSize: 15, fontWeight: 600 }}
                maxLength={6}
              />
              <button className="btn btn--secondary" disabled={pin.length < 6} onClick={() => onEnter('player')}>
                Join
              </button>
            </div>
          </div>

          <div className="hero__metrics">
            <div><span className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>2.1M</span><span>quizzes built</span></div>
            <div><span className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>48M</span><span>questions answered</span></div>
            <div><span className="mono" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>4.9</span><span>App Store rating</span></div>
          </div>
        </div>

        <div className="hero__visual">
          <LandingDemoCard />
        </div>
      </section>

      <section className="features">
        <div className="features__grid">
          <FeatureCard
            icon="edit"
            title="A studio, not a form"
            description="Type, image, true/false, open response. Drag, duplicate, branch. Keyboard-first."
          />
          <FeatureCard
            icon="bolt"
            title="Live, in real time"
            description="Host live sessions with up to 10,000 players. Leaderboard, streaks, podium."
          />
          <FeatureCard
            icon="chart"
            title="Analytics that explain"
            description="Per-question difficulty, drop-off, answer distributions. Export to anywhere."
          />
        </div>
      </section>

      <SiteFooter />

      <style>{`
        .landing { min-height: 100vh; padding: 0; }

        .hero {
          padding: 80px 40px 80px;
          max-width: 1320px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .hero__title {
          font-size: clamp(48px, 6vw, 84px);
          line-height: 0.98;
          letter-spacing: -0.04em;
          font-weight: 700;
          margin-bottom: 24px;
        }
        .hero__title em { font-style: italic; font-weight: 500; font-family: 'Inter'; }
        .hero__sub {
          font-size: 18px; line-height: 1.5;
          color: var(--text-muted);
          max-width: 520px;
          margin-bottom: 36px;
          text-wrap: pretty;
        }
        .hero__cta {
          display: flex; align-items: center; gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 56px;
        }
        .hero__join {
          display: flex; align-items: center; gap: 10px;
        }
        .hero__metrics {
          display: flex; gap: 48px;
          padding-top: 32px;
          border-top: 1px solid var(--border);
        }
        .hero__metrics > div {
          display: flex; flex-direction: column; gap: 2px;
        }
        .hero__metrics span:last-child {
          font-size: 12px; color: var(--text-faint);
          text-transform: uppercase; letter-spacing: 0.06em;
        }

        .hero__visual {
          aspect-ratio: 4 / 5;
          max-height: 640px;
          position: relative;
        }

        .features {
          padding: 60px 40px 100px;
          max-width: 1320px;
          margin: 0 auto;
        }
        .features__grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px;
          background: var(--border);
          border-radius: var(--r-xl);
          overflow: hidden;
          border: 1px solid var(--border);
        }

      `}</style>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div style={{ padding: 36, background: 'var(--bg)' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'var(--accent)', color: 'var(--accent-fg)',
        display: 'grid', placeItems: 'center', marginBottom: 20,
      }}>
        <Icon name={icon} size={20} />
      </div>
      <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>{description}</p>
    </div>
  );
}

function LandingDemoCard() {
  const [selected, setSelected] = useState(1);
  const opts = [
    'A weekly cron job',
    'A serverless function',
    'A long-polling worker',
    'A scheduled durable task',
  ];
  useEffect(() => {
    const t = setInterval(() => setSelected(s => (s + 1) % opts.length), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-2xl)',
      boxShadow: 'var(--shadow-lg)',
      padding: 28,
      display: 'flex', flexDirection: 'column',
      transform: 'rotate(1.5deg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Question 4 / 12</span>
        <span className="pill"><Icon name="clock" size={11} /> <span className="mono">0:24</span></span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h3 style={{
          fontSize: 'clamp(22px, 2.4vw, 30px)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          marginBottom: 28,
          textWrap: 'balance',
        }}>What's the best primitive for retry-on-failure background work?</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opts.map((o, i) => (
            <button
              key={i}
              className="card"
              onClick={() => setSelected(i)}
              style={{
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
                background: i === selected ? 'var(--accent)' : 'var(--surface)',
                borderColor: i === selected ? 'transparent' : 'var(--border)',
                color: i === selected ? 'var(--accent-fg)' : 'var(--text)',
                fontWeight: i === selected ? 600 : 500,
                fontSize: 14,
                textAlign: 'left',
                transition: 'all 220ms var(--ease)',
              }}
            >
              <span className="mono" style={{
                width: 22, height: 22, borderRadius: 6,
                background: i === selected ? 'oklch(20% 0.06 130 / 0.15)' : 'var(--bg-2)',
                display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 600,
                color: i === selected ? 'var(--accent-fg)' : 'var(--text-muted)',
              }}>{String.fromCharCode(65 + i)}</span>
              <span style={{ flex: 1 }}>{o}</span>
              {i === selected && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 4, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: '33%', height: '100%', background: 'var(--text)', borderRadius: 99 }} />
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>33%</span>
      </div>
    </div>
  );
}

window.Landing = Landing;
