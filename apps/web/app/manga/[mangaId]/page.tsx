import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Chip } from "../../../components/Chip";
import { ChapterList } from "../../../components/ChapterList";
import { SafeImage } from "../../../components/SafeImage";
import { SectionHeader } from "../../../components/SectionHeader";
import { getMangaDetail } from "../../../lib/mock";

interface PageProps {
  params: { mangaId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const manga = await getMangaDetail(params.mangaId).catch(() => null);
  if (!manga) return { title: "Manga tidak ditemukan" };
  return {
    title: `${manga.title} - AniManga Hub`,
    description: manga.synopsis.slice(0, 120),
  };
}

export default async function MangaDetailPage({ params }: PageProps) {
  const manga = await getMangaDetail(params.mangaId).catch(() => null);
  if (!manga) return notFound();

  return (
    <div className="space-y-6">
      <div className="glass grid gap-6 rounded-3xl p-6 md:grid-cols-[220px,1fr] md:p-8">
        <div className="relative h-72 w-full overflow-hidden rounded-2xl bg-slate-800">
          <SafeImage src={manga.cover} alt={manga.title} className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col gap-4">
          <span className="w-fit rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
            Coming soon - API manga belum terhubung
          </span>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <span className="rounded-full bg-slate-800 px-3 py-1">Author: {manga.author}</span>
            <span className="rounded-full bg-slate-800 px-3 py-1">Chapters: {manga.chapters.length}</span>
            <span className="rounded-full bg-slate-800 px-3 py-1">Status: {manga.status}</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{manga.title}</h1>
          <p className="text-sm leading-relaxed text-slate-300">{manga.synopsis}</p>
          <div className="flex flex-wrap gap-2">
            {manga.genres.map((genre) => (
              <Chip key={genre} label={genre} />
            ))}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <SectionHeader
          title="Daftar Chapter"
          subtitle="Urut dari terbaru, dengan filter dan sort placeholder"
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <button className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary hover:text-white">
            Filter
          </button>
          <button className="rounded-full border border-slate-700 px-3 py-1 hover:border-primary hover:text-white">
            Sort: Terbaru
          </button>
        </div>
        <ChapterList chapters={manga.chapters} />
      </section>
    </div>
  );
}
