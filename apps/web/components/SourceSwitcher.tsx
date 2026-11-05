"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SOURCES, pickSource, type Source } from "../lib/api";
import { Radio } from "lucide-react";

interface SourceSwitcherProps {
  currentSource?: Source;
  compact?: boolean;
}

export function SourceSwitcher({ currentSource, compact = false }: SourceSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeSource = currentSource || pickSource(searchParams.get("source"));

  const handleSourceChange = (newSource: Source) => {
    if (newSource === activeSource) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("source", newSource);
    // Reset page to 1 when changing source
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 rounded-xl border-2 border-black bg-card p-1 shadow-brutal-sm">
        {SOURCES.map((source) => {
          const isActive = source.id === activeSource;
          return (
            <button
              key={source.id}
              onClick={() => handleSourceChange(source.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-black uppercase tracking-wider transition-all ${
                isActive
                  ? "border-2 border-black bg-brand-yellow text-black shadow-[2px_2px_0px_0px_#000000]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {source.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-black bg-card p-3 shadow-brutal sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg border-2 border-black bg-brand-yellow text-black shadow-[2px_2px_0px_0px_#000000]">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-cyan">
              Pilihan Sumber API
            </span>
            <h4 className="text-sm font-black uppercase text-white">
              Pilih Provider Streaming
            </h4>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SOURCES.map((source) => {
            const isActive = source.id === activeSource;
            return (
              <button
                key={source.id}
                onClick={() => handleSourceChange(source.id)}
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-xs font-black transition-all duration-150 ${
                  isActive
                    ? "border-black bg-brand-yellow text-black shadow-brutal -translate-y-0.5"
                    : "border-card-border bg-[#0e121d] text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                <span>{source.label}</span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[9px] font-black uppercase ${
                    isActive
                      ? "border border-black bg-black text-brand-yellow"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {source.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
