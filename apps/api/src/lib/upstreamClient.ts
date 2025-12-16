import { ApiError } from "./errors.js";
import type { AnimeDetail, EpisodeDetail, OngoingAnimeResponse, Pagination } from "../types/api.js";
import { parseJsonEnv } from "./env.js";

const DEFAULT_BASE_URL = process.env.UPSTREAM_API_BASE_URL || "http://localhost:3001";
const isProduction = process.env.NODE_ENV === "production";
const parsedTimeout = Number(process.env.UPSTREAM_TIMEOUT_MS);
const DEFAULT_TIMEOUT_MS = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 10_000;

type FetchOptions = {
  path: string;
  source?: string;
  searchParams?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
};

type HeaderMap = Record<string, Record<string, string>>;

const BASE_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://www.google.com/",
  Origin: "https://www.google.com/",
};

const DEFAULT_HEADERS = parseJsonEnv<Record<string, string>>(
  process.env.UPSTREAM_DEFAULT_HEADERS_JSON,
  "UPSTREAM_DEFAULT_HEADERS_JSON"
);
const SOURCE_HEADERS = parseJsonEnv<HeaderMap>(
  process.env.UPSTREAM_SOURCE_HEADERS_JSON,
  "UPSTREAM_SOURCE_HEADERS_JSON"
);

export class UpstreamClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly sourceHeaders: HeaderMap;
  private readonly defaultHeaders: Record<string, string>;

  constructor(
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = 2,
    options?: { defaultHeaders?: Record<string, string>; sourceHeaders?: HeaderMap }
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.defaultHeaders = options?.defaultHeaders ?? DEFAULT_HEADERS;
    this.sourceHeaders = options?.sourceHeaders ?? SOURCE_HEADERS;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  private buildHeaders(source?: string, headers?: Record<string, string>): Record<string, string> {
    return {
      ...BASE_HEADERS,
      ...this.defaultHeaders,
      ...(source && this.sourceHeaders?.[source] ? this.sourceHeaders[source] : {}),
      ...(headers ?? {}),
    };
  }

  async getJson<T = unknown>({ path, source, searchParams, headers }: FetchOptions): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (searchParams) {
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: this.buildHeaders(source, headers),
          redirect: "follow",
        });
        clearTimeout(timeout);
        if (!response.ok) {
          const status = response.status;
          const code =
            status === 404
              ? "NOT_FOUND"
              : status === 403
                ? "UPSTREAM_FORBIDDEN"
                : "UPSTREAM_ERROR";
          const message =
            status === 403
              ? "Upstream responded with 403 Forbidden"
              : `Upstream responded with status ${status}`;
          this.logFailure({ source, path, status, attempt, message });

          if (shouldRetry(status) && attempt < this.retries) {
            await delay(Math.pow(2, attempt) * 200);
            continue;
          }

          throw new ApiError(code, message, { status, source, path });
        }
        return (await response.json()) as T;
      } catch (error) {
        clearTimeout(timeout);
        lastError = error;
        const status =
          error instanceof ApiError
            ? (error.details as any)?.status
            : (error as any)?.status;
        const isLastAttempt = attempt === this.retries;
        const retryableNetwork = !isClientErrorStatus(status) && !isLastAttempt;
        if (retryableNetwork && shouldRetry(status)) {
          await delay(Math.pow(2, attempt) * 200);
          continue;
        }
        if (error instanceof ApiError) {
          throw error;
        }
        if (isAbortError(error)) {
          this.logFailure({ source, path, status: 408, attempt, message: "Request timed out" });
          throw new ApiError("UPSTREAM_ERROR", "Upstream request timed out", { cause: serializeError(error) });
        }
        this.logFailure({
          source,
          path,
          status: status ?? undefined,
          attempt,
          message: error instanceof Error ? error.message : "Unexpected error",
        });
      }
    }
    throw new ApiError("UPSTREAM_ERROR", "Unable to reach upstream service", {
      cause: serializeError(lastError),
    });
  }

  private logFailure(params: { source?: string; path: string; status?: number; attempt: number; message: string }) {
    const { source, path, status, attempt, message } = params;
    console.warn(
      `[upstream] source=${source ?? "unknown"} path=${path} status=${status ?? "n/a"} attempt=${
        attempt + 1
      } message=${message}`
    );
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

const isClientErrorStatus = (status?: number) => typeof status === "number" && status >= 400 && status < 500;

const shouldRetry = (status?: number) => status === undefined || status === 429 || (status >= 500 && status < 600);

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const normalizePagination = (input: any): Pagination => {
  const pagination = input?.pagination || input?.data?.pagination || input;
  const currentPage =
    Number(pagination?.currentPage ?? pagination?.page ?? pagination?.current_page ?? 1) || 1;
  const nextPageValue =
    pagination?.nextPage ?? pagination?.next_page ?? pagination?.next ?? pagination?.page_next;
  const totalPages =
    pagination?.totalPages ??
    pagination?.total_pages ??
    pagination?.lastPage ??
    pagination?.last_page ??
    null;
  const hasNextPage =
    typeof pagination?.hasNextPage === "boolean"
      ? pagination.hasNextPage
      : nextPageValue != null
        ? true
        : totalPages != null
          ? currentPage < Number(totalPages)
          : false;

  return {
    currentPage,
    nextPage: nextPageValue != null ? Number(nextPageValue) : hasNextPage ? currentPage + 1 : null,
    hasNextPage,
    totalPages: totalPages != null ? Number(totalPages) : null,
  };
};

export const normalizeOngoing = (
  upstream: any
): OngoingAnimeResponse & { raw?: unknown } => {
  const list =
    upstream?.data?.animeList ??
    upstream?.animeList ??
    upstream?.data ??
    upstream?.results ??
    [];

  const items = Array.isArray(list)
    ? list.map((item: any) => {
        const combinedId =
          item?.animeSlug || item?.slug
            ? `${item?.animeId ?? item?.id ?? ""}|${item?.animeSlug ?? item?.slug ?? ""}`
            : null;
        const id =
          combinedId ||
          item?.id ||
          item?.slug ||
          item?.animeId ||
          item?.anime_id ||
          item?.linkId ||
          (item?.title ? slugify(item.title) : undefined) ||
          "";
        return {
          id,
          title: item?.title || item?.name || "Untitled",
          poster: item?.poster || item?.thumbnail || item?.image || null,
          episodes: item?.episodes ?? item?.episode ?? item?.last_episode ?? null,
          latestReleaseDate: item?.latestReleaseDate ?? item?.releaseDate ?? item?.uploadedOn ?? null,
          releaseDay: item?.releaseDay ?? item?.day ?? null,
        };
      })
    : [];

  const payload: OngoingAnimeResponse = {
    items,
    pagination: normalizePagination(upstream),
  };

  if (!isProduction) {
    payload.raw = upstream;
  }

  return payload;
};

export const normalizeAnimeDetail = (upstream: any): AnimeDetail => {
  const data = upstream?.data ?? upstream;
  const details = data?.details;
  const idFromDetails =
    details?.animeId && details?.animeSlug ? `${details.animeId}|${details.animeSlug}` : undefined;
  const titleFromDetails = details?.title ?? details?.alternativeTitle;
  const posterFromDetails = details?.poster;
  const episodeRange = details?.episode;
  const generatedEpisodes =
    details?.animeId && details?.animeSlug && episodeRange
      ? Array.from(
          { length: Number(episodeRange.last ?? 0) - Number(episodeRange.first ?? 1) + 1 },
          (_, idx) => {
            const num = Number(episodeRange.first ?? 1) + idx;
            return {
              episodeId: `${details.animeId}|${details.animeSlug}|${num}`,
              episodeNumber: num,
              title: `Episode ${num}`,
              releaseDate: null,
            };
          }
        )
      : [];
  const episodesList =
    data?.episodes ||
    data?.episode_list ||
    data?.episodeList ||
    data?.episodes_list ||
    data?.episodesData ||
    generatedEpisodes;

  const payload: AnimeDetail = {
    id:
      idFromDetails ||
      data?.id ||
      data?.animeId ||
      data?.slug ||
      (data?.title ? slugify(data.title) : "") ||
      "",
    title: titleFromDetails || data?.title || data?.name || "Untitled",
    poster: posterFromDetails || data?.poster || data?.thumbnail || data?.image || null,
    synopsis: data?.synopsis || data?.description || details?.synopsis?.paragraphList?.join("\n\n") || null,
    genres: Array.isArray(data?.genres)
      ? data.genres.map((g: any) => String(g))
      : typeof data?.genres === "string"
        ? data.genres.split(",").map((g: string) => g.trim())
        : [],
    episodes: Array.isArray(episodesList)
      ? episodesList.map((ep: any) => ({
          episodeId: ep?.episodeId || ep?.id || ep?.slug || "",
          episodeNumber: ep?.episodeNumber ?? ep?.number ?? ep?.episode ?? ep?.eps ?? null,
          title: ep?.title ?? ep?.name ?? null,
          releaseDate: ep?.releaseDate ?? ep?.aired ?? ep?.uploadedOn ?? null,
        }))
      : [],
  };

  if (!isProduction) {
    payload.raw = upstream;
  }

  return payload;
};

export const normalizeEpisodeDetail = (upstream: any): EpisodeDetail => {
  const data = upstream?.data ?? upstream;
  const details = data?.details ?? data;
  const downloads =
    data?.downloads ??
    data?.download ??
    data?.links ??
    details?.download?.qualityList?.flatMap((q: any) =>
      (q?.urlList ?? []).map((u: any) => ({
        quality: q?.title ?? null,
        provider: u?.title ?? null,
        url: u?.url ?? null,
      }))
    ) ??
    [];
  const streamingUrl =
    details?.streaming?.url ??
    details?.streamLink ??
    details?.streamingUrl ??
    details?.server?.qualityList?.[0]?.urlList?.[0]?.url ??
    null;

  const payload: EpisodeDetail = {
    episodeId: details?.episodeId || details?.id || details?.slug || "",
    title: details?.episodeTitle || details?.title || details?.name || null,
    streaming: {
      url: streamingUrl,
    },
    downloads: Array.isArray(downloads)
      ? downloads.map((dl: any) => ({
          quality: dl?.quality ?? dl?.title ?? dl?.resolution ?? null,
          provider: dl?.provider ?? dl?.server ?? dl?.title ?? null,
          url: dl?.url ?? dl?.link ?? null,
        }))
      : [],
  };

  if (!isProduction) {
    payload.raw = upstream;
  }

  return payload;
};
