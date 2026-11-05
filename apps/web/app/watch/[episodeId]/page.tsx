import Link from "next/link";
import type { Metadata } from "next";
import {
  ChevronLeft,
  ChevronRight,
  Tv,
  Film,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "../../../components/Badge";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { DownloadList } from "../../../components/DownloadList";
import { EpisodeList } from "../../../components/EpisodeList";
import { ErrorState } from "../../../components/ErrorState";
import { FallbackBanner } from "../../../components/FallbackBanner";
import { SectionHeader } from "../../../components/SectionHeader";
import { VideoPlayer } from "../../../components/VideoPlayer";
import { getEpisodeDetail, pickSource, SOURCES } from "../../../lib/api";

interface PageProps {
  params: { episodeId: string };
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
  const decodedId = safeDecode(params.episodeId);
  const detail = await getEpisodeDetail(source, decodedId);

  const title = detail.data?.title ?? decodedId;
  return {
    title: `${title} - Streaming Sub Indo`,
    description: `Nonton online ${title} kualitas HD dengan takarir Bahasa Indonesia di ANIME-STREAM.`,
  };
}

export default async function WatchPage({ params, searchParams }: PageProps) {
  const source = pickSource(getParam(searchParams?.source));
  const rawTitle = getParam(searchParams?.title);
  const rawEpisode = getParam(searchParams?.episode);
  const decodedId = safeDecode(params.episodeId);

  const episodeResult = await getEpisodeDetail(source, decodedId);

  if (!episodeResult.data) {
    return (
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: rawTitle || "Anime", href: "/" },
            { label: "Watch", href: `/watch/${encodeURIComponent(decodedId)}` },
          ]}
        />
        <ErrorState
          message={
            episodeResult.status === 404
              ? `Episode "${decodedId}" tidak ditemukan di sumber ${source}. Silakan pilih episode lain atau ganti provider streaming.`
              : episodeResult.error ?? "Episode tidak dapat dimuat."
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

  const episode = episodeResult.data;
  const episodeTitle = episode.title ?? `Episode ${rawEpisode || decodedId}`;
  const parentAnimeTitle = rawTitle || episode.animeId || "Anime";
  const parentAnimeHref = episode.animeId
    ? `/anime/${encodeURIComponent(episode.animeId)}?source=${source}`
    : rawTitle
      ? `/?q=${encodeURIComponent(rawTitle)}&source=${source}`
      : `/?source=${source}`;

  const breadcrumbs = [
    { label: parentAnimeTitle, href: parentAnimeHref },
    { label: episodeTitle, href: `/watch/${encodeURIComponent(decodedId)}?source=${source}` },
  ];

  // Navigation URLs
  const prevHref = episode.prevEpisode?.episodeId
    ? `/watch/${encodeURIComponent(episode.prevEpisode.episodeId)}?source=${source}&title=${encodeURIComponent(
        parentAnimeTitle
      )}`
    : null;

  const nextHref = episode.nextEpisode?.episodeId
    ? `/watch/${encodeURIComponent(episode.nextEpisode.episodeId)}?source=${source}&title=${encodeURIComponent(
        parentAnimeTitle
      )}`
    : null;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={breadcrumbs} />

      {episode.meta && <FallbackBanner meta={episode.meta} />}

      {/* Header Info & Title */}
      <div className="rounded-2xl border-2 border-black bg-card p-5 shadow-brutal sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="yellow">{source}</Badge>
              {episode.streaming.format && (
                <span className="rounded-md border-2 border-black bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-cyan shadow-[1px_1px_0px_0px_#000]">
                  {episode.streaming.isDirect ? "Direct MP4 / HLS" : "Iframe Stream"}
                </span>
              )}
              {episode.server && episode.server.length > 0 && (
                <span className="rounded-md border-2 border-black bg-[#131722] px-2 py-0.5 text-[10px] font-bold text-slate-300">
                  {episode.server.reduce((sum, q) => sum + q.serverList.length, 0)} Server Mirror
                </span>
              )}
            </div>

            <h1 className="text-xl font-black uppercase tracking-tight text-white sm:text-2xl lg:text-3xl">
              {episodeTitle}
            </h1>
          </div>

          {/* Quick link back to anime detail */}
          {episode.animeId && (
            <Link
              href={parentAnimeHref}
              className="btn-brutal inline-flex shrink-0 items-center gap-2 rounded-xl border-black bg-[#121622] px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-brand-yellow hover:border-brand-yellow transition-all"
            >
              <Tv className="h-4 w-4 text-brand-yellow" />
              <span>Detail Anime</span>
            </Link>
          )}
        </div>
      </div>

      {/* Video Streaming Player */}
      <section className="space-y-4">
        <VideoPlayer
          streamUrl={episode.streaming.url}
          directUrl={episode.streaming.directUrl}
          format={episode.streaming.format}
          title={episodeTitle}
          source={source}
          servers={episode.server}
        />

        {/* Previous / Detail / Next Navigation Bar */}
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between rounded-2xl border-2 border-black bg-card p-3 shadow-brutal sm:p-4">
          {prevHref ? (
            <Link
              href={prevHref}
              className="btn-brutal inline-flex items-center justify-center gap-2 rounded-xl border-black bg-[#121622] px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-brand-yellow hover:text-black transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Episode Sebelumnya</span>
            </Link>
          ) : (
            <div className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border-2 border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs font-bold text-slate-600">
              <ChevronLeft className="h-4 w-4" />
              <span>Episode Pertama</span>
            </div>
          )}

          <Link
            href={parentAnimeHref}
            className="col-span-2 sm:col-span-1 btn-brutal inline-flex items-center justify-center gap-2 rounded-xl border-black bg-brand-yellow px-5 py-2.5 text-xs font-black uppercase text-black hover:bg-brand-yellowHover shadow-brutal-sm"
          >
            <Layers className="h-4 w-4 fill-black" />
            <span>Semua Episode</span>
          </Link>

          {nextHref ? (
            <Link
              href={nextHref}
              className="btn-brutal inline-flex items-center justify-center gap-2 rounded-xl border-black bg-[#121622] px-4 py-2.5 text-xs font-black uppercase text-white hover:bg-brand-yellow hover:text-black transition-all"
            >
              <span>Episode Berikutnya</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border-2 border-slate-800 bg-slate-900/60 px-4 py-2.5 text-xs font-bold text-slate-600">
              <span>Episode Terbaru</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          )}
        </div>
      </section>

      {/* Download Mirrors Section */}
      <section>
        <DownloadList downloads={episode.downloads} />
      </section>

      {/* Sibling Episodes Section (if available) */}
      {episode.episodeList && episode.episodeList.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Daftar Episode Lengkap"
            subtitle="Pindah ke episode lain tanpa meninggalkan halaman"
            badge={`${episode.episodeList.length} EPS`}
          />
          <EpisodeList
            episodes={episode.episodeList}
            animeTitle={parentAnimeTitle}
            source={source}
          />
        </section>
      )}
    </div>
  );
}
