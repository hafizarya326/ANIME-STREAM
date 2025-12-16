export function AnimeGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div
          key={idx}
          className="glass h-72 animate-pulse rounded-2xl bg-slate-800/60"
          aria-hidden
        />
      ))}
    </div>
  );
}
