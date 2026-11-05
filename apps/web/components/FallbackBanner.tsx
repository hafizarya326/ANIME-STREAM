import React from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import type { ResponseMeta } from "../lib/api";

interface FallbackBannerProps {
  meta?: ResponseMeta;
}

export function FallbackBanner({ meta }: FallbackBannerProps) {
  if (!meta?.fallbackUsed) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-black bg-brand-yellow/15 p-3.5 text-slate-200 shadow-brutal sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 border-black bg-brand-yellow text-black shadow-[1px_1px_0px_0px_#000]">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="text-xs sm:text-sm">
          <span className="font-bold text-brand-yellow">Mode Cadangan Aktif: </span>
          <span>
            Sumber utama <strong className="text-white">{meta.originalSource}</strong> sedang dibatasi atau bermasalah.
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-black uppercase text-brand-cyan">
        <span>Otomatis dialihkan ke</span>
        <span className="rounded border border-black bg-black px-2 py-0.5 text-white shadow-[1px_1px_0px_0px_#000]">
          {meta.actualSource}
        </span>
      </div>
    </div>
  );
}
