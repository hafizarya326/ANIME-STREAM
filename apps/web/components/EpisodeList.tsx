"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Play, ArrowUpDown, Search } from "lucide-react";
import type { AnimeEpisodeSummary, Source } from "../lib/api";

interface EpisodeListProps {
  episodes: AnimeEpisodeSummary[];
  animeTitle?: string;
  source?: Source;
}

export function EpisodeList({
  episodes,
  animeTitle,
  source = "otakudesu",
}: EpisodeListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDesc, setIsDesc] = useState(true);

  const filteredEpisodes = useMemo(() => {
    let list = [...episodes];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (ep) =>
          String(ep.episodeNumber ?? "").includes(q) ||
          (ep.title && ep.title.toLowerCase().includes(q))
      );
    }
    if (!isDesc) {
      list.reverse();
    }
    return list;
  }, [episodes, searchTerm, isDesc]);

  if (!episodes || episodes.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-card-border p-8 text-center text-sm text-slate-400">
        Daftar episode belum tersedia untuk anime ini di sumber {source}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter nomor atau judul episode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border-2 border-black bg-card py-2 pl-9 pr-3 text-xs font-semibold text-white placeholder-slate-500 shadow-brutal-sm outline-none focus:border-brand-yellow"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDesc(!isDesc)}
            className="btn-brutal inline-flex items-center gap-1.5 rounded-xl bg-card border-black px-3 py-2 text-xs font-black uppercase text-slate-200 hover:text-white"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-brand-yellow" />
            <span>{isDesc ? "Terbaru Duluan" : "Terlama Duluan"}</span>
          </button>
          <span className="rounded-xl border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-brand-cyan shadow-brutal-sm">
            {filteredEpisodes.length} Episode
          </span>
        </div>
      </div>

      {/* Episode Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredEpisodes.map((ep) => {
          const epNum = ep.episodeNumber ?? ep.title ?? "1";
          const watchHref = `/watch/${encodeURIComponent(ep.episodeId)}?source=${source}&title=${encodeURIComponent(
            animeTitle ?? ""
          )}&episode=${encodeURIComponent(String(epNum))}`;

          return (
            <Link
              key={ep.episodeId}
              href={watchHref}
              className="group flex items-center justify-between rounded-xl border-2 border-black bg-card p-3 shadow-brutal transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-brand-yellow hover:shadow-brutal-yellow active:translate-x-0.5 active:translate-y-0.5"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-black bg-black text-brand-yellow font-black text-sm group-hover:bg-brand-yellow group-hover:text-black transition-colors">
                  {epNum}
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-xs font-black text-white group-hover:text-brand-yellow transition-colors">
                    {ep.title && ep.title !== String(epNum)
                      ? ep.title
                      : `Episode ${epNum}`}
                  </p>
                  {ep.releaseDate && (
                    <p className="text-[10px] text-slate-400 font-medium">
                      {ep.releaseDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-black bg-brand-yellow text-black shadow-brutal-sm group-hover:scale-105 transition-transform">
                <Play className="h-3.5 w-3.5 fill-black ml-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
