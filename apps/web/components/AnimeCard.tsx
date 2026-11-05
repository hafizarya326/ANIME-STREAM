import Link from "next/link";
import { SafeImage } from "./SafeImage";
import { Play, Star, Calendar, Clock } from "lucide-react";
import type { AnimeItem, Source } from "../lib/api";

interface AnimeCardProps {
  anime: AnimeItem;
  source?: Source;
  /** Optional schedule-only extras (only rendered when provided). */
  releaseTime?: string | null;
  airStatus?: "released" | "upcoming" | null;
}

export function AnimeCard({
  anime,
  source = "otakudesu",
  releaseTime,
  airStatus,
}: AnimeCardProps) {
  const href = `/anime/${encodeURIComponent(anime.id)}?source=${source}`;

  const cleanScore = typeof anime.score === "string"
    ? anime.score.replace(/^Rating\s*:\s*/i, "").trim()
    : anime.score;

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-card shadow-brutal transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1 hover:border-brand-yellow hover:shadow-brutal-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm"
    >
      {/* Poster Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900 border-b-2 border-black">
        <SafeImage
          src={anime.poster}
          alt={anime.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Dark gradient for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {anime.episodes && (
            <span className="rounded-md border-2 border-black bg-brand-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_0px_#000000]">
              EP {anime.episodes}
            </span>
          )}
          {anime.type && (
            <span className="rounded-md border-2 border-black bg-white px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_0px_#000000]">
              {anime.type}
            </span>
          )}
        </div>

        {/* Score Badge */}
        {cleanScore && cleanScore !== "?" && (
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md border-2 border-black bg-brand-cyan px-2 py-0.5 text-[10px] font-black text-black shadow-[2px_2px_0px_0px_#000000]">
            <Star className="h-3 w-3 fill-black text-black" />
            <span>{cleanScore}</span>
          </div>
        )}

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="grid h-12 w-12 place-items-center rounded-xl border-2 border-black bg-brand-yellow text-black shadow-brutal transition-transform duration-150 group-hover:scale-110">
            <Play className="h-6 w-6 fill-black ml-0.5" />
          </div>
        </div>

        {/* Release Day / Date Tag on Bottom Poster */}
        {(anime.releaseDay || anime.latestReleaseDate || releaseTime) && (
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-bold text-slate-200">
            {releaseTime && (
              <span className="inline-flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 backdrop-blur-sm">
                <Clock className="h-3 w-3 text-brand-cyan" />
                {releaseTime}
              </span>
            )}
            {airStatus && (
              <span
                className={`rounded px-1.5 py-0.5 backdrop-blur-sm ${
                  airStatus === "released"
                    ? "bg-brand-cyan/90 text-black"
                    : "bg-brand-yellow/90 text-black"
                }`}
              >
                {airStatus === "released" ? "Tayang" : "Akan Tayang"}
              </span>
            )}
            {anime.releaseDay && !releaseTime && (
              <span className="inline-flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 backdrop-blur-sm">
                <Calendar className="h-3 w-3 text-brand-yellow" />
                {anime.releaseDay}
              </span>
            )}
            {anime.latestReleaseDate && !releaseTime && (
              <span className="rounded bg-black/80 px-1.5 py-0.5 text-slate-300 backdrop-blur-sm">
                {anime.latestReleaseDate}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <h3 className="line-clamp-2 text-sm font-black leading-snug text-white transition-colors group-hover:text-brand-yellow">
          {anime.title}
        </h3>
        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-card-border/60 text-[11px] text-slate-400 font-semibold">
          <span className="uppercase tracking-wider">{source}</span>
          <span className="text-brand-cyan group-hover:underline">Lihat Detail →</span>
        </div>
      </div>
    </Link>
  );
}
