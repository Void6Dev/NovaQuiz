// === Profile screen ===

// ── Heatmap helpers ──────────────────────────────────────────────────────────

function _buildHeatmapWeeks(activityMap) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Align to Sunday (start of current week)
  const dow = today.getDay();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + (6 - dow)); // end = Saturday of current week

  const start = new Date(weekEnd);
  start.setDate(weekEnd.getDate() - 26 * 7 + 1);

  const weeks = [];
  const cur = new Date(start);

  for (let w = 0; w < 26; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (cur > today) {
        week.push(null);
      } else {
        const key = cur.toISOString().slice(0, 10);
        week.push({ date: key, ...(activityMap[key] || { xp: 0, questions: 0 }) });
      }
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const _DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Sub-components ───────────────────────────────────────────────────────────

function StatTile({ icon, label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      {accent && (
        <div style={{
          position: 'absolute', top: -12, right: -12,
          width: 80, height: 80, borderRadius: 999,
          background: 'var(--accent)', opacity: 0.08, filter: 'blur(16px)',
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon name={icon} size={13} style={{ color: accent ? 'var(--accent-strong)' : 'var(--text-muted)' }} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{label}</span>
      </div>
      <div className="mono" style={{
        fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1,
        color: accent ? 'var(--text)' : 'var(--text)',
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 5 }}>{sub}</div>
      )}
    </div>
  );
}

function ActivityHeatmap({ activity = [], loading }) {
  const activityMap = {};
  activity.forEach(a => { activityMap[a.date] = a; });

  const weeks = _buildHeatmapWeeks(activityMap);
  const CELL = 13, GAP = 3;

  const activeDays = activity.filter(a => a.xp > 0).length;

  const getColor = (xp) => {
    if (!xp) return 'var(--bg-2)';
    if (xp < 30)  return 'oklch(from var(--accent) l c h / 0.22)';
    if (xp < 80)  return 'oklch(from var(--accent) l c h / 0.45)';
    if (xp < 150) return 'oklch(from var(--accent) l c h / 0.70)';
    return 'var(--accent)';
  };

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Activity</h3>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          Last 26 weeks · {activeDays} active day{activeDays !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div style={{ height: 112, background: 'var(--bg-2)', borderRadius: 8, animation: 'pulse 1.4s ease-in-out infinite' }} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
            {/* Day labels */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: GAP,
              paddingTop: 20, marginRight: 6, flexShrink: 0,
            }}>
              {_DAYS_SHORT.map((label, i) => (
                <div key={i} style={{
                  height: CELL, fontSize: 9, color: 'var(--text-faint)',
                  lineHeight: CELL + 'px', textAlign: 'right', whiteSpace: 'nowrap',
                }}>
                  {i % 2 === 1 ? label : ''}
                </div>
              ))}
            </div>

            {/* Weeks grid */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Month labels */}
              <div style={{ display: 'flex', gap: GAP, height: 16, marginBottom: 4 }}>
                {weeks.map((week, wi) => {
                  const first = week.find(d => d);
                  if (!first) return <div key={wi} style={{ width: CELL }} />;
                  const d = new Date(first.date);
                  const show = d.getDate() <= 7;
                  return (
                    <div key={wi} style={{
                      width: CELL, fontSize: 9, color: 'var(--text-faint)',
                      whiteSpace: 'nowrap', overflow: 'visible',
                    }}>
                      {show ? _MONTHS[d.getMonth()] : ''}
                    </div>
                  );
                })}
              </div>

              {/* Cell grid */}
              <div style={{ display: 'flex', gap: GAP }}>
                {weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                    {week.map((day, di) => (
                      <div
                        key={di}
                        style={{
                          width: CELL, height: CELL, borderRadius: 3,
                          background: day ? getColor(day.xp) : 'transparent',
                          cursor: day && day.xp > 0 ? 'default' : 'default',
                          transition: 'background 200ms',
                        }}
                        title={day && day.xp > 0 ? `${day.date}: ${day.xp} XP, ${day.questions} questions` : day ? day.date : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: 10 }}>
        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>Less</span>
        {[
          'var(--bg-2)',
          'oklch(from var(--accent) l c h / 0.22)',
          'oklch(from var(--accent) l c h / 0.45)',
          'oklch(from var(--accent) l c h / 0.70)',
          'var(--accent)',
        ].map((c, i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>More</span>
      </div>
    </div>
  );
}

function StrongestTopics({ topics = [], loading }) {
  const top = topics.slice(0, 6);

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16,
      }}>Strongest Topics</h3>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 36, background: 'var(--bg-2)', borderRadius: 6, animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      ) : top.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '24px 0',
          color: 'var(--text-faint)', fontSize: 13,
        }}>
          Play quizzes to see your topic stats
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {top.map(t => {
            const info = window.TOPIC_BY_CODE[t.topic] || { hue: 200 };
            const bar  = `oklch(65% 0.17 ${info.hue})`;
            return (
              <div key={t.topic}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: 99,
                      background: bar, display: 'inline-block', flexShrink: 0,
                    }} />
                    {t.label}
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t.total}q</span>
                  </div>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{t.accuracy}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: t.accuracy + '%',
                    background: bar, borderRadius: 99,
                    transition: 'width 700ms var(--ease)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const _ACHIEVEMENT_STYLE = {
  first_play: { icon: '🎯', bg: 'oklch(94% 0.07 30)',  fg: 'oklch(35% 0.12 30)'  },
  on_fire:    { icon: '🔥', bg: 'oklch(93% 0.08 50)',  fg: 'oklch(35% 0.14 50)'  },
  dedicated:  { icon: '⚡', bg: 'oklch(93% 0.07 80)',  fg: 'oklch(35% 0.12 80)'  },
  polymath:   { icon: '🌐', bg: 'oklch(93% 0.07 220)', fg: 'oklch(35% 0.12 220)' },
  century:    { icon: '📚', bg: 'oklch(93% 0.07 270)', fg: 'oklch(35% 0.12 270)' },
  scholar:    { icon: '⭐', bg: 'oklch(93% 0.08 90)',  fg: 'oklch(35% 0.12 90)'  },
  sharp:      { icon: '✓',  bg: 'oklch(93% 0.08 145)', fg: 'oklch(35% 0.12 145)' },
  mentor:     { icon: '👥', bg: 'oklch(93% 0.06 200)', fg: 'oklch(35% 0.10 200)' },
};

function AchievementCard({ a }) {
  const style = _ACHIEVEMENT_STYLE[a.id] || { icon: '🏆', bg: 'var(--surface)', fg: 'var(--text-muted)' };
  return (
    <div style={{
      padding: '18px 14px', borderRadius: 'var(--r-lg)', textAlign: 'center',
      background: a.unlocked ? style.bg : 'var(--surface)',
      border: `1px solid ${a.unlocked ? 'transparent' : 'var(--border)'}`,
      opacity: a.unlocked ? 1 : 0.45,
      transition: 'opacity 300ms, box-shadow 200ms',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8, filter: a.unlocked ? 'none' : 'grayscale(1)' }}>
        {style.icon}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: a.unlocked ? style.fg : 'var(--text-muted)' }}>
        {a.name}
      </div>
      <div style={{ fontSize: 11, color: a.unlocked ? style.fg : 'var(--text-faint)', lineHeight: 1.4, opacity: 0.8 }}>
        {a.desc}
      </div>
    </div>
  );
}

function Achievements({ achievements = [], loading }) {
  const unlocked = achievements.filter(a => a.unlocked).length;
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Achievements</h3>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {loading ? '—' : `${unlocked} / ${achievements.length} unlocked`}
        </span>
      </div>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} style={{ height: 110, background: 'var(--bg-2)', borderRadius: 12, animation: 'pulse 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
          {achievements.map(a => <AchievementCard key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}

// ── Main profile page ─────────────────────────────────────────────────────────

function ProfilePage({ onNav }) {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const u = window.CURRENT_USER;

  useEffect(() => {
    window.API.get('/profile/stats/')
      .then(data => { setStats(data); setLoading(false); })
      .catch(err  => { setError(err.message); setLoading(false); });
  }, []);

  const initials = (u.name || u.username || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const joinedStr = stats?.joined
    ? new Date(stats.joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  return (
    <div className="page fade-in">
      <PageHeader
        title="Your profile"
        subtitle="XP, streaks, accuracy and achievements."
      />

      {/* ── Profile header card ── */}
      <div className="card slide-up" style={{ padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Avatar */}
          {u.avatar ? (
            <img src={u.avatar} alt="" style={{
              width: 72, height: 72, borderRadius: 999,
              objectFit: 'cover', flexShrink: 0,
            }} />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: 999,
              background: 'var(--accent)', color: 'var(--accent-fg)',
              display: 'grid', placeItems: 'center',
              fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', flexShrink: 0,
            }}>{initials}</div>
          )}

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, color: 'var(--text-faint)',
              textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <span className="mono">@{u.username}</span>
              {joinedStr && <span>· Joined {joinedStr}</span>}
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {u.name || u.username}
            </h2>
            {!loading && stats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {stats.rank > 0 && (
                  <span className="pill" style={{
                    background: 'oklch(from var(--accent) l c h / 0.15)',
                    color: 'var(--accent-strong)', border: 0, fontSize: 12, fontWeight: 600,
                  }}>
                    <Icon name="star" size={11} /> Rank #{stats.rank} · Top {stats.top_pct}%
                  </span>
                )}
                {stats.streak_longest > 0 && (
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    Longest streak: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{stats.streak_longest} days</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Streak badge */}
          {!loading && stats && stats.streak_current > 0 && (
            <div className="slide-up" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '14px 22px', borderRadius: 'var(--r-lg)',
              border: '1px solid var(--border)', background: 'var(--bg)',
              flexShrink: 0, gap: 2,
            }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>🔥</span>
              <div className="mono" style={{
                fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
              }}>{stats.streak_current}</div>
              <div style={{
                fontSize: 10, color: 'var(--text-faint)',
                textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
              }}>Day Streak</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stat tiles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatTile
          icon="star" label="Total XP" accent
          value={loading ? '—' : (stats?.xp ?? 0).toLocaleString()}
          sub={!loading && stats?.xp_this_week > 0 ? `+${stats.xp_this_week.toLocaleString()} this week` : ''}
        />
        <StatTile
          icon="play" label="Quizzes Played"
          value={loading ? '—' : (stats?.quizzes_played ?? 0).toLocaleString()}
          sub={!loading && stats?.quizzes_this_week > 0 ? `+${stats.quizzes_this_week} this week` : ''}
        />
        <StatTile
          icon="check" label="Accuracy"
          value={loading ? '—' : (stats?.accuracy != null ? `${stats.accuracy}%` : '—')}
          sub={!loading && stats?.questions_total > 0
            ? `${stats.correct_total?.toLocaleString()} of ${stats.questions_total?.toLocaleString()} correct`
            : ''}
        />
      </div>

      {/* ── Activity + Topics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 16 }}>
        <ActivityHeatmap activity={stats?.activity || []} loading={loading} />
        <StrongestTopics topics={stats?.topics || []} loading={loading} />
      </div>

      {/* ── Achievements ── */}
      <Achievements achievements={stats?.achievements || []} loading={loading} />

      {error && (
        <div style={{
          marginTop: 20, padding: '14px 18px', borderRadius: 'var(--r-lg)',
          background: 'oklch(95% 0.04 25)', color: 'oklch(40% 0.16 25)',
          fontSize: 13,
        }}>
          Could not load stats: {error}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}

window.ProfilePage = ProfilePage;
