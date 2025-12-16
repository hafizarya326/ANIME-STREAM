import Link from "next/link";
import type { AnimeEpisodeSummary } from "../lib/api";

interface EpisodeListProps {
  episodes: AnimeEpisodeSummary[];
}

export function EpisodeList({ episodes }: EpisodeListProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {episodes.map((ep) => (
        <div
          key={ep.episodeId}
          className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              Episode {ep.episodeNumber ?? "-"}
            </p>
            <p className="text-xs text-slate-400 line-clamp-1">
              {ep.title ?? "Tidak ada judul"}
              {ep.releaseDate ? ` - ${ep.releaseDate}` : ""}
            </p>
          </div>
          <Link
            href={`/watch/${ep.episodeId}`}
            className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
          >
            Tonton
          </Link>
        </div>
      ))}
    </div>
  );
}
