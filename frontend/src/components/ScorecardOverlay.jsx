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

  const getDismissalDetails = (dismissal) => {
    if (!dismissal) return { label: 'NOT OUT', className: 'bg-grass-green/20 text-grass-green border border-grass-green/30' };
    const d = dismissal.toLowerCase();
    if (d.includes('not out')) {
      return { label: 'NOT OUT', className: 'bg-grass-green/20 text-grass-green border border-grass-green/30' };
    }
    if (d.includes('caught') || d.includes('catch')) {
      return { label: 'CAUGHT', className: 'bg-blue-900/30 text-blue-400 border border-blue-900/50' };
    }
    if (d.includes('bowled') || d === 'bowled') {
      return { label: 'BOWLED', className: 'bg-red-900/30 text-red-400 border border-red-900/50' };
    }
    if (d.includes('lbw')) {
      return { label: 'LBW', className: 'bg-red-900/30 text-red-400 border border-red-900/50' };
    }
    if (d.includes('run') && d.includes('out')) {
      return { label: 'RUN OUT', className: 'bg-yellow-900/30 text-yellow-500 border border-yellow-900/50' };
    }
    if (d.includes('stump')) {
      return { label: 'STUMPED', className: 'bg-yellow-900/30 text-yellow-500 border border-yellow-900/50' };
    }
    if (d.includes('retired')) {
      return { label: 'RETIRED', className: 'bg-surface-variant text-text-muted border border-outline-variant/30' };
    }
    return { label: dismissal.toUpperCase(), className: 'bg-surface-variant text-on-surface-variant border border-outline-variant/20' };
  };

  const renderInningContent = (inning) => {
    const batting = inning.batting || [];
    const bowling = inning.bowling || [];

    if (!batting.length && !bowling.length) {
      return (
        <div className="text-center py-xl text-text-muted">
          Innings statistics not available yet for this phase of play.
        </div>
      );
    }

    return (
      <div className="space-y-lg">
        {/* Batting Section */}
        {batting.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-stadium-grey bg-pitch-dark/20">
            <div className="px-md py-2.5 bg-stadium-grey/40 border-b border-stadium-grey flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm text-grass-green">sports_cricket</span>
              <h4 className="font-label-caps text-[10px] text-text-muted uppercase tracking-wider font-bold">Batting Performance</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stadium-grey bg-pitch-dark/40 font-mono text-[10px] text-text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-sm">Batter</th>
                    <th className="py-2.5 px-sm text-center">R</th>
                    <th className="py-2.5 px-sm text-center">B</th>
                    <th className="py-2.5 px-sm text-center">4s</th>
                    <th className="py-2.5 px-sm text-center">6s</th>
                    <th className="py-2.5 px-sm text-center">SR</th>
                    <th className="py-2.5 px-sm">Dismissal</th>
                  </tr>
                </thead>
                <tbody>
                  {batting.map((b, idx) => {
                    const name = b.batsman ? b.batsman.name : 'Unknown';
                    const dismissal = b.dismissal || 'not out';
                    const dismissalText = b['dismissal-text'] || '';
                    const badge = getDismissalDetails(dismissal);

                    return (
                      <tr key={idx} className="border-b border-stadium-grey/50 hover:bg-surface-variant/20 transition-colors">
                        <td className="py-2 px-sm">
                          <span className="font-semibold text-on-surface text-sm block">{name}</span>
                          {dismissalText && <span className="text-[11px] text-text-muted block mt-0.5 leading-tight">{dismissalText}</span>}
                        </td>
                        <td className="py-2 px-sm text-center font-mono font-bold text-grass-green">
                          {b.r ?? '-'}
                        </td>
                        <td className="py-2 px-sm text-center font-mono text-sm text-on-surface/80">{b.b ?? '-'}</td>
                        <td className="py-2 px-sm text-center font-mono text-sm text-on-surface/80">{b['4s'] ?? '-'}</td>
                        <td className="py-2 px-sm text-center font-mono text-sm text-on-surface/80">{b['6s'] ?? '-'}</td>
                        <td className="py-2 px-sm text-center font-mono text-sm text-on-surface/80">{b.sr ?? '-'}</td>
                        <td className="py-2 px-sm">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-label-caps font-bold tracking-wide ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bowling Section */}
        {bowling.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-stadium-grey bg-pitch-dark/20">
            <div className="px-md py-2.5 bg-stadium-grey/40 border-b border-stadium-grey flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm text-trophy-gold">sports_cricket</span>
              <h4 className="font-label-caps text-[10px] text-text-muted uppercase tracking-wider font-bold">Bowling Analysis</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stadium-grey bg-pitch-dark/40 font-mono text-[10px] text-text-muted uppercase tracking-wider">
                    <th className="py-2.5 px-sm">Bowler</th>
                    <th className="py-2.5 px-sm text-center">O</th>
                    <th className="py-2.5 px-sm text-center">M</th>
                    <th className="py-2.5 px-sm text-center">R</th>
                    <th className="py-2.5 px-sm text-center">W</th>
                    <th className="py-2.5 px-sm text-center">ECO</th>
                  </tr>
                </thead>
                <tbody>
                  {bowling.map((bw, idx) => {
                    const name = bw.bowler ? bw.bowler.name : 'Unknown';
                    return (
                      <tr key={idx} className="border-b border-stadium-grey/50 hover:bg-surface-variant/20 transition-colors">
                        <td className="py-2 px-sm font-semibold text-on-surface text-sm">{name}</td>
                        <td className="py-2 px-sm text-center font-mono text-sm text-on-surface/80">{bw.o ?? '-'}</td>
                        <td className="py-2 px-sm text-center font-mono text-sm text-on-surface/80">{bw.m ?? '-'}</td>
                        <td className="py-2 px-sm text-center font-mono text-sm text-on-surface/80">{bw.r ?? '-'}</td>
                        <td className="py-2 px-sm text-center font-mono font-bold text-trophy-gold">{bw.w ?? '-'}</td>
                        <td className="py-2 px-sm text-center font-mono text-sm text-on-surface/80">{bw.eco ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-sm md:p-md bg-pitch-dark/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl h-[90vh] md:h-[85vh] bg-surface-container-low border border-stadium-grey rounded-2xl shadow-2xl flex flex-col overflow-hidden border-t-4 border-trophy-gold glass-panel">
        
        {/* Header */}
        <div className="px-md py-sm border-b border-stadium-grey flex justify-between items-center bg-surface-container-lowest/50">
          <h2 className="font-headline-md text-base md:text-lg text-on-background font-bold flex items-center gap-xs">
            <span className="material-symbols-outlined text-trophy-gold">sports_cricket</span>
            {plan === 'guest' ? 'Live Scoreboard Restricted' : (data?.name || 'Match Details')}
          </h2>
          <button 
            className="text-text-muted hover:text-on-background text-2xl transition-colors font-semibold"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Content Box */}
        <div className="flex-grow overflow-y-auto custom-scrollbar p-sm md:p-md space-y-md">
          {plan === 'guest' ? (
            <div className="flex flex-col items-center justify-center py-xl text-center">
              <span className="material-symbols-outlined text-trophy-gold text-4xl mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              <p className="font-bold text-on-surface text-base mb-xs">Live Scoreboard is Restricted</p>
              <p className="text-xs text-text-muted max-w-xs leading-relaxed">
                Please sign up or upgrade your account to unlock professional, real-time live scoreboards and predictive win metrics.
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-xl text-center">
              <div className="flex justify-center gap-2 mb-sm">
                <div className="w-2.5 h-2.5 bg-grass-green rounded-full animate-bounce"></div>
                <div className="w-2.5 h-2.5 bg-grass-green rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2.5 h-2.5 bg-grass-green rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <p className="text-text-muted text-xs font-label-caps uppercase tracking-wider">Syncing broadcast feeds...</p>
            </div>
          ) : error ? (
            <div className="text-center py-xl text-error text-sm font-semibold">{error}</div>
          ) : (
            <>
              {/* Match Header Info */}
              <div className="p-md rounded-xl bg-stadium-grey/40 border border-stadium-grey flex flex-col md:flex-row justify-between items-center gap-md">
                <div className="flex items-center gap-md">
                  {data.teamInfo && data.teamInfo.length >= 2 ? (
                    <div className="flex items-center gap-sm">
                      <div className="flex items-center gap-xs">
                        {data.teamInfo[0].img && <img src={data.teamInfo[0].img} alt={data.teamInfo[0].shortname} className="w-6 h-6 object-cover rounded-full" />}
                        <span className="font-bold font-display text-sm md:text-base text-on-surface uppercase">{data.teamInfo[0].name}</span>
                      </div>
                      <span className="font-mono text-trophy-gold text-xs font-bold px-2 py-0.5 bg-pitch-dark/50 border border-outline-variant/30 rounded">VS</span>
                      <div className="flex items-center gap-xs">
                        <span className="font-bold font-display text-sm md:text-base text-on-surface uppercase">{data.teamInfo[1].name}</span>
                        {data.teamInfo[1].img && <img src={data.teamInfo[1].img} alt={data.teamInfo[1].shortname} className="w-6 h-6 object-cover rounded-full" />}
                      </div>
                    </div>
                  ) : (
                    <span className="font-bold text-sm text-on-surface">{data.teams?.join(' vs ')}</span>
                  )}
                </div>
                
                <div className="flex flex-col items-center md:items-end text-xs text-text-muted font-mono leading-relaxed text-center md:text-right">
                  <span className="block">📍 {data.venue || 'Unknown Venue'}</span>
                  {data.tossWinner && (
                    <span className="block mt-0.5 text-trophy-gold">🪙 Toss: {data.tossWinner} ({data.tossChoice})</span>
                  )}
                </div>
              </div>

              {/* Innings Summaries */}
              <div className="flex flex-wrap gap-sm py-xs overflow-x-auto scroll-hide border-b border-stadium-grey">
                {(data.score || []).map((s, idx) => {
                  const oversText = (s.o && s.o !== '-') ? ` (${s.o} ov)` : '';
                  return (
                    <div key={idx} className="px-md py-2 rounded-xl bg-pitch-dark/50 border border-outline-variant/20 flex flex-col font-mono">
                      <span className="text-[10px] text-text-muted font-label-caps uppercase block tracking-wider mb-0.5">{s.inning}</span>
                      <span className="font-bold text-grass-green text-sm">{s.r}/{s.w}{oversText}</span>
                    </div>
                  );
                })}
              </div>

              {/* Match Live Status */}
              <div className="flex items-center gap-xs p-md bg-grass-green/5 border border-grass-green/20 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-grass-green animate-pulse"></span>
                <span className="text-xs font-mono text-on-surface font-semibold uppercase">{data.status}</span>
              </div>

              {/* Innings Tabs & Scorecard tables */}
              {data.scorecard && data.scorecard.length > 0 ? (
                <div className="space-y-sm">
                  {/* Tabs */}
                  <div className="flex border-b border-stadium-grey bg-surface-container-low/30 rounded-t-xl overflow-hidden">
                    {data.scorecard.map((inn, idx) => (
                      <button
                        key={idx}
                        className={`flex-1 py-3 text-center text-xs font-bold uppercase transition-all tracking-wider border-b-2 ${idx === activeInningIndex ? 'border-grass-green text-grass-green bg-primary-container/5' : 'border-transparent text-text-muted hover:text-on-background'}`}
                        onClick={() => setActiveInningIndex(idx)}
                      >
                        {inn.inning || `Innings ${idx + 1}`}
                      </button>
                    ))}
                  </div>

                  {/* Selected Innings content */}
                  <div className="animate-fade-in">
                    {renderInningContent(data.scorecard[activeInningIndex])}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-lg rounded-xl border border-outline-variant/20 bg-pitch-dark/10">
                  <span className="material-symbols-outlined text-text-muted text-3xl mb-xs">info</span>
                  <p className="text-xs text-text-muted text-center max-w-sm">
                    {data.note || 'Detailed scorecard metrics not yet available for this fixture. Wait for players to step onto the field!'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
