import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';

export default function LiveMatches({ onSelectMatch }) {
  const [matches, setMatches] = useState([]);
  const [statusText, setStatusText] = useState('Loading live matches...');
  const plan = localStorage.getItem('crickait_plan') || 'free';

  const loadLiveMatches = async () => {
    if (plan === 'guest') {
      setStatusText('Signup to access the live scoreboard');
      return;
    }

    try {
      const res = await authenticatedFetch('/live-scores');
      if (!res.ok) {
        if (res.status === 403) {
          setStatusText('Signup to access the live scoreboard');
        } else {
          setStatusText('No live matches');
        }
        return;
      }
      const data = await res.json();
      if (data.matches && data.matches.length > 0) {
        setMatches(data.matches);
        setStatusText('');
      } else {
        setMatches([]);
        setStatusText('No live matches');
      }
    } catch (e) {
      console.error(e);
      setStatusText('Scores unavailable');
    }
  };

  useEffect(() => {
    loadLiveMatches();
    const interval = setInterval(loadLiveMatches, 30000);
    return () => clearInterval(interval);
  }, [plan]);

  if (plan === 'guest') {
    return (
      <div className="live-matches-section">
        <div className="section-title">🔴 Live Matches</div>
        <div className="live-matches-container">
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '12px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '6px', margin: '4px' }}>
            Signup to access the live scoreboard
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="live-matches-section">
      <div className="section-title">🔴 Live Matches</div>
      <div className="live-matches-container">
        {statusText && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '6px' }}>
            {statusText}
          </div>
        )}
        {!statusText && matches.map(m => (
          <div key={m.id} className="live-match-card" onClick={() => onSelectMatch(m.id)}>
            <div className="match-teams">
              {(m.teamInfo || []).map(t => (
                <img key={t.shortname} src={t.img} alt={t.shortname} title={t.name} />
              ))}
              <span className="live-pulse"></span> {m.teams ? m.teams.join(' vs ') : m.name}
            </div>
            {(m.score || []).map((s, idx) => {
              const oversText = (s.o && s.o !== '-') ? ` (${s.o} ov)` : '';
              return (
                <div key={idx} className="match-score">
                  {s.inning}: {s.r}/{s.w}{oversText}
                </div>
              );
            })}
            <div className="match-status">{m.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
