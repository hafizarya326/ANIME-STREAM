import Link from "next/link";
import type { Metadata } from "next";
import {
  Play,
  Star,
  Clock,
  Calendar,
  Layers,
  Tv,
  Building,
  Sparkles,
} from "lucide-react";
import { AnimeCard } from "../../../components/AnimeCard";
import { Badge } from "../../../components/Badge";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { EpisodeList } from "../../../components/EpisodeList";
import { ErrorState } from "../../../components/ErrorState";
import { FallbackBanner } from "../../../components/FallbackBanner";
import { SafeImage } from "../../../components/SafeImage";
import { SectionHeader } from "../../../components/SectionHeader";
import {
  getAnimeDetail,
  pickSource,
  SOURCES,
  type AnimeItem,
} from "../../../lib/api";

interface PageProps {
  params: { animeId: string };
  searchParams?: Record<string, string | string[]>;
}

const getParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

// Route params are normally already decoded by Next; calling decodeURIComponent
// a second time must never crash the page on a malformed "%" sequence (e.g. a
// slug containing a literal percent sign).
const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const source = pickSource(getParam(searchParams?.source));
  const decodedId = safeDecode(params.animeId);
  const detail = await getAnimeDetail(source, decodedId);

  const title = detail.data?.title ?? decodedId;
  const description = detail.data?.synopsis
    ? detail.data.synopsis.slice(0, 160)
    : `Nonton anime ${title} subtitle Indonesia di ANIME-STREAM.`;

  return {
    title: `${title} - Streaming Sub Indo`,
    description,
    openGraph: detail.data?.poster ? { images: [detail.data.poster] } : undefined,
  };
}

export default async function AnimeDetailPage({
  params,
  searchParams,
}: PageProps) {
  const source = pickSource(getParam(searchParams?.source));
  const decodedId = safeDecode(params.animeId);

  const detailResult = await getAnimeDetail(source, decodedId);

  if (!detailResult.data) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[{ label: decodedId, href: `/anime/${encodeURIComponent(decodedId)}` }]}
        />
        <ErrorState
          message={
            detailResult.status === 404
              ? `Anime dengan ID "${decodedId}" tidak ditemukan di sumber ${source}. Coba cari judul lain atau ganti provider.`
              : detailResult.error ?? "Gagal memuat detail anime."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/?source=${source}`}
                className="btn-brutal rounded-xl border-black bg-brand-yellow px-5 py-2.5 text-xs font-black uppercase text-black"
              >
                Kembali ke Beranda
              </Link>
              {SOURCES.filter((s) => s.id !== source).map((alt) => (
                <Link
                  key={alt.id}
                  href={`/?source=${alt.id}`}
                  className="btn-brutal rounded-xl border-black bg-card px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white"
                >
                  Coba {alt.label}
                </Link>
              ))}
            </div>
          }
        />
      </div>
    );
  }

  const anime = detailResult.data;
  const firstEpisode = anime.episodes && anime.episodes.length > 0
    ? anime.episodes[anime.episodes.length - 1] // usually episode 1 is at the end or begin
    : null;
  const latestEpisode = anime.episodes && anime.episodes.length > 0
    ? anime.episodes[0]
    : null;

  const breadcrumbs = [
    { label: anime.title, href: `/anime/${encodeURIComponent(anime.id)}?source=${source}` },
  ];

  const cleanScore = typeof anime.score === "string"
    ? anime.score.replace(/^Rating\s*:\s*/i, "").trim()
    : anime.score;

  // Adapt recommendations to AnimeItem
  const recommendationItems: AnimeItem[] = (anime.recommendations ?? []).map((rec) => ({
    id: rec.animeId,
    title: rec.title,
    poster: rec.poster,
    episodes: null,
    latestReleaseDate: null,
    releaseDay: null,
  }));

  return (
    <div className="space-y-10">
      <Breadcrumbs items={breadcrumbs} />

      {anime.meta && <FallbackBanner meta={anime.meta} />}

      {/* Main Anime Detail Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border-3 border-black bg-card p-6 shadow-brutal-xl sm:p-8 lg:p-10">
        {/* Subtle Background Glow */}
        {anime.poster && (
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 opacity-15 blur-3xl">
            <SafeImage src={anime.poster} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="relative z-10 grid gap-8 md:grid-cols-[260px,1fr] lg:grid-cols-[300px,1fr]">
          {/* Poster Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-2xl border-3 border-black bg-slate-900 shadow-brutal-lg">
              <SafeImage
                src={anime.poster}
                alt={anime.title}
                className="h-full w-full object-cover"
              />
              {anime.status && (
                <div className="absolute left-3 top-3 rounded-md border-2 border-black bg-brand-yellow px-2 py-0.5 text-xs font-black uppercase text-black shadow-[2px_2px_0px_0px_#000]">
                  {anime.status}
                </div>
              )}
            </div>

            {/* Quick Play CTA */}
            {latestEpisode && (
              <Link
                href={`/watch/${encodeURIComponent(latestEpisode.episodeId)}?source=${source}&title=${encodeURIComponent(
                  anime.title
                )}&episode=${encodeURIComponent(String(latestEpisode.episodeNumber ?? "Terbaru"))}`}
                className="btn-brutal flex w-full max-w-[280px] items-center justify-center gap-2 rounded-xl border-black bg-brand-yellow py-3 text-sm font-black uppercase text-black shadow-brutal hover:bg-brand-yellowHover"
              >
                <Play className="h-4 w-4 fill-black" />
                <span>Nonton Episode Terbaru</span>
              </Link>
            )}
          </div>

          {/* Details & Info Section */}
          <div className="flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="yellow">{source}</Badge>
                {anime.type && <Badge variant="cyan">{anime.type}</Badge>}
                {cleanScore && cleanScore !== "?" && (
                  <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-brand-cyan px-2.5 py-0.5 text-xs font-black text-black shadow-[2px_2px_0px_0px_#000]">
                    <Star className="h-3.5 w-3.5 fill-black" />
                    <span>{cleanScore}</span>
                  </span>
                )}
                {anime.status && (
                  <span className="rounded-md border-2 border-black bg-[#121622] px-2.5 py-0.5 text-xs font-bold text-slate-300 shadow-[2px_2px_0px_0px_#000]">
                    Status: {anime.status}
                  </span>
                )}
              </div>

              {/* Title & Japanese */}
              <div>
                <h1 className="text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                  {anime.title}
                </h1>
                {anime.japaneseTitle && (
                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    {anime.japaneseTitle}
                  </p>
                )}
              </div>

              {/* Info Badges Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 pt-1">
                <div className="rounded-xl border-2 border-black bg-[#0d101a] p-2.5 shadow-brutal-sm">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase">
                    <Layers className="h-3 w-3 text-brand-yellow" />
                    <span>Total Episode</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-white">
                    {anime.episodes.length > 0 ? `${anime.episodes.length} Eps` : "Unknown"}
                  </p>
                </div>

                <div className="rounded-xl border-2 border-black bg-[#0d101a] p-2.5 shadow-brutal-sm">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase">
                    <Calendar className="h-3 w-3 text-brand-yellow" />
                    <span>Jadwal Tayang</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-white truncate">
                    {anime.aired || "-"}
                  </p>
                </div>

                <div className="rounded-xl border-2 border-black bg-[#0d101a] p-2.5 shadow-brutal-sm">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase">
                    <Clock className="h-3 w-3 text-brand-yellow" />
                    <span>Durasi</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-white truncate">
                    {anime.duration || "-"}
                  </p>
                </div>

                <div className="rounded-xl border-2 border-black bg-[#0d101a] p-2.5 shadow-brutal-sm">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase">
                    <Building className="h-3 w-3 text-brand-yellow" />
                    <span>Studio</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-white truncate">
                    {anime.studio || "-"}
                  </p>
                </div>
              </div>

              {/* Genres */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Genre Anime
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {anime.genres.map((genre) => (
                      <span
                        key={genre}
                        className="rounded-lg border-2 border-black bg-[#151926] px-2.5 py-1 text-xs font-bold text-slate-200 shadow-[1px_1px_0px_0px_#000] hover:border-brand-yellow hover:text-white transition-colors"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Synopsis */}
              {anime.synopsis && (
                <div className="space-y-2 border-t-2 border-card-border/70 pt-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-yellow">
                    Sinopsis & Alur Cerita
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-300 font-medium whitespace-pre-line">
                    {anime.synopsis}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Episode Selection Section */}
      <section className="space-y-6">
        <SectionHeader
          title="Daftar Episode"
          subtitle={`Pilih episode untuk menonton streaming dengan takarir Bahasa Indonesia`}
          badge={`${anime.episodes.length} EPISODE`}
        />

        <EpisodeList
          episodes={anime.episodes}
          animeTitle={anime.title}
          source={source}
        />
      </section>

      {/* Recommendations Section */}
      {recommendationItems.length > 0 && (
        <section className="space-y-6">
          <SectionHeader
            title="Anime Serupa & Rekomendasi"
            subtitle="Judul menarik lainnya yang mungkin kamu sukai"
            badge="Rekomendasi"
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {recommendationItems.map((rec, idx) => (
              <AnimeCard
                key={`rec-${rec.id}-${idx}`}
                anime={rec}
                source={source}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
