export default function MatchStoryCard({ story }) {
  if (!story) return null;
  return (
    <div className="bg-surface-container-low border border-stadium-grey rounded-2xl p-md shadow-lg h-full flex flex-col justify-center">
      <div className="flex items-center gap-xs mb-sm border-b border-stadium-grey pb-xs">
        <span className="material-symbols-outlined text-grass-green text-sm">auto_stories</span>
        <h3 className="font-label-caps text-xs text-text-muted uppercase tracking-wider font-bold">Match Story</h3>
      </div>
      <p className="font-body-md text-on-surface text-sm leading-relaxed text-pretty">
        {story}
      </p>
    </div>
  );
}
