import { Suspense } from "react";
import { LayoutGrid, SlidersHorizontal, X } from "lucide-react";
import { AnimeListWithLoadMore } from "../../components/AnimeListWithLoadMore";
import { ErrorState } from "../../components/ErrorState";
import { FallbackBanner } from "../../components/FallbackBanner";
import { SectionHeader } from "../../components/SectionHeader";
import { SourceSwitcher } from "../../components/SourceSwitcher";
import {
  browseAnime,
  getGenreAnime,
  getGenres,
  pickSource,
  type Pagination as ApiPagination,
  type Source,
} from "../../lib/api";
import { SOURCE_FILTERS } from "../../lib/filters";

interface PageProps {
  searchParams?: Record<string, string | string[]>;
}

const getParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;
const parsePage = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const buildHref = (
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): string => {
  const merged: Record<string, string | undefined> = { ...params, ...overrides };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `/browse?${qs}` : "/browse";
};

export default async function BrowsePage({ searchParams }: PageProps) {
  const raw = {
    source: getParam(searchParams?.source),
    genre: getParam(searchParams?.genre),
    status: getParam(searchParams?.status),
    sort: getParam(searchParams?.sort),
    q: getParam(searchParams?.q)?.trim(),
    page: getParam(searchParams?.page),
  };
  const source: Source = pickSource(raw.source);
  const page = parsePage(raw.page);
  const filters = SOURCE_FILTERS[source];
  const activeGenre = raw.genre || undefined;
  const activeStatus = raw.status || undefined;
  const activeSort = raw.sort || undefined;
  const activeQuery = raw.q || undefined;

  const currentParams: Record<string, string | undefined> = {
    source,
    genre: activeGenre,
    status: activeStatus,
    sort: activeSort,
    q: activeQuery,
  };

  const genresResult = filters.genreSupported ? await getGenres(source) : null;
  const genres = genresResult?.data?.genres ?? [];

  const resultsResponse =
    activeGenre
      ? await getGenreAnime(source, activeGenre, page, activeSort)
      : await browseAnime(source, {
          status: activeStatus,
          sort: activeSort,
          q: activeQuery,
          page,
        });
  const results = resultsResponse.data;
  const items = results?.items ?? [];
  const pagination: ApiPagination =
    results?.pagination ?? {
      currentPage: page,
      nextPage: null,
      hasNextPage: false,
      totalPages: null,
    };

  const browseSupported = activeGenre
    ? filters.genreSupported
    : filters.browseSupported;
  const unsupportedNote =
    !browseSupported &&
    (results as { note?: string } | null)?.note !== undefined
      ? (results as { note?: string }).note
      : undefined;

  const title = activeGenre
    ? `Genre: ${genres.find((g) => g.id === activeGenre)?.title ?? activeGenre}`
    : activeQuery
      ? `Pencarian "${activeQuery}"`
      : "Jelajah Anime";
  const subtitle = activeGenre
    ? `Anime dengan genre ${activeGenre} dari upstream ${source}`
    : `Direktori anime dari upstream ${source} dengan filter yang didukung API`;

  return (
    <div className="space-y-10">
      {(results?.meta || genresResult?.data?.meta) && (
        <FallbackBanner
          meta={
            (results?.meta ?? genresResult?.data?.meta) as {
              fallbackUsed: boolean;
              originalSource: string;
              actualSource: string;
            }
          }
        />
      )}

      <Suspense fallback={<div className="h-16 animate-pulse rounded-2xl bg-card border-2 border-black" />}>
        <SourceSwitcher currentSource={source} />
      </Suspense>

      <section className="space-y-6">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          badge="Jelajah"
          action={
            <div className="rounded-xl border-2 border-black bg-black px-3 py-1.5 text-xs font-black uppercase text-brand-yellow shadow-brutal-sm">
              {pagination.totalPages ? `${pagination.totalPages} Halaman` : `${items.length} Judul`}
            </div>
          }
        />

        {/* Genre chips (only for sources exposing a genre list upstream) */}
        {filters.genreSupported ? (
          <div className="space-y-3 rounded-2xl border-2 border-black bg-card p-4 shadow-brutal">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-cyan">
                <LayoutGrid className="h-4 w-4" />
                Filter Genre {genres.length > 0 ? `(${genres.length})` : ""}
              </span>
              {(activeGenre || activeStatus || activeSort || activeQuery) && (
                <a
                  href={`/browse?source=${source}`}
                  className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-brand-cyan px-2.5 py-1 text-[10px] font-black uppercase text-black shadow-[2px_2px_0px_0px_#000] transition-all hover:-translate-y-0.5"
                >
                  <X className="h-3 w-3" />
                  Hapus Semua Filter
                </a>
              )}
            </div>
            {genresResult?.error && !genres.length ? (
              <p className="text-xs font-semibold text-rose-400">{genresResult.error}</p>
            ) : genres.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400">
                {genresResult?.data?.note ?? "Daftar genre tidak tersedia untuk sumber ini."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => {
                  const isActive = genre.id === activeGenre;
                  return (
                    <a
                      key={genre.id}
                      href={
                        isActive
                          ? buildHref(currentParams, { genre: undefined, page: undefined })
                          : buildHref(currentParams, { genre: genre.id, page: undefined })
                      }
                      className={`inline-flex items-center gap-1 rounded-xl border-2 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-all ${
                        isActive
                          ? "border-black bg-brand-yellow text-black shadow-[2px_2px_0px_0px_#000]"
                          : "border-card-border bg-[#0e121d] text-slate-300 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {genre.title}
                      {isActive && <X className="h-3 w-3" />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-card-border bg-card/50 px-4 py-3 text-xs font-semibold text-slate-400">
            {genresResult?.data?.note ??
              "Filter genre tidak tersedia untuk sumber ini di upstream."}
          </div>
        )}

        {/* Advanced filters (only what the upstream actually supports).
            Upstream cannot combine genre with status (otakudesu) or search
            (kuramanime properties), so the form adapts to the active genre. */}
        {browseSupported &&
        (activeGenre
          ? filters.sortOptions.length > 0 && source === "kuramanime"
          : filters.statusOptions.length > 0 || filters.sortOptions.length > 0) ? (
          <form
            action="/browse"
            method="get"
            className="flex flex-wrap items-end gap-3 rounded-2xl border-2 border-black bg-card p-4 shadow-brutal"
          >
            <input type="hidden" name="source" value={source} />
            {activeGenre && <input type="hidden" name="genre" value={activeGenre} />}
            {filters.searchCombinesWithFilters && !activeGenre && (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Cari Judul
                </span>
                <input
                  type="text"
                  name="q"
                  defaultValue={activeQuery}
                  placeholder="Gabung dengan filter..."
                  className="w-44 rounded-lg border-2 border-black bg-[#0e121d] px-3 py-2 text-xs font-semibold text-white placeholder-slate-500 outline-none focus:border-brand-yellow"
                />
              </label>
            )}
            {!activeGenre && filters.statusOptions.length > 0 && (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Status
                </span>
                <select
                  name="status"
                  defaultValue={activeStatus ?? ""}
                  className="rounded-lg border-2 border-black bg-[#0e121d] px-3 py-2 text-xs font-bold text-white outline-none focus:border-brand-yellow"
                >
                  <option value="">Semua</option>
                  {filters.statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(activeGenre || filters.sortOptions.length > 0) && (
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Urutkan
                </span>
                <select
                  name="sort"
                  defaultValue={activeSort ?? ""}
                  className="rounded-lg border-2 border-black bg-[#0e121d] px-3 py-2 text-xs font-bold text-white outline-none focus:border-brand-yellow"
                >
                  <option value="">Default</option>
                  {filters.sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="submit"
              className="btn-brutal inline-flex items-center gap-1.5 rounded-xl border-black bg-brand-yellow px-4 py-2 text-xs font-black uppercase text-black transition-all hover:bg-brand-yellowHover"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Terapkan
            </button>
          </form>
        ) : null}

        {results?.note && (
          <div className="rounded-2xl border-2 border-dashed border-card-border bg-card/50 px-4 py-3 text-xs font-semibold text-slate-400">
            {results.note}
          </div>
        )}
        {unsupportedNote && (
          <div className="rounded-2xl border-2 border-dashed border-card-border bg-card/50 px-4 py-3 text-xs font-semibold text-slate-400">
            {unsupportedNote}
          </div>
        )}

        {resultsResponse.error && !items.length ? (
          <ErrorState
            message={resultsResponse.error}
            action={
              <a
                href={`/browse?source=${source}`}
                className="btn-brutal inline-block rounded-xl border-black bg-brand-yellow px-5 py-2.5 text-xs font-black uppercase text-black"
              >
                Muat Ulang
              </a>
            }
          />
        ) : !browseSupported ? (
          <div className="rounded-2xl border-2 border-dashed border-card-border p-12 text-center text-sm font-semibold text-slate-400">
            Direktori dan filter untuk sumber {source} belum didukung oleh upstream. Silakan gunakan sumber lain melalui pemilih provider di atas.
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-card-border p-12 text-center text-sm font-semibold text-slate-400">
            Tidak ada anime yang cocok dengan filter ini. Coba hapus beberapa filter atau ganti genre.
          </div>
        ) : (
          <AnimeListWithLoadMore
            // Remount when any filter identity changes — client state must not
            // survive a client-side filter/search/source navigation.
            key={`browse-${source}-${activeGenre ?? ""}-${activeStatus ?? ""}-${activeSort ?? ""}-${activeQuery ?? ""}-${page}`}
            source={source}
            initialItems={items}
            initialPagination={pagination}
            mode={activeGenre ? "genre" : "browse"}
            genreId={activeGenre}
            browseQuery={{ status: activeStatus, sort: activeSort, q: activeQuery }}
          />
        )}
      </section>
    </div>
  );
}
