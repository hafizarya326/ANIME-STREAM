export type Source = "otakudesu" | "kuramanime";
export const SOURCES: Source[] = ["otakudesu", "kuramanime"];
export const DEFAULT_SOURCE: Source = "otakudesu";

export const isValidSource = (value: string | null | undefined): value is Source =>
  (SOURCES as string[]).includes((value ?? "").toLowerCase());

export const pickSource = (value?: string | null): Source =>
  isValidSource(value) ? ((value as string).toLowerCase() as Source) : DEFAULT_SOURCE;

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

export interface AnimeDetail {
  id: string;
  title: string;
  poster: string | null;
  synopsis: string | null;
  genres: string[];
  episodes: AnimeEpisodeSummary[];
  meta?: ResponseMeta;
}

export interface EpisodeDownload {
  quality: string | null;
  provider: string | null;
  url: string | null;
}

export interface EpisodeDetail {
  episodeId: string;
  title: string | null;
  streaming: { url: string | null };
  downloads: EpisodeDownload[];
  meta?: ResponseMeta;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";
const isServer = typeof window === "undefined";

const defaultFetchOptions: RequestInit = isServer
  ? { next: { revalidate: 60 } as any }
  : {};

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

export const getOtakudesuOngoing = (page = 1) =>
  request<OngoingResponse>(`/otakudesu/ongoing${buildQuery({ page })}`);

export const searchOtakudesu = (q: string, page = 1) =>
  request<SearchResponse>(`/otakudesu/search${buildQuery({ q, page })}`);

export const searchKuramanime = (q: string, page = 1) =>
  request<SearchResponse>(`/kuramanime/search${buildQuery({ q, page })}`);

export const getKuramanimeAnimeDetail = (animeCompositeId: string) =>
  request<AnimeDetail>(`/kuramanime/anime/${encodeURIComponent(animeCompositeId)}`);

export const getKuramanimeEpisodeDetail = (episodeCompositeId: string) =>
  request<EpisodeDetail>(`/kuramanime/episode/${encodeURIComponent(episodeCompositeId)}`);
