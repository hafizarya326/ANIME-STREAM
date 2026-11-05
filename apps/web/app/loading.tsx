import { AnimeGridSkeleton } from "../components/AnimeGridSkeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-48 w-full animate-pulse rounded-3xl border-3 border-black bg-card shadow-brutal-xl" />
      <div className="h-14 w-full animate-pulse rounded-2xl border-2 border-black bg-card shadow-brutal" />
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-800" />
        <AnimeGridSkeleton count={10} />
      </div>
    </div>
  );
}
