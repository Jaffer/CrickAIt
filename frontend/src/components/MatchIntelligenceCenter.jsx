import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../services/api';
import MatchStoryCard from './MatchStoryCard';
import WinProbabilityCard from './WinProbabilityCard';
import TacticalInsightCard from './TacticalInsightCard';
import KeyBattlesCard from './KeyBattlesCard';
import LiveTimeline from './LiveTimeline';
import ChatInterface from './ChatInterface';

export default function MatchIntelligenceCenter({ 
  matchId, 
  onClose,
  currentSessionId,
  setCurrentSessionId,
  showSimpleAlert,
  setErrorOverlay,
  onLogout 
}) {
  const [scorecard, setScorecard] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const plan = localStorage.getItem('crickait_plan') || 'free';

  const fetchData = async () => {
    try {
      // 1. Fetch live scorecard
      const scRes = await authenticatedFetch(`/scorecard/${matchId}`);
      const scData = await scRes.json();
      if (scData.error) throw new Error(scData.error);
      setScorecard(scData);
      
      // 2. Fetch intelligence
      const intRes = await authenticatedFetch(`/scorecard/${matchId}/intelligence`);
      if (intRes.ok) {
        const intData = await intRes.json();
        setIntelligence(intData);
      }
      
      setError('');
    } catch (e) {
      console.error('Intelligence Center fetch error:', e);
      setError('Failed to load Match Intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (matchId) {
      setLoading(true);
      fetchData();
      const interval = setInterval(fetchData, 60000); // refresh every minute
      return () => clearInterval(interval);
    }
  }, [matchId]);

  if (!matchId) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row w-full h-full bg-background overflow-hidden">
      
      {/* LEFT & CENTER: Match Intelligence Dashboard */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar border-r border-stadium-grey relative">
        {/* Top Header */}
        <div className="sticky top-0 z-10 px-md py-sm border-b border-stadium-grey flex justify-between items-center bg-surface/90 backdrop-blur-md">
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-grass-green text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              memory
            </span>
            <h2 className="font-headline-md text-base md:text-lg text-on-background font-bold">
              AI Match Intelligence
            </h2>
          </div>
          <button 
            className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-on-surface bg-surface-container-high px-3 py-1 rounded-full transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Exit Live
          </button>
        </div>

        {/* Dashboard Content */}
        <div className="p-sm md:p-md space-y-md">
          {loading && !scorecard ? (
            <div className="flex flex-col items-center justify-center py-xl text-center">
               <div className="flex justify-center gap-2 mb-sm">
                 <div className="w-2.5 h-2.5 bg-grass-green rounded-full animate-bounce"></div>
                 <div className="w-2.5 h-2.5 bg-grass-green rounded-full animate-bounce [animation-delay:0.2s]"></div>
                 <div className="w-2.5 h-2.5 bg-grass-green rounded-full animate-bounce [animation-delay:0.4s]"></div>
               </div>
               <p className="text-text-muted text-xs font-label-caps uppercase tracking-wider">Compiling AI Insights...</p>
            </div>
          ) : error ? (
            <div className="text-center py-xl text-error text-sm font-semibold">{error}</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-md animate-fade-in">
              
              {/* Scorecard Strip */}
              <div className="lg:col-span-12">
                <div className="p-md rounded-xl bg-stadium-grey/40 border border-stadium-grey flex flex-col md:flex-row justify-between items-center gap-md shadow-sm">
                  <div className="flex items-center gap-md">
                    {scorecard?.teamInfo && scorecard.teamInfo.length >= 2 ? (
                      <div className="flex items-center gap-sm">
                        <span className="font-bold font-display text-sm md:text-base text-on-surface uppercase">{scorecard.teamInfo[0].name}</span>
                        <span className="font-mono text-trophy-gold text-xs font-bold px-2 py-0.5 bg-pitch-dark/50 border border-outline-variant/30 rounded">VS</span>
                        <span className="font-bold font-display text-sm md:text-base text-on-surface uppercase">{scorecard.teamInfo[1].name}</span>
                      </div>
                    ) : (
                      <span className="font-bold text-sm text-on-surface">{scorecard?.teams?.join(' vs ')}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-sm">
                    {(scorecard?.score || []).map((s, idx) => (
                      <div key={idx} className="px-sm py-1 rounded bg-pitch-dark/50 border border-outline-variant/20 flex flex-col items-center font-mono">
                        <span className="text-[9px] text-text-muted uppercase font-bold">{s.inning}</span>
                        <span className="font-bold text-grass-green text-sm">{s.r}/{s.w} <span className="text-xs font-normal text-on-surface-variant">({s.o})</span></span>
                      </div>
                    ))}
                    <div className="ml-sm flex items-center gap-1.5 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-red-500 font-mono text-[10px] font-bold uppercase tracking-wider animate-pulse">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      Live
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Story & Win Prob */}
              <div className="lg:col-span-8 flex flex-col gap-md">
                <MatchStoryCard story={intelligence?.match_story} />
                <WinProbabilityCard 
                  probability={intelligence?.win_probability} 
                  battingTeam={scorecard?.teamInfo?.[0]?.shortname || 'Team 1'} 
                  bowlingTeam={scorecard?.teamInfo?.[1]?.shortname || 'Team 2'} 
                />
              </div>

              {/* Tactical & Battles */}
              <div className="lg:col-span-4 flex flex-col gap-md">
                <TacticalInsightCard insight={intelligence?.tactical_insight} />
                <KeyBattlesCard battles={intelligence?.key_battles} />
              </div>

              {/* Timeline */}
              <div className="lg:col-span-12">
                <LiveTimeline scorecard={scorecard?.scorecard} />
              </div>

            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Chat Interface */}
      <div className="w-full md:w-1/3 lg:w-96 flex flex-col h-[50vh] md:h-full border-t md:border-t-0 border-stadium-grey bg-surface">
         <div className="px-sm py-2 bg-surface-container border-b border-stadium-grey flex items-center gap-xs">
            <span className="material-symbols-outlined text-sky-400 text-sm">chat_bubble</span>
            <span className="text-xs font-bold text-on-surface uppercase tracking-wide">Ask AI</span>
         </div>
         <div className="flex-1 overflow-hidden">
            <ChatInterface
              currentSessionId={currentSessionId}
              setCurrentSessionId={setCurrentSessionId}
              toggleSidebar={() => {}}
              onShowAlert={showSimpleAlert}
              onShowError={(type) => setErrorOverlay(type)}
              onLogout={onLogout}
            />
         </div>
      </div>

    </div>
  );
}
