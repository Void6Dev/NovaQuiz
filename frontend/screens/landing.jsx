// === Landing page ===
function Landing({ onEnter }) {
  const [pin, setPin] = useState('');

  const handleJoin = () => {
    if (pin.length === 6) onEnter('player', { pin });
  };

  return (
    <div className="landing" {...screenLabel('01 Landing')}>
      <SiteHeader />

      <section className="hero">
        <div className="hero__inner">
          <div className="hero__badge-wrap">
            <span className="pill">
              <span className="hero__dot" />
              Nova Quiz 2.0 — Live sessions with 10k players
            </span>
          </div>
          <h1 className="hero__title">
            Quizzes<br/>
            that actually <em>feel</em><br/>
            <span className="hero__title-muted">worth playing.</span>
          </h1>
          <p className="hero__sub">
            A premium-grade quiz studio. Author rich questions, run live sessions,
            and see real-time analytics — built for teams that care about craft.
          </p>
          <div className="hero__cta">
            <button className="btn btn--accent btn--xl" onClick={() => onEnter('editor', { newQuiz: true })}>
              Start a quiz <Icon name="arrowRight" size={16} />
            </button>
            <div className="hero__join">
              <span className="hero__join-or">or join with code</span>
              <input
                className="input mono hero__pin"
                placeholder="ABCD12"
                value={pin}
                onChange={e => setPin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                maxLength={6}
              />
              <button className="btn btn--secondary" disabled={pin.length < 6} onClick={handleJoin}>
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="hero__visual">
          <LandingDemoCard />
        </div>
      </section>

      <section className="features">
        <div className="features__grid">
          <FeatureCard icon="edit"  title="A studio, not a form"    description="Type, image, true/false, open response. Drag, duplicate, branch. Keyboard-first." />
          <FeatureCard icon="bolt"  title="Live, in real time"      description="Host live sessions with up to 10,000 players. Leaderboard, streaks, podium." />
          <FeatureCard icon="chart" title="Analytics that explain"  description="Per-question difficulty, drop-off, answer distributions. Export to anywhere." />
        </div>
      </section>

      <SiteFooter />

      <style>{`
        .landing { min-height: 100vh; }

        /* ── Ambient hero glow ── */
        .hero {
          padding: 72px 40px 80px;
          max-width: 1320px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 64px;
          align-items: center;
          position: relative;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -100px; left: 50%;
          transform: translateX(-55%);
          width: 900px; height: 480px;
          background: radial-gradient(ellipse at center, oklch(from var(--accent) l c h / 0.09) 0%, transparent 65%);
          pointer-events: none;
        }
        .hero__inner { position: relative; z-index: 1; }

        /* ── Badge ── */
        .hero__badge-wrap {
          margin-bottom: 28px;
          animation: fadeIn 400ms var(--ease) both;
        }
        .hero__dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--accent-strong); flex-shrink: 0;
        }

        /* ── Text ── */
        .hero__title {
          font-size: clamp(48px, 6vw, 84px);
          line-height: 0.97;
          letter-spacing: -0.04em;
          font-weight: 700;
          margin-bottom: 24px;
          animation: slideUp 500ms var(--ease) 60ms both;
        }
        .hero__title em { font-style: italic; font-weight: 500; }
        .hero__title-muted { color: var(--text-muted); }

        .hero__sub {
          font-size: 18px; line-height: 1.55;
          color: var(--text-muted);
          max-width: 480px;
          margin-bottom: 36px;
          text-wrap: pretty;
          animation: slideUp 500ms var(--ease) 110ms both;
        }

        /* ── CTA row ── */
        .hero__cta {
          display: flex; align-items: center; gap: 20px;
          flex-wrap: wrap;
          animation: slideUp 500ms var(--ease) 160ms both;
        }
        .hero__join         { display: flex; align-items: center; gap: 10px; }
        .hero__join-or      { color: var(--text-faint); font-size: 13px; white-space: nowrap; }
        .hero__pin          { width: 108px; text-align: center; letter-spacing: 0.15em; font-size: 15px; font-weight: 600; }

        /* ── Visual column ── */
        .hero__visual {
          aspect-ratio: 4 / 5;
          max-height: 600px;
          position: relative;
          z-index: 1;
          animation: slideUp 600ms var(--ease) 80ms both;
        }

        /* ── Demo card float ── */
        @keyframes cardFloat {
          0%, 100% { transform: rotate(1.5deg) translateY(0px);  }
          50%       { transform: rotate(1.5deg) translateY(-10px); }
        }
        .demo-card-float { animation: cardFloat 5s ease-in-out infinite; }

        /* ── Features ── */
        .features {
          padding: 40px 40px 100px;
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
        .feature-card { padding: 36px; background: var(--bg); transition: background 200ms var(--ease); }
        .feature-card:hover { background: var(--bg-2); }
        .feature-card__icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: var(--accent); color: var(--accent-fg);
          display: grid; place-items: center; margin-bottom: 20px;
        }
        .feature-card__title { font-size: 19px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 8px; }
        .feature-card__desc  { font-size: 14px; color: var(--text-muted); line-height: 1.55; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
            gap: 48px;
            padding: 48px 24px 64px;
          }
          .hero__visual { max-height: 420px; }
          .hero::before { display: none; }
        }
        @media (max-width: 600px) {
          .hero { padding: 32px 20px 48px; gap: 36px; }
          .hero__cta { flex-direction: column; align-items: flex-start; gap: 14px; }
          .hero__join { flex-wrap: wrap; }
          .features { padding: 20px 20px 60px; }
          .features__grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="feature-card">
      <div className="feature-card__icon">
        <Icon name={icon} size={20} />
      </div>
      <h3 className="feature-card__title">{title}</h3>
      <p className="feature-card__desc">{description}</p>
    </div>
  );
}

function LandingDemoCard() {
  const [selected, setSelected] = useState(2);
  const opts = ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'];

  useEffect(() => {
    const id = setInterval(() => setSelected(s => (s + 1) % opts.length), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="demo-card-float" style={{ position: 'absolute', inset: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-2xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: 28,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Question 4 / 12</span>
          <span className="pill"><Icon name="clock" size={11} /> <span className="mono">0:24</span></span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{
            fontSize: 'clamp(20px, 2.2vw, 28px)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            marginBottom: 28,
            textWrap: 'balance',
          }}>What is the capital city of Australia?</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {opts.map((o, i) => (
              <button
                key={i}
                className="card"
                onClick={() => setSelected(i)}
                style={{
                  padding: '13px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', textAlign: 'left',
                  background: i === selected ? 'var(--accent)' : 'var(--surface)',
                  borderColor: i === selected ? 'transparent' : 'var(--border)',
                  color: i === selected ? 'var(--accent-fg)' : 'var(--text)',
                  fontWeight: i === selected ? 600 : 500,
                  fontSize: 14,
                  transition: 'all 220ms var(--ease)',
                }}
              >
                <span className="mono" style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
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
    </div>
  );
}

window.Landing = Landing;
