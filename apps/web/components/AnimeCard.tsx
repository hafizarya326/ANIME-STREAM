import Link from "next/link";
import type { AnimeItem } from "../lib/api";
import { Badge } from "./Badge";
import { SafeImage } from "./SafeImage";

interface AnimeCardProps {
  anime: AnimeItem;
}

export function AnimeCard({ anime }: AnimeCardProps) {
  const episodeLabel = anime.episodes ? `Ep ${anime.episodes}` : "Episode ?";
  const metaLabel = anime.releaseDay ?? anime.latestReleaseDate ?? "Update terbaru";
  const titleParam = encodeURIComponent(anime.title);

  return (
    <Link
      href={`/anime/${anime.id}?title=${titleParam}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/70 transition hover:-translate-y-1 hover:shadow-card"
    >
      <div className="relative h-52 w-full overflow-hidden">
        <SafeImage
          src={anime.poster}
          alt={anime.title}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          <Badge>{episodeLabel}</Badge>
          <Badge variant="secondary">{metaLabel}</Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-white">{anime.title}</h3>
        <p className="text-xs text-slate-400">Otakudesu</p>
      </div>
    </Link>
  );
}
