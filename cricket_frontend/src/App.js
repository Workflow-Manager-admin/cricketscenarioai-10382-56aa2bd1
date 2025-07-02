import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// ---- Color palette from requirements ----
const COLORS = {
  primary: '#228be6',
  secondary: '#00b894',
  accent: '#f39c12',
};


// PUBLIC_INTERFACE
function App() {
  // Theme
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // ---- State: Match config ----
  const [matchConfig, setMatchConfig] = useState({
    format: 'T20',
    tournament: '',
    teamA: '',
    teamB: '',
    player: '',
    situation: ''
  });

  // ---- State: Scenario generation ----
  const [scenarios, setScenarios] = useState([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [scenarioCount, setScenarioCount] = useState(1);

  // ---- State: Polls ----
  const [pollVotes, setPollVotes] = useState({});
  const [pollResults, setPollResults] = useState({});
  const [analytics, setAnalytics] = useState(null);

  // ---- State: Backend ----
  const [apiError, setApiError] = useState(null);

  // ---- Constants: Backend endpoint ----
  const BACKEND_URL = process.env.REACT_APP_API_BACKEND || 'http://localhost:3001';

  // ---- Handler: Match config updates ----
  const handleConfigChange = (e) => {
    setMatchConfig({
      ...matchConfig,
      [e.target.name]: e.target.value
    });
  };

  // ---- API: Generate scenarios ----
  const generateScenarios = async () => {
    setLoadingScenarios(true);
    setApiError(null);
    try {
      // Parallel generation requests
      const promises = [];
      for (let i = 0; i < scenarioCount; i++) {
        promises.push(fetch(`${BACKEND_URL}/generate_scenario`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchConfig)
        }));
      }
      const responses = await Promise.all(promises);
      const data = await Promise.all(responses.map(r => r.json()));
      setScenarios(data.map((d, idx) => ({
        ...d,
        question: d.question || `Predicted scenario Q${idx + 1}`,
        id: d.id || `scenario${idx + 1}`,
        votes: {'yes': 0, 'no': 0},
      })));
    } catch (error) {
      setApiError('Error generating scenarios.');
    }
    setLoadingScenarios(false);
  };

  // ---- Handler: Vote on poll ----
  const handleVote = async (scenarioId, answer) => {
    // Optimistic update
    setPollVotes(prevVotes => ({ ...prevVotes, [scenarioId]: answer }));
    try {
      const res = await fetch(`${BACKEND_URL}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId, answer }),
      });
      if (res.ok) {
        fetchPollResults();
      } else {
        setApiError('Failed to submit vote.');
      }
    } catch {
      setApiError('Failed to submit vote.');
    }
  };

  // ---- Fetch poll results/analytics ----
  const fetchPollResults = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/poll_results`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPollResults(data.results || {});
      setAnalytics(data.analytics || {});
    } catch {
      setApiError('Failed to fetch poll results.');
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    fetchPollResults();
  }, [fetchPollResults]);

  // ---- Handler: Data export ----
  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/export_csv`);
      if (!res.ok) throw new Error();
      const csv = await res.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'cricket_polls.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch {
      setApiError('CSV export failed.');
    }
  };

  // ---- Handler: Data reset ----
  const handleReset = async () => {
    if (!window.confirm('Clear all poll data? This cannot be undone.')) return;
    try {
      const res = await fetch(`${BACKEND_URL}/reset_data`, { method: 'POST' });
      if (!res.ok) throw new Error();
      setPollResults({});
      setAnalytics(null);
      setPollVotes({});
      setScenarios([]);
    } catch {
      setApiError('Reset failed.');
    }
  };

  // ---- Handler: Regenerate scenarios ----
  const handleRegenerate = async () => {
    generateScenarios();
  };

  // ---- Sidebar features ----
  const sidebarFeatures = [
    'Match configuration (format, teams, player, situation)',
    'Scenario & question AI generation',
    'Multiple parallel scenarios',
    'Live poll voting',
    'Real-time progress & charts',
    'Detailed poll analytics',
    'Data export (.csv download)',
    'Data reset & scenario regeneration'
  ];

  // ---- Layout ----
  return (
    <div className="cricket-dashboard-app">
      <header className="cd-header">
        <h1>
          <span role="img" aria-label="cricket">🏏</span>
          Cricket Scenario AI Dashboard
        </h1>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </header>
      <div className="cd-main-area">
        <aside className="cd-sidebar" style={{ background: COLORS.primary }}>
          <section>
            <h2 style={{ color: COLORS.accent }}>Features</h2>
            <ul>
              {sidebarFeatures.map((feat, idx) => <li key={idx}>{feat}</li>)}
            </ul>
          </section>
          <section>
            <button
              className="cd-sidebar-btn"
              style={{ background: COLORS.accent, color: '#fff', marginBottom:12 }}
              onClick={handleExportCSV}
            >Export polls (.CSV)</button>
            <button
              className="cd-sidebar-btn"
              style={{ background: COLORS.secondary, color: '#fff', marginBottom:12 }}
              onClick={handleReset}
            >Reset all data</button>
            <button
              className="cd-sidebar-btn"
              style={{ background: COLORS.primary, color: '#fff' }}
              onClick={handleRegenerate}
            >Regenerate scenarios</button>
          </section>
        </aside>
        <main className="cd-content">
          <section className="cd-config-section">
            <h2>Match Configuration</h2>
            <div className="cd-config-grid">
              <div>
                <label>Format</label>
                <select name="format" value={matchConfig.format} onChange={handleConfigChange}>
                  <option value="T20">T20</option>
                  <option value="ODI">ODI</option>
                  <option value="Test">Test</option>
                </select>
              </div>
              <div>
                <label>Tournament</label>
                <input name="tournament" value={matchConfig.tournament} onChange={handleConfigChange} placeholder="e.g. IPL" />
              </div>
              <div>
                <label>Team A</label>
                <input name="teamA" value={matchConfig.teamA} onChange={handleConfigChange} placeholder="e.g. India" />
              </div>
              <div>
                <label>Team B</label>
                <input name="teamB" value={matchConfig.teamB} onChange={handleConfigChange} placeholder="e.g. Australia" />
              </div>
              <div>
                <label>Player (focus)</label>
                <input name="player" value={matchConfig.player} onChange={handleConfigChange} placeholder="e.g. Virat Kohli" />
              </div>
              <div style={{ gridColumn: '1/3', display: 'flex', flexDirection: 'column' }}>
                <label>Situation</label>
                <input name="situation" value={matchConfig.situation} onChange={handleConfigChange} placeholder="e.g. Final over, 12 runs required" />
              </div>
              <div>
                <label>No. of Scenarios</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={scenarioCount}
                  onChange={e => setScenarioCount(Math.max(1, Math.min(10, +e.target.value)))}
                  style={{ width: '60px' }}
                />
              </div>
              <div style={{ alignSelf: 'end' }}>
                <button
                  onClick={generateScenarios}
                  className="cd-accent-btn"
                  disabled={loadingScenarios}
                >
                  {loadingScenarios ? 'Generating...' : 'Generate!'}
                </button>
              </div>
            </div>
          </section>

          <section className="cd-scenarios-section">
            <h2>
              Generated Scenarios & Questions
              <span style={{fontSize:'0.8em', color:COLORS.secondary,marginLeft:12}}>
                ({scenarios.length ? scenarios.length : 'No'} scenarios)
              </span>
            </h2>
            {apiError && <div className="cd-error">{apiError}</div>}
            <div className="cd-scenarios-grid">
              {scenarios.map((sc, idx) => (
                <ScenarioCard
                  key={sc.id}
                  scenario={sc}
                  votes={pollResults[sc.id]}
                  userVote={pollVotes[sc.id]}
                  onVote={handleVote}
                  accentColor={COLORS.accent}
                  secondaryColor={COLORS.secondary}
                />
              ))}
            </div>
          </section>

          <section className="cd-analytics-section">
            <h2>Poll Analytics</h2>
            <AnalyticsPanel analytics={analytics} colors={COLORS} />
          </section>
        </main>
      </div>
      <footer className="cd-footer">
        <small>
          &copy; {new Date().getFullYear()} Cricket Scenario AI | Built with React, Flask, and OpenAI.
        </small>
      </footer>
    </div>
  );
}

// PUBLIC_INTERFACE
function ScenarioCard({ scenario, votes, userVote, onVote, accentColor, secondaryColor }) {
  const total = (votes?.yes || 0) + (votes?.no || 0);
  const yesPct = total ? Math.round((votes?.yes || 0) / total * 100) : 0;
  const noPct = total ? Math.round((votes?.no || 0) / total * 100) : 0;
  return (
    <div className="cd-scenario-card">
      <div className="cd-card-title">{scenario.question}</div>
      <div className="cd-card-context">
        <span>{scenario.explanation || scenario.context || ''}</span>
      </div>
      <div className="cd-vote-options">
        <button
          className={`cd-poll-btn ${userVote === 'yes' ? 'active' : ''}`}
          style={{ background: userVote === 'yes' ? accentColor : undefined }}
          onClick={() => onVote(scenario.id, 'yes')}
          aria-pressed={userVote === 'yes'}
        >Yes</button>
        <button
          className={`cd-poll-btn ${userVote === 'no' ? 'active' : ''}`}
          style={{ background: userVote === 'no' ? secondaryColor : undefined }}
          onClick={() => onVote(scenario.id, 'no')}
          aria-pressed={userVote === 'no'}
        >No</button>
      </div>
      <div className="cd-progress-bar">
        <div
          style={{
            width: `${yesPct}%`,
            background: accentColor,
            height: 12,
            borderRadius: 6,
            display: 'inline-block',
            transition: 'width 0.4s'
          }}
          aria-label={`${yesPct}% yes`}
        />
        <div
          style={{
            width: `${noPct}%`,
            background: secondaryColor,
            height: 12,
            borderRadius: 6,
            display: 'inline-block',
            transition: 'width 0.4s',
            marginLeft: yesPct ? 2 : 0
          }}
          aria-label={`${noPct}% no`}
        />
      </div>
      <div style={{ fontSize: 12, marginTop: 4 }}>
        <b>Yes:</b> {votes?.yes || 0} ({yesPct}%) &nbsp; <b>No:</b> {votes?.no || 0} ({noPct}%) &nbsp; <b>Total:</b> {total}
      </div>
      <div style={{ marginTop: 8 }}>
        <PieChart yes={votes?.yes || 0} no={votes?.no || 0} accentColor={accentColor} secondaryColor={secondaryColor} />
      </div>
    </div>
  );
}
// PUBLIC_INTERFACE
function PieChart({ yes, no, accentColor, secondaryColor }) {
  const total = yes + no || 1;
  const yesAngle = (yes / total) * 360;
  const noAngle = (no / total) * 360;
  return (
    <svg width="48" height="48" viewBox="0 0 32 32" style={{ verticalAlign: 'middle' }}>
      <circle r="16" cx="16" cy="16" fill="#f4f4f4" />
      <path
        d={describeArc(16, 16, 16, 0, yesAngle)}
        fill={accentColor}
        stroke={accentColor}
        strokeWidth="1"
      />
      <path
        d={describeArc(16, 16, 16, yesAngle, yesAngle + noAngle)}
        fill={secondaryColor}
        stroke={secondaryColor}
        strokeWidth="1"
      />
    </svg>
  );
}
function describeArc(x, y, radius, startAngle, endAngle){
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
  const d = [
      "M", start.x, start.y,
      "A", radius, radius, 0, arcSweep, 0, end.x, end.y,
      "L", x, y,
      "L", start.x, start.y
  ].join(" ");
  return d;
}
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

// PUBLIC_INTERFACE
function AnalyticsPanel({ analytics, colors }) {
  if (!analytics) return <div className="cd-an-panel-empty">Analytics will appear after voting.</div>;
  return (
    <div className="cd-an-panel">
      <div>
        <b>Total questions polled:</b> {analytics.total_questions}
      </div>
      <div>
        <b>Total votes:</b> {analytics.total_votes}
      </div>
      <div>
        <b>Yes count:</b> {analytics.total_yes} &nbsp; | &nbsp; <b>No count:</b> {analytics.total_no}
      </div>
      <div>
        <b>Yes %:</b> {analytics.yes_pct || 0}% &nbsp; | <b>No %:</b> {analytics.no_pct || 0}%
      </div>
      <div>
        <b>Poll types:</b> {analytics.poll_types && Object.entries(analytics.poll_types).map(([type, count]) =>
          <span key={type} style={{ marginRight: 8 }}>{type}: {count}</span>
        )}
      </div>
      <div>
        <b>Recent poll history:</b>
        <ul style={{ margin: 0 }}>
          {(analytics.history || []).slice(-5).map((entry, idx) =>
            <li key={idx}>{entry.question} – Yes: {entry.yes}, No: {entry.no}</li>
          )}
        </ul>
      </div>
    </div>
  );
}


export default App;
