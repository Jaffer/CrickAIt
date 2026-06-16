import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';

export default function ScorecardOverlay({ matchId, onClose }) {
  const [data, setData] = useState(null);
  const [activeInningIndex, setActiveInningIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const plan = localStorage.getItem('crickait_plan') || 'free';

  const fetchScorecard = async () => {
    if (plan === 'guest') {
      setLoading(false);
      return;
    }

    try {
      const res = await authenticatedFetch(`/scorecard/${matchId}`);
      const result = await res.json();
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
        setError('');
      }
    } catch (e) {
      console.error('Scorecard fetch error:', e);
      setError('Failed to load scorecard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (matchId) {
      setLoading(true);
      fetchScorecard();
      const interval = setInterval(fetchScorecard, 30000);
      return () => clearInterval(interval);
    }
  }, [matchId]);

  if (!matchId) return null;

  const getDismissalClass = (dismissal) => {
    if (!dismissal) return 'not-out';
    const d = dismissal.toLowerCase();
    if (d.includes('caught') || d.includes('catch')) return 'caught';
    if (d.includes('bowled') || d === 'bowled') return 'bowled';
    if (d.includes('lbw')) return 'lbw';
    if (d.includes('run') && d.includes('out')) return 'runout';
    if (d.includes('runout')) return 'runout';
    if (d.includes('stump')) return 'stumped';
    if (d.includes('retired')) return 'retired';
    if (d.includes('not out')) return 'not-out';
    return 'bowled';
  };

  const renderInningContent = (inning) => {
    const batting = inning.batting || [];
    const bowling = inning.bowling || [];

    if (!batting.length && !bowling.length) {
      return <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Innings data not available yet.</div>;
    }

    return (
      <>
        {batting.length > 0 && (
          <>
            <div className="sc-section-title">Batting</div>
            <table className="sc-table">
              <thead>
                <tr>
                  <th>Batter</th>
                  <th>R</th>
                  <th>B</th>
                  <th>4s</th>
                  <th>6s</th>
                  <th>SR</th>
                  <th>Dismissal</th>
                </tr>
              </thead>
              <tbody>
                {batting.map((b, idx) => {
                  const name = b.batsman ? b.batsman.name : 'Unknown';
                  const dismissal = b.dismissal || 'not out';
                  const dismissalText = b['dismissal-text'] || '';
                  const badgeClass = getDismissalClass(dismissal);
                  const badgeLabel = dismissal === 'not out' ? 'NOT OUT' : dismissal.toUpperCase();

                  return (
                    <tr key={idx}>
                      <td>
                        <span className="sc-player-name">{name}</span>
                        {dismissalText && <span className="sc-dismissal-text">{dismissalText}</span>}
                      </td>
                      <td><strong>{b.r ?? '-'}</strong></td>
                      <td>{b.b ?? '-'}</td>
                      <td>{b['4s'] ?? '-'}</td>
                      <td>{b['6s'] ?? '-'}</td>
                      <td>{b.sr ?? '-'}</td>
                      <td><span className={`sc-dismissal-badge ${badgeClass}`}>{badgeLabel}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {bowling.length > 0 && (
          <>
            <div className="sc-section-title">Bowling</div>
            <table className="sc-table">
              <thead>
                <tr>
                  <th>Bowler</th>
                  <th>O</th>
                  <th>M</th>
                  <th>R</th>
                  <th>W</th>
                  <th>ECO</th>
                </tr>
              </thead>
              <tbody>
                {bowling.map((bw, idx) => {
                  const name = bw.bowler ? bw.bowler.name : 'Unknown';
                  return (
                    <tr key={idx}>
                      <td><span className="sc-player-name">{name}</span></td>
                      <td>{bw.o ?? '-'}</td>
                      <td>{bw.m ?? '-'}</td>
                      <td>{bw.r ?? '-'}</td>
                      <td><strong>{bw.w ?? '-'}</strong></td>
                      <td>{bw.eco ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </>
    );
  };

  return (
    <div className="scorecard-overlay" style={{ display: 'flex' }}>
      <div className="scorecard-panel">
        <div className="scorecard-header">
          <h2>
            {plan === 'guest' ? 'Live Scoreboard Restricted' : (data?.name || 'Match')}
          </h2>
          <button className="scorecard-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {plan === 'guest' ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 500 }}>
            Signup to access the live scoreboard
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <div className="cricket-loader" style={{ justifyContent: 'center', marginBottom: '12px', display: 'flex', gap: '8px' }}>
              <div className="cricket-loader-bouncer"><div className="cricket-loader-ball"></div></div>
              <div className="cricket-loader-bouncer" style={{ animationDelay: '0.15s' }}><div className="cricket-loader-ball"></div></div>
              <div className="cricket-loader-bouncer" style={{ animationDelay: '0.3s' }}><div className="cricket-loader-ball"></div></div>
            </div>
            Loading scorecard...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#ff4b4b' }}>
            {error}
          </div>
        ) : (
          <>
            <div className="scorecard-meta">
              <div className="sc-teams">
                {data.teamInfo && data.teamInfo.length >= 2 ? (
                  <>
                    <div className="sc-team-badge">
                      <img src={data.teamInfo[0].img} alt={data.teamInfo[0].shortname} />
                      <span className="team-name">{data.teamInfo[0].name}</span>
                    </div>
                    <div className="sc-vs">VS</div>
                    <div className="sc-team-badge">
                      <span className="team-name">{data.teamInfo[1].name}</span>
                      <img src={data.teamInfo[1].img} alt={data.teamInfo[1].shortname} />
                    </div>
                  </>
                ) : data.teams ? (
                  <div className="sc-vs">{data.teams.join(' vs ')}</div>
                ) : null}
              </div>

              <div className="sc-info">
                <span>📍 {data.venue || 'Unknown'}</span>
                {data.tossWinner && (
                  <>
                    &nbsp;|&nbsp; <span>🪙 Toss: {data.tossWinner} chose to {data.tossChoice}</span>
                  </>
                )}
                &nbsp;|&nbsp; <span>🏏 {(data.matchType || '').toUpperCase()}</span>
              </div>
            </div>

            <div className="sc-score-bar">
              {(data.score || []).map((s, idx) => {
                const oversText = (s.o && s.o !== '-') ? <div className="inning-overs">({s.o} overs)</div> : '';
                return (
                  <div key={idx} className="sc-score-chip">
                    <div className="inning-label">{s.inning}</div>
                    <div className="inning-score">{s.r}/{s.w}</div>
                    {oversText}
                  </div>
                );
              })}
            </div>

            <div className="sc-status-bar">
              <span className="live-pulse"></span> {data.status}
            </div>

            {data.scorecard && data.scorecard.length > 0 ? (
              <>
                <div className="sc-innings-tabs">
                  {data.scorecard.map((inn, idx) => (
                    <button
                      key={idx}
                      className={`sc-innings-tab ${idx === activeInningIndex ? 'active' : ''}`}
                      onClick={() => setActiveInningIndex(idx)}
                    >
                      {inn.inning || `Innings ${idx + 1}`}
                    </button>
                  ))}
                </div>
                <div className="sc-innings-content">
                  {renderInningContent(data.scorecard[activeInningIndex])}
                </div>
              </>
            ) : (
              <div className="sc-innings-content">
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <i className="fa-solid fa-circle-info" style={{ fontSize: '2rem', color: 'var(--accent-color)', marginBottom: '10px' }}></i>
                  <br />
                  {data.note || 'Detailed scorecard not yet available for this match.'}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
