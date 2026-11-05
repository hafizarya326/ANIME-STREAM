import Link from "next/link";
import { SafeImage } from "./SafeImage";
import { Play, Info, Star, Calendar, Sparkles } from "lucide-react";
import type { AnimeItem, Source } from "../lib/api";

interface HeroSectionProps {
  anime: AnimeItem | null;
  source?: Source;
}

export function HeroSection({ anime, source = "otakudesu" }: HeroSectionProps) {
  if (!anime) return null;

  const detailHref = `/anime/${encodeURIComponent(anime.id)}?source=${source}`;
  const cleanScore = typeof anime.score === "string"
    ? anime.score.replace(/^Rating\s*:\s*/i, "").trim()
    : anime.score;

  return (
    <div className="relative overflow-hidden rounded-3xl border-3 border-black bg-gradient-to-r from-card via-[#121622] to-card shadow-brutal-xl">
      {/* Background Poster Blur Effect */}
      {anime.poster && (
        <div className="absolute -right-20 -top-20 h-96 w-96 opacity-15 blur-3xl pointer-events-none sm:opacity-25 sm:w-[500px] sm:h-[500px]">
          <SafeImage src={anime.poster} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="relative z-10 grid gap-6 p-6 sm:p-8 md:grid-cols-[220px,1fr] lg:grid-cols-[260px,1fr] lg:p-10">
        {/* Poster with Brutalist Border & Shadow */}
        <div className="relative mx-auto aspect-[3/4] w-48 shrink-0 overflow-hidden rounded-2xl border-2 border-black bg-slate-900 shadow-brutal-lg sm:w-full">
          <SafeImage
            src={anime.poster}
            alt={anime.title}
            className="h-full w-full object-cover"
          />
          {anime.episodes && (
            <div className="absolute bottom-3 left-3 rounded-md border-2 border-black bg-brand-yellow px-2 py-0.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000]">
              EP {anime.episodes}
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Pill Highlights */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-black bg-brand-yellow px-2.5 py-1 text-xs font-black uppercase tracking-wider text-black shadow-brutal-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Featured Ongoing
              </span>
              <span className="rounded-md border-2 border-black bg-black px-2.5 py-1 text-xs font-black uppercase tracking-wider text-white shadow-brutal-sm">
                {source}
              </span>
              {cleanScore && cleanScore !== "?" && (
                <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-brand-cyan px-2.5 py-1 text-xs font-black text-black shadow-brutal-sm">
                  <Star className="h-3.5 w-3.5 fill-black" />
                  {cleanScore}
                </span>
              )}
              {anime.releaseDay && (
                <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-card px-2.5 py-1 text-xs font-bold text-slate-300 shadow-brutal-sm">
                  <Calendar className="h-3.5 w-3.5 text-brand-yellow" />
                  Rilis {anime.releaseDay}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
              {anime.title}
            </h1>

            <p className="line-clamp-3 text-sm text-slate-300 leading-relaxed max-w-2xl">
              Tonton episode terbaru anime {anime.title} dengan takarir bahasa Indonesia berkualitas tinggi. Update rilis mingguan tercepat di ANIME-STREAM.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={detailHref}
              className="btn-brutal inline-flex items-center gap-2.5 rounded-xl bg-brand-yellow px-6 py-3 text-sm font-black uppercase text-black"
            >
              <Play className="h-4 w-4 fill-black" />
              Tonton Sekarang
            </Link>
            <Link
              href={detailHref}
              className="btn-brutal inline-flex items-center gap-2 rounded-xl bg-card border-black px-5 py-3 text-sm font-bold text-white hover:text-brand-yellow"
            >
              <Info className="h-4 w-4" />
              Detail Lengkap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
