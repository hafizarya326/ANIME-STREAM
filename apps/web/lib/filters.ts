import type { Source } from "./api";

// Filter capabilities per source. Every value here is verified against the
// upstream wajik-anime-api schemas/controllers — options are NOT invented for
// sources where the upstream returns 404 (see BFF browse endpoint).
export interface FilterOption {
  value: string;
  label: string;
}

export interface SourceFilterConfig {
  browseSupported: boolean;
  genreSupported: boolean;
  // Upstream kuramanime ignores `search` when `status` is present.
  searchCombinesWithFilters: boolean;
  statusOptions: FilterOption[];
  sortOptions: FilterOption[];
}

const NO_OPTIONS: FilterOption[] = [];

export const SOURCE_FILTERS: Record<Source, SourceFilterConfig> = {
  otakudesu: {
    browseSupported: true,
    genreSupported: true,
    searchCombinesWithFilters: false,
    statusOptions: [
      { value: "ongoing", label: "Sedang Tayang" },
      { value: "completed", label: "Tamat" },
    ],
    sortOptions: NO_OPTIONS,
  },
  kuramanime: {
    browseSupported: true,
    genreSupported: true,
    searchCombinesWithFilters: true,
    statusOptions: [
      { value: "ongoing", label: "Sedang Tayang" },
      { value: "completed", label: "Tamat" },
      { value: "upcoming", label: "Akan Tayang" },
      { value: "movie", label: "Movie" },
    ],
    sortOptions: [
      { value: "popular", label: "Terpopuler" },
      { value: "most_viewed", label: "Paling Banyak Ditonton" },
      { value: "updated", label: "Update Terbaru" },
      { value: "latest", label: "Terbaru" },
      { value: "oldest", label: "Terlama" },
      { value: "a-z", label: "A → Z" },
      { value: "z-a", label: "Z → A" },
    ],
  },
  oploverz: {
    // Upstream oploverz directory/filter endpoints currently return 404.
    browseSupported: false,
    genreSupported: false,
    searchCombinesWithFilters: false,
    statusOptions: NO_OPTIONS,
    sortOptions: NO_OPTIONS,
  },
};
