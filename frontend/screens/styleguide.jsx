// === Styleguide — living component catalog ===

// ── User permission manager ───────────────────────────────────────────────────

function UserPermissionManager() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState({}); // userId -> true while saving

  const search = async (q) => {
    setLoading(true);
    try {
      const data = await API.get('/admin/users/' + (q ? '?q=' + encodeURIComponent(q) : ''));
      setUsers(data.users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { search(''); }, []);

  const handleSearch = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(window._sgSearchTimer);
    window._sgSearchTimer = setTimeout(() => search(q), 350);
  };

  const toggleMod = async (user) => {
    const next = user.permission === 'moderator' ? 'user' : 'moderator';
    setPending(p => ({ ...p, [user.id]: true }));
    try {
      await API.post('/admin/users/' + user.id + '/permission/', { permission: next });
      setUsers(us => us.map(u => u.id === user.id ? { ...u, permission: next } : u));
    } catch (e) {
      alert(e.message);
    } finally {
      setPending(p => ({ ...p, [user.id]: false }));
    }
  };

  return (
    <div>
      <div className="search" style={{ width: 320, marginBottom: 20 }}>
        <Icon name="search" size={15} />
        <input
          className="input"
          placeholder="Search by username or email…"
          value={query}
          onChange={handleSearch}
        />
      </div>

      {loading && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {users.map(u => (
          <div key={u.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)', background: 'var(--surface)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: `linear-gradient(135deg, oklch(75% 0.16 ${(u.username.charCodeAt(0) % 360)}), oklch(65% 0.18 ${(u.username.charCodeAt(0) + 60) % 360}))`,
              display: 'grid', placeItems: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {u.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                {u.name}
                {u.permission === 'moderator' && <span className="badge-mod">MOD</span>}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
                @{u.username} · {u.email}
              </div>
            </div>
            <button
              className={`btn ${u.permission === 'moderator' ? 'btn--secondary' : 'btn--primary'}`}
              style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
              disabled={!!pending[u.id]}
              onClick={() => toggleMod(u)}
            >
              {pending[u.id]
                ? '…'
                : u.permission === 'moderator' ? 'Revoke mod' : 'Make mod'}
            </button>
          </div>
        ))}
        {!loading && users.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No users found.</div>
        )}
      </div>
    </div>
  );
}

function SgSection({ id, title, children }) {
  return (
    <section id={id} style={{ marginBottom: 64 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 20 }}>{title}</h2>
      {children}
    </section>
  );
}

function SgRow({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

// ── Color token swatch ────────────────────────────────────────────────────────

function Swatch({ token, size = 40 }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(`var(${token})`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div
      onClick={copy}
      title={`Copy var(${token})`}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
    >
      <div style={{
        width: size, height: size, borderRadius: 10,
        background: `var(${token})`,
        border: '1.5px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 120ms',
      }} />
      <span style={{ fontSize: 10, fontWeight: 500, color: copied ? 'var(--success-text)' : 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', maxWidth: 80 }}>
        {copied ? 'copied!' : token.replace('--', '')}
      </span>
    </div>
  );
}

function SwatchGroup({ title, tokens }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {tokens.map(t => <Swatch key={t} token={t} />)}
      </div>
    </div>
  );
}

// ── Shadow card ───────────────────────────────────────────────────────────────

function ShadowCard({ token }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 80, height: 60, borderRadius: 'var(--r-md)',
        background: 'var(--surface)', boxShadow: `var(${token})`,
        border: '1px solid var(--border)',
      }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace' }}>
        {token.replace('--', '')}
      </span>
    </div>
  );
}

// ── SegmentedControl demo ─────────────────────────────────────────────────────

function SgSegmented() {
  const [val, setVal] = useState('b');
  const opts = ['Option A', 'Option B', 'Option C'];
  return (
    <div className="seg-ctrl">
      {opts.map(o => (
        <button
          key={o}
          className={`seg-ctrl__btn${val === o.split(' ')[1].toLowerCase() ? ' seg-ctrl__btn--active' : ''}`}
          onClick={() => setVal(o.split(' ')[1].toLowerCase())}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ── Icon grid ─────────────────────────────────────────────────────────────────

const ALL_ICONS = [
  'home','grid','edit','play','bar','radio','settings','search','plus','check','x',
  'chevronRight','chevronDown','chevronLeft','arrowRight','arrowUp','arrowDown',
  'clock','users','user','eye','trash','copy','sparkle','moon','sun','image','type',
  'bolt','qr','bell','folder','chart','flag','star','drag','list','share','logout',
  'more','upload','compass','info','shuffle','import','globe','lock','unlock','crop',
  'reply','message',
];

function IconGrid() {
  const [size, setSize] = useState(20);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Size:</span>
        <input type="range" min="14" max="36" value={size} onChange={e => setSize(+e.target.value)} style={{ width: 120 }} />
        <span className="mono" style={{ fontSize: 12 }}>{size}px</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ALL_ICONS.map(name => (
          <div key={name} title={name} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            padding: '10px 8px', borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)', background: 'var(--surface)',
            cursor: 'default', minWidth: 64,
          }}>
            <Icon name={name} size={size} />
            <span style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center' }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar nav ───────────────────────────────────────────────────────────────

const SG_SECTIONS = [
  { id: 'users',      label: 'Users'      },
  { id: 'colors',     label: 'Colors'     },
  { id: 'typography', label: 'Typography' },
  { id: 'shadows',    label: 'Shadows'    },
  { id: 'buttons',    label: 'Buttons'    },
  { id: 'pills',      label: 'Pills'      },
  { id: 'inputs',     label: 'Inputs'     },
  { id: 'controls',   label: 'Controls'   },
  { id: 'cards',      label: 'Cards'      },
  { id: 'icons',      label: 'Icons'      },
];

// ── Main page ─────────────────────────────────────────────────────────────────

function StyleguidePage() {
  const [active, setActive] = useState('colors');
  const [toggleA, setToggleA] = useState(true);
  const [toggleB, setToggleB] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const scrollTo = (id) => {
    setActive(id);
    document.getElementById('sg-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="page fade-in" style={{ maxWidth: 1200, display: 'grid', gridTemplateColumns: '160px 1fr', gap: 40, alignItems: 'start' }}>
      {/* Sticky sidebar */}
      <nav style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', marginBottom: 8, paddingLeft: 10 }}>
          Styleguide
        </div>
        {SG_SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            style={{
              textAlign: 'left', padding: '7px 10px', borderRadius: 'var(--r-sm)',
              fontSize: 13, fontWeight: active === s.id ? 600 : 400,
              color: active === s.id ? 'var(--text)' : 'var(--text-muted)',
              background: active === s.id ? 'var(--surface)' : 'transparent',
              border: 'none', cursor: 'pointer',
              boxShadow: active === s.id ? 'var(--shadow-sm)' : 'none',
              transition: 'all 120ms',
            }}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>Component Styleguide</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>Living inventory of every visual token and UI primitive. Click swatches to copy.</p>
        </div>

        {/* ── Users ── */}
        <SgSection id="sg-users" title="User permissions">
          <UserPermissionManager />
        </SgSection>

        {/* ── Colors ── */}
        <SgSection id="sg-colors" title="Color tokens">
          <SwatchGroup title="Backgrounds" tokens={['--bg','--bg-2','--surface','--surface-2','--surface-3']} />
          <SwatchGroup title="Borders" tokens={['--border','--border-strong']} />
          <SwatchGroup title="Text" tokens={['--text','--text-muted','--text-faint']} />
          <SwatchGroup title="Accent" tokens={['--accent','--accent-strong','--accent-fg']} />
          <SwatchGroup title="Danger" tokens={['--danger','--danger-fg','--danger-text','--danger-soft','--danger-soft-border']} />
          <SwatchGroup title="Success" tokens={['--success','--success-fg','--success-text','--success-soft','--success-soft-border']} />
          <SwatchGroup title="Info" tokens={['--info','--info-fg','--info-text','--info-soft','--info-soft-border']} />
          <SwatchGroup title="Warning" tokens={['--warn','--warn-text','--warn-soft','--warn-soft-border']} />
          <SwatchGroup title="Misc" tokens={['--mod','--mod-fg']} />
        </SgSection>

        {/* ── Typography ── */}
        <SgSection id="sg-typography" title="Typography">
          {[
            { label: 'Display', size: 32, weight: 700, ls: '-0.03em' },
            { label: 'Heading 1', size: 24, weight: 700, ls: '-0.02em' },
            { label: 'Heading 2', size: 20, weight: 600, ls: '-0.02em' },
            { label: 'Heading 3', size: 16, weight: 600, ls: '-0.01em' },
            { label: 'Body',      size: 14, weight: 400 },
            { label: 'Small',     size: 12, weight: 400 },
            { label: 'Micro',     size: 11, weight: 500, color: 'var(--text-muted)', ls: '0.04em', upper: true },
          ].map(({ label, size, weight, ls, color, upper }) => (
            <div key={label} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label} — {size}px / {weight}</div>
              <div style={{ fontSize: size, fontWeight: weight, letterSpacing: ls, color: color || 'var(--text)', textTransform: upper ? 'uppercase' : undefined }}>
                The quick brown fox jumps over the lazy dog
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Mono — JetBrains Mono</div>
            <div className="mono" style={{ fontSize: 14 }}>const value = oklch(78% 0.18 130); // accent</div>
          </div>
        </SgSection>

        {/* ── Shadows ── */}
        <SgSection id="sg-shadows" title="Shadows">
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', padding: '16px 0' }}>
            <ShadowCard token="--shadow-sm" />
            <ShadowCard token="--shadow-md" />
            <ShadowCard token="--shadow-lg" />
          </div>
        </SgSection>

        {/* ── Buttons ── */}
        <SgSection id="sg-buttons" title="Buttons">
          <SgRow label="Variants">
            <button className="btn btn--primary"><Icon name="sparkle" size={14} /> Primary</button>
            <button className="btn btn--secondary"><Icon name="edit" size={14} /> Secondary</button>
            <button className="btn btn--ghost">Ghost</button>
            <button className="btn btn--icon btn--ghost"><Icon name="more" size={16} /></button>
            <button className="btn btn--primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
              <Icon name="trash" size={14} /> Danger
            </button>
          </SgRow>
          <SgRow label="States">
            <button className="btn btn--primary">Normal</button>
            <button className="btn btn--primary" disabled>Disabled</button>
            <button className="btn btn--secondary">Normal</button>
            <button className="btn btn--secondary" disabled>Disabled</button>
          </SgRow>
          <SgRow label="Sizes">
            <button className="btn btn--primary" style={{ fontSize: 11, padding: '4px 10px' }}>Small</button>
            <button className="btn btn--primary">Medium</button>
            <button className="btn btn--primary" style={{ fontSize: 15, padding: '10px 22px' }}>Large</button>
          </SgRow>
        </SgSection>

        {/* ── Pills ── */}
        <SgSection id="sg-pills" title="Pills & badges">
          <SgRow label="Semantic">
            <span className="pill" style={{ background: 'var(--accent)', color: 'var(--accent-fg)', borderColor: 'transparent' }}>Accent</span>
            <span className="pill" style={{ background: 'var(--success-soft)', color: 'var(--success-text)', borderColor: 'var(--success-soft-border)' }}>Success</span>
            <span className="pill" style={{ background: 'var(--info-soft)', color: 'var(--info-text)', borderColor: 'var(--info-soft-border)' }}>Info</span>
            <span className="pill" style={{ background: 'var(--warn-soft)', color: 'var(--warn-text)', borderColor: 'var(--warn-soft-border)' }}>Warning</span>
            <span className="pill" style={{ background: 'var(--danger-soft)', color: 'var(--danger-text)', borderColor: 'var(--danger-soft-border)' }}>Danger</span>
            <span className="pill" style={{ background: 'var(--mod)', color: 'var(--mod-fg)', borderColor: 'transparent' }}>Moderator</span>
          </SgRow>
          <SgRow label="Neutral">
            <span className="pill">Default</span>
            <span className="pill" style={{ background: 'var(--surface-3)', borderColor: 'var(--border-strong)' }}>Surface</span>
            <span className="pill" style={{ background: 'var(--text)', color: 'var(--bg)', borderColor: 'transparent' }}>Inverse</span>
          </SgRow>
        </SgSection>

        {/* ── Inputs ── */}
        <SgSection id="sg-inputs" title="Inputs">
          <SgRow label="Text input">
            <input className="input" placeholder="Placeholder text…" value={inputVal} onChange={e => setInputVal(e.target.value)} style={{ width: 260 }} />
            <input className="input" placeholder="Disabled" disabled style={{ width: 180, opacity: 0.6, cursor: 'not-allowed' }} />
          </SgRow>
          <SgRow label="With icon">
            <div className="search" style={{ width: 260 }}>
              <Icon name="search" size={16} />
              <input className="input" placeholder="Search…" />
            </div>
          </SgRow>
          <SgRow label="Textarea">
            <textarea className="input" placeholder="Multi-line input…" rows={3} style={{ width: 360, resize: 'vertical', fontFamily: 'inherit' }} />
          </SgRow>
          <SgRow label="Select">
            <select className="input" style={{ width: 200, padding: '7px 10px' }}>
              <option>Option one</option>
              <option>Option two</option>
              <option>Option three</option>
            </select>
          </SgRow>
        </SgSection>

        {/* ── Controls ── */}
        <SgSection id="sg-controls" title="Controls">
          <SgRow label="Toggle">
            <Toggle on={toggleA} onChange={setToggleA} />
            <Toggle on={toggleB} onChange={setToggleB} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{toggleA ? 'on' : 'off'} · {toggleB ? 'on' : 'off'}</span>
          </SgRow>
          <SgRow label="Segmented control">
            <SgSegmented />
          </SgRow>
          <SgRow label="Range">
            <input type="range" min="0" max="100" defaultValue="60" style={{ width: 200 }} />
          </SgRow>
        </SgSection>

        {/* ── Cards ── */}
        <SgSection id="sg-cards" title="Cards">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Default card</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Surface background, shadow-sm, 1px border</div>
            </div>
            <div className="card" style={{ padding: 20, borderStyle: 'dashed' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Dashed card</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>For placeholder / upload targets</div>
            </div>
            <div className="card" style={{ padding: 20, background: 'var(--success-soft)', borderColor: 'var(--success-soft-border)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--success-text)' }}>Success card</div>
              <div style={{ fontSize: 13, color: 'var(--success-text)', opacity: 0.8 }}>Semantic tinted variant</div>
            </div>
            <div className="card" style={{ padding: 20, background: 'var(--danger-soft)', borderColor: 'var(--danger-soft-border)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--danger-text)' }}>Danger card</div>
              <div style={{ fontSize: 13, color: 'var(--danger-text)', opacity: 0.8 }}>For destructive zones</div>
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Stat tile</div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[['arrowUp','142','Likes','var(--accent-strong)'],['arrowDown','17','Dislikes','var(--danger-text)'],['list','24','Questions',null],['message','89','Comments',null]].map(([icon,val,label,color]) => (
                <div key={label} className="card" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
                  <Icon name={icon} size={16} style={{ color: color || 'var(--text-muted)' }} />
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </SgSection>

        {/* ── Icons ── */}
        <SgSection id="sg-icons" title="Icons">
          <IconGrid />
        </SgSection>
      </div>
    </div>
  );
}

window.StyleguidePage = StyleguidePage;
