import Link from "next/link";
import type { Chapter } from "../lib/types";

export function ChapterList({ chapters }: { chapters: Chapter[] }) {
  return (
    <div className="flex flex-col gap-3">
      {chapters.map((ch) => (
        <Link
          key={ch.id}
          href={`/manga/read/${ch.id}`}
          className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 transition hover:-translate-y-0.5 hover:border-primary"
        >
          <span className="font-semibold">Chapter {ch.number} - {ch.title}</span>
          <span className="text-xs text-slate-400">{ch.pages.length} pages</span>
        </Link>
      ))}
    </div>
  );
}
