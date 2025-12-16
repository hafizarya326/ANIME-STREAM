import { AnimeListWithLoadMore } from "../components/AnimeListWithLoadMore";
import { ErrorState } from "../components/ErrorState";
import { Pagination } from "../components/Pagination";
import { SearchBar } from "../components/SearchBar";
import { SectionHeader } from "../components/SectionHeader";
import { getOtakudesuOngoing, searchOtakudesu, type Pagination as ApiPagination } from "../lib/api";

interface PageProps {
  searchParams?: Record<string, string | string[]>;
}

const getParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
const parsePage = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export default async function AnimeHomePage({ searchParams }: PageProps) {
  const query = getParam(searchParams?.q);
  const page = parsePage(getParam(searchParams?.page));

  const response = query
    ? await searchOtakudesu(query, page)
    : await getOtakudesuOngoing(page);

  const data = response.data;
  const pagination: ApiPagination =
    data?.pagination ?? { currentPage: page, nextPage: null, hasNextPage: false, totalPages: null };
  const items = data?.items ?? [];

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    if (query) params.set("q", query);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const title = query ? `Hasil pencarian "${query}"` : "Ongoing Anime";
  const subtitle = query
    ? "Menampilkan hasil dari BFF berdasarkan kata kunci"
    : "Update terbaru dari sumber otakudesu";

  return (
    <div className="space-y-10">
      <div className="rounded-3xl border border-slate-800/70 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-accent">Anime</p>
            <h1 className="text-3xl font-bold text-white">Temukan Anime Favorit</h1>
            <p className="text-sm text-slate-400">Pilih judul, cari, dan tonton dengan cepat.</p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <SearchBar placeholder="Cari anime..." />
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <SectionHeader title={title} subtitle={subtitle} />

        {response.error && !items.length ? (
          <ErrorState message={response.error} />
        ) : (
          <>
            <AnimeListWithLoadMore
              initialItems={items}
              initialPagination={pagination}
              query={query}
            />
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages ?? undefined}
              hasNextPage={pagination.hasNextPage}
              buildHref={buildHref}
            />
          </>
        )}
      </section>
    </div>
  );
}
