import Link from "next/link";
import type { Manga } from "../lib/types";
import { SafeImage } from "./SafeImage";

export function MangaCard({ manga }: { manga: Manga }) {
  return (
    <Link
      href={`/manga/${manga.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/70 transition hover:-translate-y-1 hover:shadow-card"
    >
      <div className="relative h-52 w-full overflow-hidden">
        <SafeImage
          src={manga.cover}
          alt={manga.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-white">{manga.title}</h3>
        <p className="text-xs text-slate-400">
          {manga.author} - {manga.status}
        </p>
      </div>
    </Link>
  );
}
