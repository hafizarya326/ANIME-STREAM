export type Source = "otakudesu" | "kuramanime" | "oploverz";
export const SOURCES: { id: Source; label: string; badge: string }[] = [
  { id: "otakudesu", label: "Otakudesu", badge: "Utama" },
  { id: "kuramanime", label: "Kuramanime", badge: "Alternatif" },
  { id: "oploverz", label: "Oploverz", badge: "Cadangan" },
];
export const DEFAULT_SOURCE: Source = "otakudesu";

export const isValidSource = (value: string | null | undefined): value is Source =>
  Boolean(value && SOURCES.some((s) => s.id === value.toLowerCase()));

export const pickSource = (value?: string | null): Source =>
  isValidSource(value) ? (value.toLowerCase() as Source) : DEFAULT_SOURCE;

export interface ResponseMeta {
  fallbackUsed?: boolean;
  originalSource?: string;
  actualSource?: string;
}

export interface Pagination {
  currentPage: number;
  nextPage: number | null;
  hasNextPage: boolean;
  totalPages: number | null;
}

export interface AnimeItem {
  id: string;
  title: string;
  poster: string | null;
  episodes: string | number | null;
  latestReleaseDate: string | null;
  releaseDay: string | null;
  score?: string | number | null;
  type?: string | null;
}

export interface OngoingResponse {
  items: AnimeItem[];
  pagination: Pagination;
  meta?: ResponseMeta;
}

export type SearchResponse = OngoingResponse;

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
}

export interface ServerStreamResponse {
  url: string | null;
  directUrl: string | null;
  isDirect: boolean;
}

export interface DiagnosisResponse {
  ok: boolean;
  upstreamStatus: number | null;
  forbidden: boolean;
  upstreamBaseUrl: string;
  suggestions: string[];
  error?: {
    code: string;
    message: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";
const isServer = typeof window === "undefined";

const defaultFetchOptions: RequestInit = isServer ? { cache: "no-store" } : {};

export interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiResult<T> {
  data: T | null;
  error?: string;
  status?: number;
}

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

const encodeRouteId = (value: string) => {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
};

const parseError = async (res: Response): Promise<ApiErrorBody | null> => {
  try {
    return (await res.json()) as ApiErrorBody;
  } catch {
    return null;
  }
};

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...defaultFetchOptions,
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const parsed = await parseError(res);
      const message = parsed?.error?.message ?? `Gagal memuat data (status ${res.status})`;
      return { data: null, error: message, status: res.status };
    }

    const data = (await res.json()) as T;
    return { data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data. Coba lagi nanti.";
    return { data: null, error: message };
  }
}

// Unified API calls by source
export const getOngoing = (source: Source = DEFAULT_SOURCE, page = 1) =>
  request<OngoingResponse>(`/${source}/ongoing${buildQuery({ page })}`);

export const searchAnime = (source: Source = DEFAULT_SOURCE, q: string, page = 1) =>
  request<SearchResponse>(`/${source}/search${buildQuery({ q, page })}`);

export const getAnimeDetail = (source: Source = DEFAULT_SOURCE, animeId: string) =>
  request<AnimeDetail>(`/${source}/anime/${encodeRouteId(animeId)}`);

export const getEpisodeDetail = (source: Source = DEFAULT_SOURCE, episodeId: string) =>
  request<EpisodeDetail>(`/${source}/episode/${encodeRouteId(episodeId)}`);

export const getServerStream = (source: Source = DEFAULT_SOURCE, serverId: string) =>
  request<ServerStreamResponse>(`/${source}/server/${encodeRouteId(serverId)}`);

export const getDiagnosis = (source: Source = DEFAULT_SOURCE) =>
  request<DiagnosisResponse>(`/${source}/diagnose`);

// Backward compatibility helpers
export const getOtakudesuOngoing = (page = 1) => getOngoing("otakudesu", page);
export const searchOtakudesu = (q: string, page = 1) => searchAnime("otakudesu", q, page);
export const searchKuramanime = (q: string, page = 1) => searchAnime("kuramanime", q, page);
export const getKuramanimeAnimeDetail = (animeCompositeId: string) =>
  getAnimeDetail("kuramanime", animeCompositeId);
export const getKuramanimeEpisodeDetail = (episodeCompositeId: string) =>
  getEpisodeDetail("kuramanime", episodeCompositeId);
export const searchOploverz = (q: string) => searchAnime("oploverz", q);
export const getOploverzAnimeDetail = (animeSlug: string) => getAnimeDetail("oploverz", animeSlug);
export const getOploverzEpisodeDetail = (episodeSlug: string) =>
  getEpisodeDetail("oploverz", episodeSlug);

// ---------- Discovery: schedule, genres, advanced browse ----------

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
}

export interface BrowseParams {
  status?: string;
  sort?: string;
  q?: string;
  page?: number;
}

export interface BrowseResponse extends OngoingResponse {
  supported?: boolean;
  note?: string;
}

export const getSchedule = (source: Source = DEFAULT_SOURCE, day?: string) =>
  request<ScheduleResponse>(
    `/${source}/schedule${buildQuery({ day })}`,
  );

export const getGenres = (source: Source = DEFAULT_SOURCE) =>
  request<GenresResponse>(`/${source}/genres`);

export const getGenreAnime = (
  source: Source = DEFAULT_SOURCE,
  genreId: string,
  page = 1,
  sort?: string,
) =>
  request<BrowseResponse>(
    `/${source}/genre/${encodeRouteId(genreId)}${buildQuery({ page, sort })}`,
  );

export const browseAnime = (source: Source = DEFAULT_SOURCE, params: BrowseParams = {}) =>
  request<BrowseResponse>(
    `/${source}/browse${buildQuery({
      status: params.status,
      sort: params.sort,
      q: params.q,
      page: params.page,
    })}`,
  );

// Canonical weekday ids (labels rendered in Indonesian by the UI).
export const WEEK_DAYS: { id: string; label: string }[] = [
  { id: "monday", label: "Senin" },
  { id: "tuesday", label: "Selasa" },
  { id: "wednesday", label: "Rabu" },
  { id: "thursday", label: "Kamis" },
  { id: "friday", label: "Jumat" },
  { id: "saturday", label: "Sabtu" },
  { id: "sunday", label: "Minggu" },
];

export const currentWibDay = (): string => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      weekday: "long",
    })
      .format(new Date())
      .toLowerCase();
  } catch {
    return "monday";
  }
};
