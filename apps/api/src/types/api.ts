export type ErrorCode =
  "BAD_REQUEST" | "NOT_FOUND" | "UPSTREAM_ERROR" | "UPSTREAM_FORBIDDEN";

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
  score?: string | number | null;
  type?: string | null;
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

export interface AnimeRecommendation {
  animeId: string;
  title: string;
  poster: string | null;
}

export interface AnimeDetail {
  id: string;
  title: string;
  japaneseTitle?: string | null;
  poster: string | null;
  synopsis: string | null;
  genres: string[];
  status?: string | null;
  type?: string | null;
  duration?: string | null;
  aired?: string | null;
  score?: string | number | null;
  studio?: string | null;
  episodes: AnimeEpisodeSummary[];
  recommendations?: AnimeRecommendation[];
  meta?: ResponseMeta;
  raw?: unknown;
}

export interface EpisodeServerItem {
  serverId: string;
  title: string;
  url?: string | null;
}

export interface EpisodeQualityServer {
  quality: string;
  serverList: EpisodeServerItem[];
}

export interface EpisodeDownload {
  quality: string | null;
  provider: string | null;
  url: string | null;
  size?: string | null;
}

export interface EpisodeDetail {
  episodeId: string;
  title: string | null;
  animeId?: string | null;
  streaming: {
    url: string | null;
    directUrl?: string | null;
    isDirect?: boolean;
    format?: "mp4" | "hls" | "embed" | "unknown";
  };
  server?: EpisodeQualityServer[];
  downloads: EpisodeDownload[];
  hasPrevEpisode?: boolean;
  hasNextEpisode?: boolean;
  prevEpisode?: { episodeId: string; title?: string | null } | null;
  nextEpisode?: { episodeId: string; title?: string | null } | null;
  episodeList?: AnimeEpisodeSummary[];
  meta?: ResponseMeta;
  raw?: unknown;
}

export interface ResponseMeta {
  fallbackUsed: boolean;
  originalSource: string;
  actualSource: string;
}

export interface ScheduleItem {
  id: string;
  title: string;
  poster: string | null;
  releaseTime: string | null;
  episode: string | number | null;
  type?: string | null;
  quality?: string | null;
}

export interface ScheduleDay {
  id: string;
  label: string;
  animeList: ScheduleItem[];
}

export interface ScheduleResponse {
  days: ScheduleDay[];
  activeDay: string;
  note?: string;
  meta?: ResponseMeta;
  raw?: unknown;
}

export interface GenreItem {
  id: string;
  title: string;
}

export interface GenresResponse {
  genres: GenreItem[];
  supported: boolean;
  note?: string;
  meta?: ResponseMeta;
  raw?: unknown;
}

export interface BrowseResponse extends OngoingAnimeResponse {
  supported?: boolean;
  note?: string;
}
