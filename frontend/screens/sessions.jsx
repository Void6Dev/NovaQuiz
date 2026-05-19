// === Sessions browser — public live sessions ===
function Sessions({ onNav }) {
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | open | running
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    window.API.get('/sessions/')
      .then(data => setSessions((data.sessions || []).map(window.API.fromBackendSession)))
      .catch(() => {});
  }, []);

  const filtered = sessions.filter(s => {
    if (search && !s.quiz.toLowerCase().includes(search.toLowerCase()) && !s.host.toLowerCase().includes(search.toLowerCase()) && !s.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'open' && s.started) return false;
    if (filter === 'running' && !s.started) return false;
    return true;
  });

  const submitCode = async (e) => {
    e.preventDefault();
    const cleaned = code.toUpperCase().replace(/\s/g, '');
    setError('');
    setJoining(true);
    try {
      const session = await window.API.post('/sessions/join/', { code: cleaned });
      onNav('live', { sessionId: session.id });
    } catch (err) {
      setError(err.message || 'Session not found. Check the code and try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="page fade-in" data-screen-label="08 Sessions">
      <PageHeader title="Live sessions" subtitle="Join a session with a code, or browse what's open right now.">
        <button className="btn btn--accent" onClick={() => onNav('dashboard')}>
          <Icon name="bolt" size={15} /> Host a session
        </button>
      </PageHeader>

      <div className="card" style={{ padding: 28, marginBottom: 32, background: 'var(--bg-2)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'center' }}>
          <form onSubmit={submitCode}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Got a code?
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input
                className="input input--lg mono"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setError(''); }}
                placeholder="ABCD12"
                style={{
                  flex: 1, fontSize: 28, fontWeight: 600, letterSpacing: '0.15em',
                  textAlign: 'center', padding: '14px 16px',
                }}
                maxLength={6}
                autoFocus
              />
              <button type="submit" className="btn btn--primary btn--lg" disabled={code.length < 6 || joining}>
                {joining ? 'Joining…' : <><span>Join</span> <Icon name="arrowRight" size={14} /></>}
              </button>
            </div>
            {error && (
              <div style={{
                marginTop: 10, fontSize: 13, color: 'var(--danger)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Icon name="x" size={14} /> {error}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 12 }}>
              6 letters or digits. Get the code from the host's lobby screen.
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Or join a public one
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Stat label="Open now" value={sessions.filter(s => !s.started).length} hint="ready to join" />
              <Stat label="Running" value={sessions.filter(s => s.started).length} hint="in progress" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', marginBottom: 20 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by quiz, host, or code..." />
        <div style={{
          display: 'flex', background: 'var(--surface)', borderRadius: 'var(--r-md)',
          border: '1px solid var(--border)', padding: 3,
        }}>
          {[{ id: 'all', label: 'All' }, { id: 'open', label: 'Open' }, { id: 'running', label: 'Running' }].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '6px 14px', fontSize: 13, fontWeight: 500, borderRadius: 7,
                background: filter === f.id ? 'var(--bg)' : 'transparent',
                color: filter === f.id ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: filter === f.id ? 'var(--shadow-sm)' : 'none',
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '120px 2fr 1.2fr 1fr 1fr auto',
          gap: 16, padding: '12px 20px',
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--border)',
          fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
          color: 'var(--text-muted)', fontWeight: 600,
        }}>
          <div>Code</div><div>Quiz</div><div>Host</div><div>Players</div><div>Status</div><div />
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No sessions match your filters.
          </div>
        )}
        {filtered.map((s, i) => (
          <div
            key={s.id}
            style={{
              display: 'grid', gridTemplateColumns: '120px 2fr 1.2fr 1fr 1fr auto',
              gap: 16, padding: '16px 20px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              alignItems: 'center',
              animationDelay: `${i * 30}ms`,
            }}
            className="fade-in"
          >
            <div className="mono" style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.05em' }}>{s.code}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{s.quiz}</div>
              <div style={{ fontSize: 12, color: 'var(--text-faint)', display: 'flex', gap: 10, marginTop: 2 }}>
                <span><Icon name="clock" size={11} style={{ verticalAlign: -1, marginRight: 3 }} /><span className="mono">{s.timePerQuestion}s</span> / question</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="avatar" style={{
                width: 22, height: 22, fontSize: 10,
                background: `linear-gradient(135deg, oklch(80% 0.14 ${(s.host.charCodeAt(0) * 7) % 360}), oklch(70% 0.18 ${(s.host.charCodeAt(0) * 7 + 40) % 360}))`,
              }}>{s.host[0].toUpperCase()}</div>
              <span className="mono" style={{ fontSize: 13 }}>@{s.host}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{s.players}/{s.maxPlayers}</span>
              <div style={{ flex: 1, maxWidth: 60, height: 4, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  width: `${(s.players / s.maxPlayers) * 100}%`,
                  height: '100%',
                  background: s.players >= s.maxPlayers ? 'var(--danger)' : 'var(--text)',
                }} />
              </div>
            </div>
            <div>
              {s.started ? (
                <span className="pill pill--dot" style={{ color: 'oklch(60% 0.18 25)', borderColor: 'oklch(60% 0.18 25 / 0.3)', background: 'oklch(60% 0.18 25 / 0.08)' }}>
                  Running
                </span>
              ) : s.players >= s.maxPlayers ? (
                <span className="pill">Full</span>
              ) : (
                <span className="pill pill--dot" style={{ color: 'oklch(55% 0.16 145)', borderColor: 'oklch(55% 0.16 145 / 0.3)', background: 'oklch(55% 0.16 145 / 0.08)' }}>
                  Open
                </span>
              )}
            </div>
            <button
              className="btn btn--secondary btn--sm"
              onClick={async () => {
                try {
                  const session = await window.API.post('/sessions/join/', { code: s.code });
                  onNav('live', { sessionId: session.id });
                } catch (err) { alert(err.message); }
              }}
              disabled={s.started || s.players >= s.maxPlayers}
              style={{ opacity: (s.started || s.players >= s.maxPlayers) ? 0.4 : 1 }}
            >
              Join
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

window.Sessions = Sessions;
