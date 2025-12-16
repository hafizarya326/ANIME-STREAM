import { MangaCard } from "../../components/MangaCard";
import { Pagination } from "../../components/Pagination";
import { SearchBar } from "../../components/SearchBar";
import { SectionHeader } from "../../components/SectionHeader";
import { getLatestManga, getPopularManga } from "../../lib/mock";

export const dynamic = "force-static";

export default async function MangaHomePage() {
  const latest = await getLatestManga();
  const popular = await getPopularManga();

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-accent">Manga</p>
            <h1 className="text-3xl font-bold text-white">Update Manga Terbaru</h1>
            <p className="text-sm text-slate-400">Baca manga dengan tampilan bersih dan cepat.</p>
            <span className="mt-2 inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
              Coming soon - API manga belum terhubung
            </span>
          </div>
          <SearchBar placeholder="Cari manga..." scope="manga" />
        </div>
      </div>

      <section className="space-y-4">
        <SectionHeader title="Latest Manga Updates" subtitle="Bab terbaru dari judul favorit" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {latest.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
        <Pagination currentPage={1} totalPages={2} />
      </section>

      <section className="space-y-4">
        <SectionHeader title="Popular Manga" subtitle="Manga yang paling banyak dibaca" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {popular.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
        <Pagination currentPage={1} totalPages={2} />
      </section>
    </div>
  );
}
