import React from "react";
import { Download, ExternalLink, HardDrive } from "lucide-react";
import type { EpisodeDownload } from "../lib/api";

interface DownloadListProps {
  downloads: EpisodeDownload[];
}

export function DownloadList({ downloads }: DownloadListProps) {
  if (!downloads || downloads.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-black bg-card p-6 text-center text-sm font-medium text-slate-400 shadow-brutal">
        Tautan unduhan tidak tersedia untuk episode ini.
      </div>
    );
  }

  // Group downloads by quality
  const grouped = downloads.reduce<Record<string, EpisodeDownload[]>>((acc, item) => {
    const key = item.quality || "Format Lainnya";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border-2 border-black bg-card p-5 shadow-brutal sm:p-6">
      <div className="flex items-center gap-2.5 border-b-2 border-card-border pb-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg border-2 border-black bg-brand-yellow text-black shadow-[2px_2px_0px_0px_#000]">
          <Download className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-black uppercase text-white">
            Unduh Episode (Download Mirrors)
          </h3>
          <p className="text-xs text-slate-400">
            Pilih resolusi dan server penyimpanan yang diinginkan untuk menonton offline.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {Object.entries(grouped).map(([quality, items]) => {
          const firstWithSize = items.find((i) => i.size);
          return (
            <div
              key={quality}
              className="rounded-xl border-2 border-card-border bg-[#0d101a] p-3.5 transition-colors hover:border-slate-600"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-card-border/60 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border-2 border-black bg-brand-cyan px-2.5 py-0.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000]">
                    {quality}
                  </span>
                  {firstWithSize?.size && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                      <HardDrive className="h-3 w-3 text-brand-yellow" />
                      {firstWithSize.size}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {items.length} server mirror
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {items.map((dl, idx) => {
                  if (!dl.url) return null;
                  return (
                    <a
                      key={`${quality}-${dl.provider}-${idx}`}
                      href={dl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-brutal inline-flex items-center gap-1.5 rounded-lg border-black bg-card px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-brand-yellow hover:text-black transition-all"
                    >
                      <span>{dl.provider || `Server ${idx + 1}`}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
