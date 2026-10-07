export default function LiveTimeline({ scorecard }) {
  if (!scorecard || scorecard.length === 0) return null;
  
  // Flatten batting data from all innings to extract wickets and boundaries
  // For a real timeline, you would typically parse a ball-by-ball list.
  // Since we only have scorecard summaries, we will mock a timeline event list from dismissals.
  const events = [];
  
  scorecard.forEach(inning => {
    (inning.batting || []).forEach(batter => {
      if (batter.dismissal && batter.dismissal !== 'not out') {
        events.push({
          type: 'WICKET',
          player: batter.batsman?.name || 'Unknown',
          desc: batter['dismissal-text'] || batter.dismissal,
          score: batter.r
        });
      }
      if (batter['6s'] && parseInt(batter['6s']) > 0) {
        events.push({
          type: 'BOUNDARY',
          player: batter.batsman?.name || 'Unknown',
          desc: `Hit ${batter['6s']} sixes in his innings`,
          score: null
        });
      }
    });
  });

  if (events.length === 0) return null;

  return (
    <div className="bg-surface-container-low border border-stadium-grey rounded-2xl p-md shadow-lg max-h-64 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-xs mb-sm sticky top-0 bg-surface-container-low pb-xs border-b border-stadium-grey z-10">
        <span className="material-symbols-outlined text-blue-400 text-sm">history</span>
        <h3 className="font-label-caps text-xs text-text-muted uppercase tracking-wider font-bold">Match Highlights</h3>
      </div>
      <div className="relative border-l border-stadium-grey ml-xs pl-md space-y-md mt-sm">
        {events.map((ev, idx) => (
          <div key={idx} className="relative">
            <span className={`absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-surface-container-low ${ev.type === 'WICKET' ? 'bg-red-500' : 'bg-sky-400'}`}></span>
            <div className="bg-surface-container border border-outline-variant/10 rounded-lg p-xs">
              <div className="flex items-center gap-xs mb-1">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ev.type === 'WICKET' ? 'bg-red-900/30 text-red-400' : 'bg-sky-900/30 text-sky-400'}`}>
                  {ev.type}
                </span>
                <span className="text-xs font-semibold text-on-surface">{ev.player}</span>
              </div>
              <p className="text-[11px] text-text-muted">{ev.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
