import React, { useState, useEffect } from 'react';
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

  // ---- State: Match config ---- (no match format, no targeted type)
  const [matchConfig, setMatchConfig] = useState({
    tournament: '',
    teamA: '',
    teamB: '',
    player: '',
    situation: ''
  });

  // ---- State: Single scenario generation ----
  const [scenarios, setScenarios] = useState([]);
  const [loadingScenario, setLoadingScenario] = useState(false);

  // ---- State: Polls (basic only) ----
  const [pollVotes, setPollVotes] = useState({});
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

  // ---- API: Generate single scenario (no multiple, no type selection) ----
  const generateScenario = async () => {
    setLoadingScenario(true);
    setApiError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/generate_scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchConfig)
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setScenarios([{
        ...d,
        question: d.question || 'Predicted scenario',
        id: d.id || 'scenario1',
        votes: { 'yes': 0, 'no': 0 }
      }]);
      setPollVotes({});
    } catch (error) {
      setApiError('Error generating scenario.');
    }
    setLoadingScenario(false);
  };

  // ---- Handler: Vote on poll ----
  const handleVote = async (scenarioId, answer) => {
    setPollVotes(prevVotes => ({ ...prevVotes, [scenarioId]: answer }));
    try {
      const res = await fetch(`${BACKEND_URL}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId, answer }),
      });
      if (!res.ok) setApiError('Failed to submit vote.');
    } catch {
      setApiError('Failed to submit vote.');
    }
  };

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
      setPollVotes({});
      setScenarios([]);
    } catch {
      setApiError('Reset failed.');
    }
  };

  // ---- Handler: Regenerate scenario ----
  const handleRegenerate = async () => {
    generateScenario();
  };

  // ---- Sidebar features ----
  const sidebarFeatures = [
    'Match configuration (teams, player, situation)',
    'Scenario & question generation',
    'Basic poll voting',
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
            >Regenerate scenario</button>
          </section>
        </aside>
        <main className="cd-content">
          <section className="cd-config-section">
            <h2>Match Configuration</h2>
            <div className="cd-config-grid">
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
              <div style={{ alignSelf: 'end' }}>
                <button
                  onClick={generateScenario}
                  className="cd-accent-btn"
                  disabled={loadingScenario}
                >
                  {loadingScenario ? 'Generating...' : 'Generate!'}
                </button>
              </div>
            </div>
          </section>

          <section className="cd-scenarios-section">
            <h2>
              Generated Scenario & Question
              <span style={{fontSize:'0.8em', color:COLORS.secondary,marginLeft:12}}>
                ({scenarios.length ? scenarios.length : 'No'} scenario)
              </span>
            </h2>
            {apiError && <div className="cd-error">{apiError}</div>}
            <div className="cd-scenarios-grid">
              {scenarios.map((sc) => (
                <ScenarioCard
                  key={sc.id}
                  scenario={sc}
                  userVote={pollVotes[sc.id]}
                  onVote={handleVote}
                  accentColor={COLORS.accent}
                  secondaryColor={COLORS.secondary}
                />
              ))}
            </div>
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
function ScenarioCard({ scenario, userVote, onVote, accentColor, secondaryColor }) {
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
    </div>
  );
}

export default App;
