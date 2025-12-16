import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "../../../components/Badge";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { DownloadList } from "../../../components/DownloadList";
import { ErrorState } from "../../../components/ErrorState";
import { SectionHeader } from "../../../components/SectionHeader";
import { getKuramanimeEpisodeDetail } from "../../../lib/api";

interface PageProps {
  params: { episodeId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const detail = await getKuramanimeEpisodeDetail(params.episodeId);
  if (!detail.data) return { title: "Episode tidak ditemukan" };
  return {
    title: `${detail.data.title ?? "Episode"} - AniManga Hub`,
    description: "Streaming atau unduh episode anime dengan subtitle Indonesia.",
  };
}

export default async function WatchPage({ params }: PageProps) {
  const episodeResult = await getKuramanimeEpisodeDetail(params.episodeId);

  if (!episodeResult.data) {
    return (
      <ErrorState
        message={
          episodeResult.status === 404
            ? "Episode tidak ditemukan. Coba pilih episode lain atau kembali ke beranda."
            : episodeResult.error ?? "Episode tidak dapat dimuat."
        }
        action={
          <Link
            href="/"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card"
          >
            Kembali
          </Link>
        }
      />
    );
  }

  const episode = episodeResult.data;
  const episodeTitle = episode.title ?? `Episode ${episode.episodeId}`;

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: episodeTitle, href: `/watch/${episode.episodeId}` },
  ];

  const streamUrl = episode.streaming?.url ?? null;
  const hasStream = streamUrl && /^https?:\/\//i.test(streamUrl);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      <div className="flex flex-wrap items-center gap-3">
        <Badge>Episode</Badge>
        <h1 className="text-2xl font-bold text-white">{episodeTitle}</h1>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">Sumber: kuramanime</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/70">
        {hasStream ? (
          <iframe
            src={streamUrl!}
            title={episodeTitle}
            className="aspect-video w-full"
            allowFullScreen
            sandbox="allow-same-origin allow-scripts allow-forms allow-presentation"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-center text-sm text-slate-300">
            Streaming link tidak tersedia; gunakan tautan unduhan di bawah.
          </div>
        )}
      </div>

      <DownloadList downloads={episode.downloads} />

      <section className="space-y-3">
        <SectionHeader title="Komentar" subtitle="Diskusikan episode ini (placeholder)" />
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 text-sm text-slate-400">
          Komentar belum tersedia pada versi ini.
        </div>
      </section>
    </div>
  );
}
