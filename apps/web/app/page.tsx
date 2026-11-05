import { Suspense } from "react";
import { AnimeListWithLoadMore } from "../components/AnimeListWithLoadMore";
import { ErrorState } from "../components/ErrorState";
import { FallbackBanner } from "../components/FallbackBanner";
import { HeroSection } from "../components/HeroSection";
import { SectionHeader } from "../components/SectionHeader";
import { SourceSwitcher } from "../components/SourceSwitcher";
import {
  getOngoing,
  searchAnime,
  pickSource,
  type Pagination as ApiPagination,
} from "../lib/api";

interface PageProps {
  searchParams?: Record<string, string | string[]>;
}

const getParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
const parsePage = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export default async function AnimeHomePage({ searchParams }: PageProps) {
  const query = getParam(searchParams?.q)?.trim();
  const page = parsePage(getParam(searchParams?.page));
  const source = pickSource(getParam(searchParams?.source));

  const response = query
    ? await searchAnime(source, query, page)
    : await getOngoing(source, page);

  const data = response.data;
  const pagination: ApiPagination =
    data?.pagination ?? {
      currentPage: page,
      nextPage: null,
      hasNextPage: false,
      totalPages: null,
    };
  const items = data?.items ?? [];
  const featuredAnime = !query && page === 1 && items.length > 0 ? items[0] : null;

  const title = query ? `Hasil Pencarian "${query}"` : "Anime Ongoing Terbaru";
  const subtitle = query
    ? `Menampilkan hasil pencarian dari upstream ${source}`
    : `Daftar rilis episode mingguan terupdate dari provider ${source}`;
  const badge = query ? "Search" : "Ongoing";

  return (
    <div className="space-y-10">
      {/* Fallback Banner when upstream failover occurred */}
      {data?.meta && <FallbackBanner meta={data.meta} />}

      {/* Featured Hero Banner on Homepage Page 1 */}
      {featuredAnime && (
        <HeroSection anime={featuredAnime} source={source} />
      )}

      {/* Source Switcher Control Bar */}
      <Suspense fallback={<div className="h-16 animate-pulse rounded-2xl bg-card border-2 border-black" />}>
        <SourceSwitcher currentSource={source} />
      </Suspense>

      {/* Anime Grid Section */}
      <section className="space-y-6">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          badge={badge}
        />

        {response.error && !items.length ? (
          <ErrorState
            message={response.error}
            action={
              <a
                href={`/?source=${source}`}
                className="btn-brutal inline-block rounded-xl border-black bg-brand-yellow px-5 py-2.5 text-xs font-black uppercase text-black"
              >
                Muat Ulang Halaman
              </a>
            }
          />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-card-border p-12 text-center text-sm font-semibold text-slate-400">
            Tidak ada anime yang ditemukan untuk pencarian atau sumber ini. Silakan coba kata kunci lain atau ganti provider sumber di atas.
          </div>
        ) : (
          <AnimeListWithLoadMore
            // Remount on source/query/page change — the client component holds
            // the list in state, so a stale instance would keep showing the
            // previous listing after client-side search navigation.
            key={`home-${source}-${query ?? ""}-${page}`}
            source={source}
            query={query}
            initialItems={items}
            initialPagination={pagination}
          />
        )}
      </section>
    </div>
  );
}
