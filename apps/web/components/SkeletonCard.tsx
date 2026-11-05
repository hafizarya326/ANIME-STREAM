export function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-card shadow-brutal animate-pulse">
      <div className="aspect-[3/4] w-full bg-slate-800 border-b-2 border-black" />
      <div className="p-3.5 space-y-2">
        <div className="h-4 w-3/4 rounded bg-slate-800" />
        <div className="h-3 w-1/2 rounded bg-slate-800/60" />
      </div>
    </div>
  );
}
