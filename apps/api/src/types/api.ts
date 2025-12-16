export type ErrorCode = "BAD_REQUEST" | "NOT_FOUND" | "UPSTREAM_ERROR" | "UPSTREAM_FORBIDDEN";

export interface ApiErrorPayload {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface Pagination {
  currentPage: number;
  nextPage: number | null;
  hasNextPage: boolean;
  totalPages: number | null;
}

export interface OngoingAnimeItem {
  id: string;
  title: string;
  poster: string | null;
  episodes: string | number | null;
  latestReleaseDate: string | null;
  releaseDay: string | null;
}

export interface OngoingAnimeResponse {
  items: OngoingAnimeItem[];
  pagination: Pagination;
  meta?: ResponseMeta;
  raw?: unknown;
}

export interface AnimeEpisodeSummary {
  episodeId: string;
  episodeNumber: string | number | null;
  title: string | null;
  releaseDate: string | null;
}

export interface AnimeDetail {
  id: string;
  title: string;
  poster: string | null;
  synopsis: string | null;
  genres: string[];
  episodes: AnimeEpisodeSummary[];
  meta?: ResponseMeta;
  raw?: unknown;
}

export interface EpisodeDownload {
  quality: string | null;
  provider: string | null;
  url: string | null;
}

export interface EpisodeDetail {
  episodeId: string;
  title: string | null;
  streaming: {
    url: string | null;
  };
  downloads: EpisodeDownload[];
  meta?: ResponseMeta;
  raw?: unknown;
}

export interface ResponseMeta {
  fallbackUsed: boolean;
  originalSource: string;
  actualSource: string;
}
