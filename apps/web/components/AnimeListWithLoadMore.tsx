"use client";

import { useMemo, useState } from "react";
import type { AnimeItem, Pagination } from "../lib/api";
import { AnimeCard } from "./AnimeCard";

interface Props {
  initialItems: AnimeItem[];
  initialPagination?: Pagination;
  query?: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";
const LIST_SOURCE = "otakudesu";

export function AnimeListWithLoadMore({ initialItems, initialPagination, query }: Props) {
  const [items, setItems] = useState<AnimeItem[]>(initialItems ?? []);
  const [pagination, setPagination] = useState<Pagination | undefined>(initialPagination);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => (query ? "search" : "ongoing"), [query]);
  const hasNext = pagination?.hasNextPage ?? false;
  const nextPage =
    pagination?.nextPage ?? (pagination?.currentPage ? pagination.currentPage + 1 : 2);

  const loadMore = async () => {
    if (!hasNext || loading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (query) params.set("q", query);
      const res = await fetch(`${API_BASE}/${LIST_SOURCE}/${endpoint}?${params.toString()}`);
      if (!res.ok) {
        setError("Tidak dapat memuat halaman berikutnya.");
        return;
      }
      const data = (await res.json()) as { items: AnimeItem[]; pagination: Pagination };
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setPagination(data.pagination);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat data. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((anime) => (
          <AnimeCard key={`${anime.id}-${anime.title}`} anime={anime} />
        ))}
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {hasNext && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="w-full rounded-full border border-primary px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Memuat..." : "Load more"}
        </button>
      )}
    </div>
  );
}
