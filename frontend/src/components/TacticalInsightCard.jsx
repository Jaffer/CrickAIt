export default function TacticalInsightCard({ insight }) {
  if (!insight) return null;
  return (
    <div className="bg-primary-container/10 border border-grass-green/30 rounded-2xl p-md shadow-lg flex gap-md items-start">
      <div className="flex-shrink-0 mt-0.5">
        <span className="material-symbols-outlined text-grass-green text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          lightbulb
        </span>
      </div>
      <div>
        <h3 className="font-label-caps text-[10px] text-grass-green uppercase tracking-wider font-bold mb-0.5">AI Tactical Insight</h3>
        <p className="font-body-md text-on-surface text-sm font-semibold text-pretty">
          {insight}
        </p>
      </div>
    </div>
  );
}
