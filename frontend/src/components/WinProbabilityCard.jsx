export default function WinProbabilityCard({ probability, battingTeam, bowlingTeam }) {
  if (probability === undefined || probability === null) return null;
  const pBatting = probability;
  const pBowling = 100 - probability;

  return (
    <div className="bg-surface-container-low border border-stadium-grey rounded-2xl p-md shadow-lg">
      <div className="flex items-center gap-xs mb-md border-b border-stadium-grey pb-xs">
        <span className="material-symbols-outlined text-trophy-gold text-sm">equalizer</span>
        <h3 className="font-label-caps text-xs text-text-muted uppercase tracking-wider font-bold">Live Win Probability</h3>
      </div>
      <div className="flex justify-between text-xs font-bold mb-xs text-on-surface uppercase">
        <span>{battingTeam || 'Batting'}</span>
        <span>{bowlingTeam || 'Bowling'}</span>
      </div>
      <div className="h-4 w-full rounded-full bg-red-500/20 flex overflow-hidden">
        <div 
          className="h-full bg-grass-green transition-all duration-1000 ease-in-out" 
          style={{ width: `${pBatting}%` }}
        />
        <div 
          className="h-full bg-red-500 transition-all duration-1000 ease-in-out" 
          style={{ width: `${pBowling}%` }}
        />
      </div>
      <div className="flex justify-between mt-xs font-mono text-[10px] text-text-muted">
        <span className="text-grass-green font-bold">{pBatting}%</span>
        <span className="text-red-400 font-bold">{pBowling}%</span>
      </div>
    </div>
  );
}
