"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Play, Zap, Radio, Film, CalendarClock, LayoutGrid } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { SOURCES, pickSource } from "../lib/api";

function HeaderContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeSource = pickSource(searchParams.get("source"));
  const isScheduleActive = pathname === "/schedule";
  const isBrowseActive = pathname === "/browse";

  return (
    <header className="flex flex-col gap-4 rounded-3xl border-3 border-black bg-card p-4 sm:p-5 shadow-brutal-lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Brand Logo */}
        <Link href={`/?source=${activeSource}`} className="group flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border-3 border-black bg-brand-yellow text-black shadow-brutal transition-transform duration-150 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5">
            <Zap className="h-6 w-6 fill-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black uppercase tracking-wider text-white group-hover:text-brand-yellow transition-colors sm:text-2xl">
                ANIME<span className="text-brand-yellow">-</span>STREAM
              </span>
              <span className="hidden rounded-md border border-black bg-brand-cyan px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0px_0px_#000] sm:inline-block">
                v2.0
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-400">
              Neo-Brutalist Anime Streaming Platform
            </p>
          </div>
        </Link>

        {/* Source Navigation Pills & Live Indicator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="hidden lg:flex items-center gap-1.5 rounded-xl border-2 border-black bg-black/60 px-2.5 py-1 text-[11px] font-bold text-slate-300 shadow-brutal-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>BFF Connected</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border-2 border-black bg-[#0d101a] p-1 shadow-brutal-sm">
            <Link
              href={`/schedule?source=${activeSource}`}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider transition-all ${
                isScheduleActive
                  ? "border-2 border-black bg-brand-yellow text-black shadow-[2px_2px_0px_0px_#000]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CalendarClock className="h-3 w-3" />
              <span>Jadwal</span>
            </Link>
            <Link
              href={`/browse?source=${activeSource}`}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider transition-all ${
                isBrowseActive
                  ? "border-2 border-black bg-brand-yellow text-black shadow-[2px_2px_0px_0px_#000]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              <span>Jelajah</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border-2 border-black bg-[#0d101a] p-1 shadow-brutal-sm">
            {SOURCES.map((source) => {
              const isActive = source.id === activeSource;
              return (
                <Link
                  key={source.id}
                  href={`/?source=${source.id}`}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider transition-all ${
                    isActive
                      ? "border-2 border-black bg-brand-yellow text-black shadow-[2px_2px_0px_0px_#000]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Film className="h-3 w-3" />
                  <span>{source.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global Search Bar */}
      <SearchBar placeholder="Cari anime berdasarkan judul (misal: Naruto, Jujutsu, Solo Leveling)..." />
    </header>
  );
}

export function SiteHeader() {
  return (
    <Suspense
      fallback={
        <header className="flex flex-col gap-4 rounded-3xl border-3 border-black bg-card p-5 shadow-brutal-lg">
          <div className="h-12 w-48 animate-pulse rounded-xl bg-slate-800" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-slate-800" />
        </header>
      }
    >
      <HeaderContent />
    </Suspense>
  );
}
