import Link from "next/link";
import type { Metadata } from "next";
import { AnimeCard } from "../../../components/AnimeCard";
import { Chip } from "../../../components/Chip";
import { EpisodeList } from "../../../components/EpisodeList";
import { ErrorState } from "../../../components/ErrorState";
import { SafeImage } from "../../../components/SafeImage";
import { SectionHeader } from "../../../components/SectionHeader";
import {
  getKuramanimeAnimeDetail,
  getOtakudesuOngoing,
} from "../../../lib/api";
import { findBestKuramanimeId } from "../../../lib/match";
import type { AnimeEpisodeSummary } from "../../../lib/api";

interface PageProps {
  params: { animeId: string };
  searchParams?: Record<string, string | string[]>;
}

const getParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const fallbackTitle = getParam(searchParams?.title) ?? params.animeId;
  const mapping = await findBestKuramanimeId(params.animeId, fallbackTitle ?? "");
  const targetId = mapping.kuramanimeId ?? params.animeId;
  const detail = mapping.kuramanimeId
    ? await getKuramanimeAnimeDetail(targetId)
    : { data: null };

  const title = detail.data?.title ?? fallbackTitle ?? "Anime tidak ditemukan";
  return {
    title: `${title} - AniManga Hub`,
    description: detail.data?.synopsis ?? `Detail anime ${title}`,
    openGraph: detail.data?.poster ? { images: [detail.data.poster] } : undefined,
  };
}

export default async function AnimeDetailPage({ params, searchParams }: PageProps) {
  const fallbackTitle = getParam(searchParams?.title) ?? params.animeId;
  const mapping = await findBestKuramanimeId(params.animeId, fallbackTitle ?? "");

  if (!mapping.kuramanimeId) {
    return (
      <ErrorState
        message="Anime not available for streaming (Kuramanime match not found)."
        action={
          <Link
            href="/"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card"
          >
            Kembali ke beranda
          </Link>
        }
      />
    );
  }

  const detailResult = await getKuramanimeAnimeDetail(mapping.kuramanimeId);

  if (!detailResult.data) {
    return (
      <ErrorState
        message={
          detailResult?.status === 404
            ? "Anime tidak ditemukan di sumber ini. Periksa kembali tautan atau pilih judul lain."
            : detailResult?.error ?? "Tidak dapat memuat detail anime."
        }
        action={
          <Link
            href="/"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card"
          >
            Kembali ke beranda
          </Link>
        }
      />
    );
  }

  const anime = detailResult.data;
  const recResult = await getOtakudesuOngoing(1);
  const recommendations = recResult.data?.items ?? [];
  const episodes: AnimeEpisodeSummary[] =
    anime.episodes.length > 0
      ? anime.episodes.map((ep) => ({
          ...ep,
          episodeId: ep.episodeId.includes("|") ? ep.episodeId : `${anime.id}|${ep.episodeId}`,
        }))
      : [];

  return (
    <div className="space-y-8">
      <div className="glass grid gap-6 rounded-3xl p-6 md:grid-cols-[260px,1fr] md:p-8">
        <div className="relative h-80 w-full overflow-hidden rounded-2xl bg-slate-800">
          <SafeImage
            src={anime?.poster ?? null}
            alt={anime?.title ?? fallbackTitle ?? "Detail tidak tersedia"}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full bg-slate-800 px-3 py-1">Judul: kuramanime</span>
            <span className="rounded-full bg-slate-800 px-3 py-1">
              {anime?.episodes.length ? `${anime.episodes.length} episode` : "Episode belum tersedia"}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            {anime?.title ?? fallbackTitle ?? "Detail tidak tersedia"}
          </h1>
          <p className="text-sm leading-relaxed text-slate-300">
            {anime?.synopsis ?? "Sinopsis tidak tersedia untuk judul ini."}
          </p>
          <div className="flex flex-wrap gap-2">
            {anime?.genres.length ? (
              anime.genres.map((genre) => <Chip key={genre} label={genre} />)
            ) : (
              <span className="text-xs text-slate-400">Genre tidak tersedia</span>
            )}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <SectionHeader title="Daftar Episode" subtitle="Pilih episode untuk ditonton" />
        {episodes.length ? (
          <EpisodeList episodes={episodes} animeTitle={anime.title} />
        ) : (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 text-sm text-slate-300">
            Episode belum tersedia untuk judul ini.
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Rekomendasi" subtitle="Judul lain (list Otakudesu)" />
        {recommendations.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recommendations.map((item) => (
              <AnimeCard key={item.id} anime={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 text-sm text-slate-300">
            Tidak ada rekomendasi yang bisa ditampilkan.
          </div>
        )}
      </section>
    </div>
  );
}
