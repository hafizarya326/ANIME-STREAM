import type { EpisodeDownload } from "../lib/api";

export function DownloadList({ downloads }: { downloads: EpisodeDownload[] }) {
  if (!downloads?.length) {
    return (
      <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 text-sm text-slate-300">
        Download link tidak tersedia.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4">
      <h3 className="text-lg font-semibold text-white">Download</h3>
      <div className="mt-3 flex flex-col gap-2">
        {downloads.map((dl, idx) => {
          const href = dl.url ?? undefined;
          return (
            <div
              key={`${dl.quality}-${dl.provider}-${idx}`}
              className="flex flex-col gap-2 rounded-xl bg-slate-800/70 px-3 py-2 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2 py-1 text-xs text-slate-300">
                  {dl.quality ?? "Unknown"}
                </span>
                <span className="text-xs text-slate-300">{dl.provider ?? "Provider tidak diketahui"}</span>
              </div>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit rounded-full border border-primary px-3 py-1 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  Unduh
                </a>
              ) : (
                <span className="text-xs text-slate-500">Link tidak tersedia</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
