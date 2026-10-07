export default function KeyBattlesCard({ battles }) {
  if (!battles || battles.length === 0) return null;
  
  return (
    <div className="bg-surface-container-low border border-stadium-grey rounded-2xl p-md shadow-lg">
      <div className="flex items-center gap-xs mb-sm border-b border-stadium-grey pb-xs">
        <span className="material-symbols-outlined text-orange-400 text-sm">swords</span>
        <h3 className="font-label-caps text-xs text-text-muted uppercase tracking-wider font-bold">Key Player Battles</h3>
      </div>
      <div className="space-y-sm">
        {battles.map((b, idx) => (
          <div key={idx} className="bg-pitch-dark/40 border border-outline-variant/10 rounded-xl p-sm">
            <div className="flex justify-between items-center mb-xs">
              <span className="text-sm font-bold text-on-surface">{b.batter}</span>
              <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 border border-stadium-grey rounded">VS</span>
              <span className="text-sm font-bold text-on-surface">{b.bowler}</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-snug">
              {b.context}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
