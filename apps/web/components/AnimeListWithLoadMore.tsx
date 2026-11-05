"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { AnimeCard } from "./AnimeCard";
import {
  browseAnime,
  getGenreAnime,
  getOngoing,
  searchAnime,
  type AnimeItem,
  type Pagination,
  type Source,
} from "../lib/api";

interface AnimeListWithLoadMoreProps {
  source: Source;
  query?: string;
  initialItems: AnimeItem[];
  initialPagination: Pagination;
  /** "listing" = ongoing/search (default). "genre" = genre browse. "browse" = status/sort directory. */
  mode?: "listing" | "genre" | "browse";
  genreId?: string;
  browseQuery?: { status?: string; sort?: string; q?: string };
}

export function AnimeListWithLoadMore({
  source,
  query,
  initialItems,
  initialPagination,
  mode = "listing",
  genreId,
  browseQuery,
}: AnimeListWithLoadMoreProps) {
  const [items, setItems] = useState<AnimeItem[]>(initialItems ?? []);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasNext = Boolean(pagination?.hasNextPage) && !loading;

  const loadMore = useCallback(async () => {
    if (loading || !pagination?.hasNextPage) return;
    const targetPage = pagination.nextPage ?? pagination.currentPage + 1;

    setLoading(true);
    setError(null);
    try {
      const response =
        mode === "browse"
          ? await browseAnime(source, { ...browseQuery, page: targetPage })
          : mode === "genre"
            ? await getGenreAnime(source, genreId ?? "", targetPage, browseQuery?.sort)
            : query
              ? await searchAnime(source, query, targetPage)
              : await getOngoing(source, targetPage);

      if (response.error && !response.data) {
        setError(response.error);
        return;
      }

      // Directory browsing may be unsupported upstream (e.g. oploverz).
      if ((response.data as { supported?: boolean })?.supported === false) {
        setError((response.data as { note?: string }).note ?? "Filter tidak didukung untuk sumber ini.");
        setPagination((prev) => ({ ...prev, hasNextPage: false, nextPage: null }));
        return;
      }

      const incoming = response.data?.items ?? [];
      setPagination(
        response.data?.pagination ?? {
          currentPage: targetPage,
          nextPage: null,
          hasNextPage: false,
          totalPages: pagination.totalPages,
        },
      );

      if (incoming.length === 0) {
        // Upstream says there is a next page but returned nothing — stop offering more.
        setPagination((prev) => ({ ...prev, hasNextPage: false, nextPage: null }));
        return;
      }

      setItems((prev) => {
        // Dedupe by anime id while preserving the API order across pages.
        const seen = new Set(prev.map((item) => item.id));
        const fresh = incoming.filter((item) => item.id && !seen.has(item.id));
        return [...prev, ...fresh];
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat data. Coba lagi nanti.",
      );
    } finally {
      setLoading(false);
    }
  }, [loading, pagination, query, source, mode, genreId, browseQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-xl border-2 border-black bg-black px-3 py-1.5 text-xs font-black uppercase text-brand-yellow shadow-brutal-sm">
          {items.length} Judul Ditemukan
        </div>
        {pagination.totalPages && pagination.currentPage ? (
          <span className="text-xs font-bold text-slate-400">
            Halaman {pagination.currentPage}
            {pagination.totalPages ? ` dari ${pagination.totalPages}` : ""}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
        {items.map((anime) => (
          <AnimeCard key={`${source}-${anime.id}`} anime={anime} source={source} />
        ))}
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-card-border p-4 text-xs font-semibold text-rose-400">
          <span>{error}</span>
        </div>
      )}

      {hasNext && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="btn-brutal inline-flex items-center gap-2 rounded-xl border-black bg-brand-yellow px-6 py-3 text-xs font-black uppercase text-black transition-all hover:bg-brand-yellowHover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memuat...</span>
              </>
            ) : (
              <span>Muat Lebih Banyak</span>
            )}
          </button>
        </div>
      )}

      {!hasNext && !error && (
        <p className="text-center text-xs font-semibold text-slate-500">
          Semua judul telah ditampilkan.
        </p>
      )}
    </div>
  );
}
