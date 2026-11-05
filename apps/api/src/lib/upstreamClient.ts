import dns from "node:dns";
// fetch + Agent are imported from the SAME undici package so the dispatcher
// handed to fetch is guaranteed compatible with it (Node's global fetch ships
// its own bundled undici; mixing them breaks dispatcher typing/behavior).
import { Agent, fetch as undiciFetch } from "undici";
import { ApiError } from "./errors.js";
import type {
  AnimeDetail,
  EpisodeDetail,
  OngoingAnimeItem,
  OngoingAnimeResponse,
  Pagination,
  ScheduleResponse,
  ScheduleItem,
} from "../types/api.js";
import { parseJsonEnv } from "./env.js";

const DEFAULT_BASE_URL =
  process.env.UPSTREAM_API_BASE_URL || "http://localhost:3001";
const isProduction = process.env.NODE_ENV === "production";
const parsedTimeout = Number(process.env.UPSTREAM_TIMEOUT_MS);
const DEFAULT_TIMEOUT_MS =
  Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 10_000;

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
  "UPSTREAM_DEFAULT_HEADERS_JSON",
);
const SOURCE_HEADERS = parseJsonEnv<HeaderMap>(
  process.env.UPSTREAM_SOURCE_HEADERS_JSON,
  "UPSTREAM_SOURCE_HEADERS_JSON",
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
    options?: {
      defaultHeaders?: Record<string, string>;
      sourceHeaders?: HeaderMap;
    },
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

  private buildHeaders(
    source?: string,
    headers?: Record<string, string>,
  ): Record<string, string> {
    return {
      ...BASE_HEADERS,
      ...this.defaultHeaders,
      ...(source && this.sourceHeaders?.[source]
        ? this.sourceHeaders[source]
        : {}),
      ...(headers ?? {}),
    };
  }

  async getJson<T = unknown>({
    path,
    source,
    searchParams,
    headers,
  }: FetchOptions): Promise<T> {
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
          this.logFailure({
            source,
            path,
            status: 408,
            attempt,
            message: "Request timed out",
          });
          throw new ApiError("UPSTREAM_ERROR", "Upstream request timed out", {
            cause: serializeError(error),
          });
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

  private logFailure(params: {
    source?: string;
    path: string;
    status?: number;
    attempt: number;
    message: string;
  }) {
    const { source, path, status, attempt, message } = params;
    console.warn(
      `[upstream] source=${source ?? "unknown"} path=${path} status=${status ?? "n/a"} attempt=${
        attempt + 1
      } message=${message}`,
    );
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";

const isClientErrorStatus = (status?: number) =>
  typeof status === "number" && status >= 400 && status < 500;

const shouldRetry = (status?: number) =>
  status === undefined || status === 429 || (status >= 500 && status < 600);

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
    Number(
      pagination?.currentPage ??
        pagination?.page ??
        pagination?.current_page ??
        1,
    ) || 1;
  const nextPageValue =
    pagination?.nextPage ??
    pagination?.next_page ??
    pagination?.next ??
    pagination?.page_next;
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
    nextPage:
      nextPageValue != null
        ? Number(nextPageValue)
        : hasNextPage
          ? currentPage + 1
          : null,
    hasNextPage,
    totalPages: totalPages != null ? Number(totalPages) : null,
  };
};

// --- extractDirectStream security helpers ----------------------------------
//
// The previous implementation gated server-side scraping on raw substring
// checks (`embedUrl.includes("desustream.net") || embedUrl.includes("odcdn")`),
// which any URL satisfies (e.g. "https://evil.com/?x=desustream.net" or
// "https://desustream.net@evil.com/"), silently followed up to 20 redirects,
// and returned URLs scraped from the response HTML without any validation.

// "odcdn" in the legacy check was shorthand for the direct-file CDN documented
// in README.md ("cdn.odcloud.net/anime/...mp4"); "odcdn" itself is not a real
// domain (it is not even a substring of "cdn.odcloud.net").
const STREAM_EMBED_DOMAINS: readonly string[] = ["desustream.net", "odcloud.net"];

const EMBED_MAX_REDIRECTS = 3;
const EMBED_MAX_RESPONSE_BYTES = 1_000_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
// Overall wall-clock budget for one extractDirectStream call: DNS resolution,
// every redirect hop and response-body reading all draw from this deadline,
// so no single stage can hang the request indefinitely.
const EMBED_DEADLINE_MS = 3500;

// `videoURL = "..."` player variable. \b keeps lookalikes such as
// "embedVideoURL"/"dataVideoURL" from matching.
const VIDEO_URL_PATTERN = /\bvideoURL\s*=\s*["']([^"']+)["']/i;
// <source src="..."> with any attribute order; `\ssrc` (whitespace directly
// before the attribute) keeps data-src lookalikes from matching.
const SOURCE_SRC_PATTERN = /<source\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/i;
// Scraped values must point at a media file (.mp4/.m3u8, matching the media
// pattern used across the codebase) — not just any extractable string.
const MEDIA_FILE_PATTERN = /\.(?:mp4|m3u8)(?:[?#].*)?$/i;

// Apex or any subdomain of the two intended providers.
const isAllowedEmbedHost = (hostname: string): boolean =>
  STREAM_EMBED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );

const isLocalHostname = (hostname: string): boolean =>
  hostname === "localhost" || hostname.endsWith(".localhost");

const isNonPublicIPv4 = (address: string): boolean => {
  const octets = address.split(".").map((part) => Number(part));
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return true; // malformed — fail closed
  }
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127) return true; // this-network / private / loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true; // link-local (cloud metadata lives here)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF / TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return true; // retired 6to4 relay
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  return a >= 224; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved incl. broadcast
};

// Exported for security regression tests only.
export const isNonPublicIPv6 = (address: string): boolean => {
  const halves = address.toLowerCase().split("::");
  if (halves.length > 2) return true; // malformed — fail closed
  const parseSide = (side: string): number[] | null => {
    if (side === "") return [];
    const groups: number[] = [];
    for (const piece of side.split(":")) {
      if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(piece)) {
        // embedded IPv4 tail, e.g. ::ffff:10.0.0.1
        const o = piece.split(".").map(Number);
        if (o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
        groups.push((o[0] << 8) | o[1], (o[2] << 8) | o[3]);
      } else if (/^[0-9a-f]{1,4}$/.test(piece)) {
        groups.push(parseInt(piece, 16));
      } else {
        return null; // malformed — fail closed
      }
    }
    return groups;
  };
  const left = parseSide(halves[0]);
  const right = halves.length === 2 ? parseSide(halves[1]) : [];
  if (!left || !right) return true;
  let groups: number[];
  if (halves.length === 2) {
    // "::" compression: the omitted zero groups sit BETWEEN the two halves.
    // Appending them at the end would decode a completely different address
    // (e.g. "::1" must be 0:0:0:0:0:0:0:1, not 1:0:0:0:0:0:0:0).
    if (left.length + right.length > 7) return true; // "::" must stand for >= 1 group
    groups = [
      ...left,
      ...new Array<number>(8 - left.length - right.length).fill(0),
      ...right,
    ];
  } else {
    if (left.length !== 8) return true;
    groups = left;
  }

  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  // IPv4-mapped ::ffff:0:0/96 — a dual-stack connect to ::ffff:a.b.c.d
  // reaches that IPv4 destination, so judge by the embedded address.
  if (
    g0 === 0 &&
    g1 === 0 &&
    g2 === 0 &&
    g3 === 0 &&
    g4 === 0 &&
    g5 === 0xffff
  ) {
    return isNonPublicIPv4(`${g6 >> 8}.${g6 & 0xff}.${g7 >> 8}.${g7 & 0xff}`);
  }
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    // ::/96 — unspecified ::, loopback ::1 and the deprecated IPv4-compatible
    // forms (::a.b.c.d) are never legitimate public destinations.
    return true;
  }
  if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g0 & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (g0 === 0x0100 && g1 === 0 && g2 === 0 && g3 === 0) return true; // 100::/64 discard
  if (g0 === 0x2001 && g1 === 0x0db8) return true; // documentation
  if (g0 === 0x2001 && g1 === 0) return true; // 2001::/32 teredo
  if (g0 === 0x2002) return true; // 2002::/16 6to4
  if (
    g0 === 0x0064 &&
    g1 === 0xff9b &&
    g2 === 0 &&
    g3 === 0 &&
    g4 === 0 &&
    g5 === 0
  ) {
    return true; // 64:ff9b::/96 NAT64
  }
  return false;
};

const isNonPublicLiteralHost = (hostname: string): boolean => {
  if (isLocalHostname(hostname)) return true;
  if (hostname.includes(":")) return isNonPublicIPv6(hostname);
  // WHATWG URL parsing has already normalized exotic IPv4 spellings
  // (0x7f.1, 2130706433, octal) to dotted form, so this check is exhaustive.
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return isNonPublicIPv4(hostname);
  return false;
};

const isNonPublicAddress = (address: string, family: number): boolean =>
  family === 6 ? isNonPublicIPv6(address) : isNonPublicIPv4(address);

// WHATWG URL keeps brackets on IPv6 literals (hostname "[::1]") — strip them
// so the address itself is classified instead of being rejected as malformed.
const normalizedHost = (hostname: string): string =>
  hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;

// Resolve a hostname and validate EVERY returned address. Rejects on
// resolution failure, an empty answer, or ANY non-public record (one private
// record in a mixed answer is enough to refuse — fail closed).
//
// HONEST LIMITATION on the timeout: dns.lookup is getaddrinfo and exposes NO
// cancellation API in Node — AbortSignal-style options are not supported by
// it. The Promise.race below only bounds how long THIS caller waits; the
// underlying resolver operation keeps running until the OS answers and we
// simply abandon its result. This is caller-side bounding, NOT resolver
// cancellation. (The abandoned getaddrinfo cannot connect anywhere by itself;
// only a validated address is ever handed to a socket — see embedConnectLookup.)
const resolveValidatedAddresses = async (
  hostname: string,
  deadline: number,
): Promise<{ address: string; family: number }[]> => {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) {
    throw new Error("DNS resolution deadline exceeded");
  }
  let timeoutHandle: NodeJS.Timeout | undefined;
  try {
    const records = await Promise.race([
      dns.promises.lookup(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error("DNS resolution timed out")),
          remainingMs,
        );
      }),
    ]);
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("DNS returned no addresses");
    }
    const invalid = records.filter(
      (record) =>
        !record.address ||
        isNonPublicAddress(record.address, record.family === undefined && record.address.includes(":") ? 6 : record.family),
    );
    if (invalid.length > 0) {
      throw new Error(`DNS returned non-public address for ${hostname}`);
    }
    return records;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};

// Pre-flight check (fail fast before opening a socket). The authoritative
// enforcement is embedConnectLookup below — it re-resolves and re-validates at
// connect time, so a DNS answer that flips between check and connect cannot
// sneak an unvalidated IP into the connection.
const isPublicDestination = async (
  url: URL,
  deadline: number,
): Promise<boolean> => {
  const hostname = normalizedHost(url.hostname);
  if (isNonPublicLiteralHost(hostname)) return false;
  try {
    await resolveValidatedAddresses(hostname, deadline);
    return true;
  } catch {
    return false;
  }
};

// Undici connect lookup used for every NEW socket the embed agent opens.
// It resolves the hostname fresh and refuses to return any address that is
// not public: validation happens at connect time, so the socket can only ever
// dial a re-validated IP (DNS-rebinding defense). Host header, TLS SNI and
// certificate verification keep using the original hostname — undici derives
// them from the URL, not from this lookup result.
type ConnectLookupCallback = {
  (err: Error | null, addresses: { address: string; family: number }[]): void;
  (err: Error | null, address: string, family: number): void;
};
// Exported for transport regression tests only (unit tests drive both net
// callback shapes directly).
export const embedConnectLookup = (
  hostname: string,
  options: { all?: boolean } | ConnectLookupCallback,
  maybeCallback?: ConnectLookupCallback,
): void => {
  // net/tls may invoke lookup with (hostname, options, callback); some call
  // sites use (hostname, callback).
  const callback =
    typeof options === "function" ? (options as ConnectLookupCallback) : maybeCallback;
  if (typeof callback !== "function") {
    throw new Error("connect lookup invoked without callback");
  }
  const all = typeof options === "object" && options?.all === true;
  resolveValidatedAddresses(hostname, Date.now() + EMBED_DEADLINE_MS)
    .then((records) => {
      if (all) {
        (callback as (
          err: Error | null,
          addresses: { address: string; family: number }[],
        ) => void)(null, records);
      } else {
        (callback as (
          err: Error | null,
          address: string,
          family: number,
        ) => void)(null, records[0].address, records[0].family);
      }
    })
    .catch((error: Error) => {
      (callback as (err: Error | null) => void)(error);
    });
};

// Dedicated agent for embed scraping. Connections are pooled per origin
// (scheme+host+port): a reused socket dials the same validated IP that was
// pinned when it opened, so pooling can never route a request to an
// unvalidated destination. TLS verification stays fully enabled.
const EMBED_AGENT = new Agent({
  connect: { lookup: embedConnectLookup },
  keepAliveTimeout: 1_000,
  keepAliveMaxTimeout: 1_000,
});

// Release an unconsumed response body so the underlying socket is not left
// locked (undici keeps the connection unusable until the body is consumed or
// cancelled).
const discardBody = async (response: Response | null | undefined): Promise<void> => {
  try {
    await response?.body?.cancel();
  } catch {
    // already errored/closed — nothing to release
  }
};

const asPublicHttpUrl = (candidate: string, base?: URL): URL | null => {
  let url: URL;
  try {
    url = new URL(candidate, base);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // "https://desustream.net@evil.com/" parses with hostname evil.com —
  // reject credentials outright so user-info tricks can never reach fetch.
  if (url.username !== "" || url.password !== "") return null;
  // WHATWG URL normalizes an explicit default port to "" — anything else
  // (e.g. :8080) is not a normal public web destination.
  if (url.port !== "") return null;
  return url;
};

// Transport used by fetchWithValidatedRedirects: undici fetch bound to the
// pinned agent, manual redirects (each hop is validated by the caller — no
// automatic following can bypass validation). The undici Response is
// spec-compatible with the global Response; the single cast papers over the
// two type identities.
type EmbedTransport = (url: URL, remainingMs: number) => Promise<Response>;
const defaultEmbedTransport: EmbedTransport = async (url, remainingMs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remainingMs);
  try {
    return (await undiciFetch(url, {
      dispatcher: EMBED_AGENT,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": BASE_HEADERS["User-Agent"],
        Referer: "https://otakudesu.blog/",
      },
    })) as unknown as Response;
  } finally {
    clearTimeout(timer);
  }
};

// Test-only seam: logic tests replace the transport; production code always
// resolves the active transport through here. Tests MUST restore null.
let embedTransportOverride: EmbedTransport | null = null;
export const __setEmbedTransportForTests = (
  transport: EmbedTransport | null,
): void => {
  embedTransportOverride = transport;
};
// Exported for transport regression tests only: real pinned-agent fetch
// (undici + embedConnectLookup), unreachable through extractDirectStream's
// URL gate because tests need explicit localhost ports.
export const __defaultEmbedTransportForTests: EmbedTransport = (url, remainingMs) =>
  defaultEmbedTransport(url, remainingMs);
const embedTransport = (): EmbedTransport =>
  embedTransportOverride ?? defaultEmbedTransport;

const fetchWithValidatedRedirects = async (
  startUrl: URL,
  deadline: number,
): Promise<Response | null> => {
  let currentUrl = startUrl;
  for (let hop = 0; hop <= EMBED_MAX_REDIRECTS; hop += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return null;
    let res: Response;
    try {
      res = await embedTransport()(currentUrl, remainingMs);
    } catch {
      return null;
    }
    if (REDIRECT_STATUSES.has(res.status)) {
      // A redirect status at the last allowed hop, a missing Location, or a
      // target that fails ANY check (parse, scheme, credentials, port,
      // hostname allowlist, public destination) aborts the chain — the body
      // is released on every exit path.
      if (hop >= EMBED_MAX_REDIRECTS) {
        await discardBody(res);
        return null;
      }
      const location = res.headers.get("location");
      if (!location) {
        await discardBody(res);
        return null;
      }
      const nextUrl = asPublicHttpUrl(location, currentUrl);
      if (
        !nextUrl ||
        !isAllowedEmbedHost(nextUrl.hostname) ||
        !(await isPublicDestination(nextUrl, deadline))
      ) {
        await discardBody(res);
        return null;
      }
      await discardBody(res);
      currentUrl = nextUrl;
      continue;
    }
    if (!res.ok) {
      await discardBody(res);
      return null;
    }
    return res;
  }
  return null;
};

const readEmbedBodyText = async (
  response: Response,
  deadline: number,
): Promise<string> => {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > EMBED_MAX_RESPONSE_BYTES) {
    await discardBody(response); // never start reading an oversized body
    return "";
  }
  const reader = response.body?.getReader();
  if (!reader) {
    await discardBody(response); // body unreadable — release it anyway
    return "";
  }
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  try {
    for (;;) {
      // Body reads draw from the same deadline as the fetch itself — a
      // slow-drip response cannot outlive the overall request budget.
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) return "";
      let guardTimer: NodeJS.Timeout | undefined;
      try {
        const { done, value } = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            guardTimer = setTimeout(
              () => reject(new Error("Response body read timed out")),
              remainingMs,
            );
          }),
        ]);
        if (done) break;
        received += value.byteLength;
        if (received > EMBED_MAX_RESPONSE_BYTES) return "";
        text += decoder.decode(value, { stream: true });
      } finally {
        if (guardTimer) clearTimeout(guardTimer);
      }
    }
  } catch {
    return ""; // timed out or stream error — degrade to embed fallback
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return `${text}${decoder.decode()}`;
};

const toSafeDirectUrl = async (
  candidate: string,
  baseUrl: URL,
  deadline: number,
): Promise<string | null> => {
  const url = asPublicHttpUrl(candidate.trim(), baseUrl);
  // Reject malformed/non-media scrapes (javascript:, plain text, HTML pages):
  // only .mp4/.m3u8 paths, matching the codebase-wide media pattern.
  if (!url || !MEDIA_FILE_PATTERN.test(url.pathname + url.search)) {
    return null;
  }
  if (!(await isPublicDestination(url, deadline))) {
    return null;
  }
  return url.toString();
};

export const extractDirectStream = async (
  embedUrl: string | null,
): Promise<string | null> => {
  if (!embedUrl || typeof embedUrl !== "string") {
    return null;
  }

  const deadline = Date.now() + EMBED_DEADLINE_MS;
  const url = asPublicHttpUrl(embedUrl.trim());
  if (!url || !(await isPublicDestination(url, deadline))) {
    return null;
  }

  // Already a direct media link — any provider's public CDN passes through
  // untouched (kuramanime/oploverz included); no scraping is involved.
  if (/\.(?:mp4|m3u8)(?:\?.*)?$/i.test(url.pathname + url.search)) {
    return url.toString();
  }

  // Server-side scraping is restricted to a strict hostname allowlist of the
  // intended embed providers (apex or subdomain); substring tricks no longer
  // reach fetch.
  if (!isAllowedEmbedHost(url.hostname)) {
    return null;
  }

  try {
    const response = await fetchWithValidatedRedirects(url, deadline);
    if (!response || !response.ok) {
      return null;
    }
    const text = await readEmbedBodyText(response, deadline);
    const match = text.match(VIDEO_URL_PATTERN);
    if (match?.[1]) {
      return await toSafeDirectUrl(match[1], url, deadline);
    }
    const srcMatch = text.match(SOURCE_SRC_PATTERN);
    if (srcMatch?.[1]) {
      return await toSafeDirectUrl(srcMatch[1], url, deadline);
    }
    return null;
  } catch {
    // Network/timeout/parsing failures degrade to the embed player upstream.
    return null;
  }
};

export const normalizeOngoing = (
  upstream: any,
): OngoingAnimeResponse & { raw?: unknown } => {
  const list =
    upstream?.data?.latestRelease?.animeList ??
    upstream?.data?.popularToday?.animeList ??
    upstream?.data?.animeList ??
    // kuramanime's status=ongoing directory returns episode cards instead
    upstream?.data?.episodeList ??
    upstream?.animeList ??
    upstream?.data ??
    upstream?.results ??
    [];

  const items = Array.isArray(list)
    ? list.map((item: any) => {
        const itemSlug = item?.animeSlug ?? item?.slug;
        const itemId = item?.animeId ?? item?.id;
        const combinedId = itemSlug && itemId ? `${itemId}|${itemSlug}` : null;
        const id =
          combinedId ||
          itemSlug ||
          itemId ||
          item?.animeId ||
          item?.anime_id ||
          item?.linkId ||
          (item?.title ? slugify(item.title) : undefined) ||
          "";
        return {
          id,
          title: item?.title || item?.name || "Untitled",
          poster: item?.poster || item?.thumbnail || item?.image || null,
          episodes:
            item?.episodes ?? item?.episode ?? item?.last_episode ?? null,
          latestReleaseDate:
            item?.latestReleaseDate ??
            item?.releaseDate ??
            item?.uploadedOn ??
            null,
          releaseDay: item?.releaseDay ?? item?.day ?? null,
          score: item?.score ?? item?.highlight ?? item?.rating ?? null,
          type: item?.type?.title ?? item?.type ?? null,
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

export const normalizeAnimeDetail = (
  upstream: any,
  fallbackId?: string,
): AnimeDetail => {
  const data = upstream?.data ?? upstream;
  const details = data?.details ?? data;
  const idFromDetails =
    details?.animeId && details?.animeSlug
      ? `${details.animeId}|${details.animeSlug}`
      : undefined;
  const titleFromDetails = details?.title ?? details?.alternativeTitle;
  const posterFromDetails =
    details?.poster ?? details?.thumbnail ?? details?.image;
  const episodeRange = details?.episode;
  const generatedEpisodes =
    details?.animeId && details?.animeSlug && episodeRange
      ? Array.from(
          {
            length:
              Number(episodeRange.last ?? 0) -
              Number(episodeRange.first ?? 1) +
              1,
          },
          (_, idx) => {
            const num = Number(episodeRange.first ?? 1) + idx;
            return {
              episodeId: `${details.animeId}|${details.animeSlug}|${num}`,
              episodeNumber: num,
              title: `Episode ${num}`,
              releaseDate: null,
            };
          },
        )
      : [];
  const episodesList =
    data?.episodes ||
    data?.episode_list ||
    data?.episodeList ||
    data?.episodes_list ||
    data?.episodesData ||
    details?.episodeList ||
    generatedEpisodes;

  const rawGenres = details?.genreList ?? data?.genres ?? data?.genreList ?? [];
  const genres: string[] = Array.isArray(rawGenres)
    ? rawGenres
        .map((g: any) =>
          typeof g === "string" ? g : g?.title || g?.name || "",
        )
        .filter(Boolean)
    : typeof rawGenres === "string"
      ? rawGenres
          .split(",")
          .map((g: string) => g.trim())
          .filter(Boolean)
      : [];

  const rawRecs =
    details?.recommendedAnimeList ??
    details?.similarAnimeList ??
    data?.recommendations ??
    [];
  const recommendations = Array.isArray(rawRecs)
    ? rawRecs
        .map((r: any) => ({
          animeId: r?.animeId || r?.id || "",
          title: r?.title || "Untitled",
          poster: r?.poster || r?.thumbnail || null,
        }))
        .filter((r: any) => r.animeId)
    : [];

  const idFromUrl =
    details?.otakudesuUrl || details?.kuramanimeUrl || details?.oploverzUrl
      ? (
          details?.otakudesuUrl ||
          details?.kuramanimeUrl ||
          details?.oploverzUrl
        )
          .split("/")
          .filter(Boolean)
          .pop()
      : undefined;

  const payload: AnimeDetail = {
    id:
      idFromDetails ||
      details?.animeId ||
      fallbackId ||
      idFromUrl ||
      data?.id ||
      data?.animeId ||
      data?.slug ||
      (titleFromDetails ? slugify(titleFromDetails) : "") ||
      (data?.title ? slugify(data.title) : "") ||
      "",
    title: titleFromDetails || data?.title || data?.name || "Untitled",
    japaneseTitle:
      details?.japanese ?? details?.alternativeTitle ?? data?.japanese ?? null,
    poster: posterFromDetails || data?.poster || data?.thumbnail || data?.image || null,
    synopsis:
      data?.synopsis ||
      data?.description ||
      (Array.isArray(details?.synopsis?.paragraphList)
        ? details.synopsis.paragraphList.join("\n\n")
        : typeof details?.synopsis === "string"
          ? details.synopsis
          : null),
    genres,
    status:
      details?.status?.title ??
      (typeof details?.status === "string" ? details.status : null) ??
      data?.status ??
      null,
    type:
      details?.type?.title ??
      (typeof details?.type === "string" ? details.type : null) ??
      data?.type ??
      null,
    duration: details?.duration ?? data?.duration ?? null,
    aired: details?.aired ?? data?.aired ?? null,
    score: details?.score ?? details?.rating ?? data?.score ?? null,
    studio:
      details?.studios ??
      (Array.isArray(details?.studioList)
        ? details.studioList[0]?.title
        : null) ??
      data?.studios ??
      null,
    episodes: Array.isArray(episodesList)
      ? episodesList.map((ep: any) => ({
          episodeId:
            ep?.episodeId ||
            ep?.id ||
            ep?.slug ||
            (ep?.href ? ep.href.split("/").filter(Boolean).pop() : ""),
          episodeNumber:
            ep?.episodeNumber ?? ep?.number ?? ep?.episode ?? ep?.eps ?? null,
          title: ep?.title ?? ep?.name ?? null,
          releaseDate: ep?.releaseDate ?? ep?.aired ?? ep?.uploadedOn ?? null,
        }))
      : [],
    recommendations,
  };

  if (!isProduction) {
    payload.raw = upstream;
  }

  return payload;
};

export const normalizeEpisodeDetail = async (
  upstream: any,
  fallbackEpisodeId?: string,
): Promise<EpisodeDetail> => {
  const data = upstream?.data ?? upstream;
  const details = data?.details ?? data;

  const otakudesuDownloads = Array.isArray(details?.download?.qualityList)
    ? details.download.qualityList.flatMap((q: any) =>
        (q?.urlList ?? []).map((u: any) => ({
          quality: q?.title ?? null,
          provider: u?.title ?? null,
          url: u?.url ?? null,
          size: q?.size ?? null,
        })),
      )
    : [];

  const genericDownloads =
    data?.downloads ?? data?.download ?? data?.links ?? [];

  const oploverzDownloads = Array.isArray(details?.download)
    ? details.download.flatMap((format: any) =>
        (format?.qualityList ?? []).flatMap((quality: any) =>
          (quality?.urlList ?? []).map((url: any) => ({
            quality: quality?.title ?? format?.title ?? null,
            provider: url?.title ?? null,
            url: url?.url ?? null,
            size: null,
          })),
        ),
      )
    : [];

  const genericMappedDownloads = Array.isArray(genericDownloads)
    ? genericDownloads.map((dl: any) => ({
        quality: dl?.quality ?? dl?.title ?? dl?.resolution ?? null,
        provider: dl?.provider ?? dl?.server ?? dl?.title ?? null,
        url: dl?.url ?? dl?.link ?? null,
        size: dl?.size ?? null,
      }))
    : [];

  // Original priority restored from the working backend: data-level
  // downloads first, source-specific quality lists as fallbacks.
  const allDownloads =
    genericMappedDownloads.length > 0
      ? genericMappedDownloads
      : otakudesuDownloads.length > 0
        ? otakudesuDownloads
        : oploverzDownloads.length > 0
          ? oploverzDownloads
          : [];

  const rawStreamingUrl =
    details?.defaultStreamingUrl ??
    details?.streaming?.url ??
    details?.streamLink ??
    details?.streamingUrl ??
    details?.server?.qualityList?.[0]?.urlList?.[0]?.url ??
    null;

  let directUrl =
    rawStreamingUrl && /\.(mp4|m3u8)(\?.*)?$/i.test(rawStreamingUrl)
      ? rawStreamingUrl
      : null;

  if (!directUrl && rawStreamingUrl) {
    directUrl = await extractDirectStream(rawStreamingUrl);
  }

  const format: "mp4" | "hls" | "embed" | "unknown" = directUrl
    ? directUrl.includes(".m3u8")
      ? "hls"
      : "mp4"
    : rawStreamingUrl
      ? "embed"
      : "unknown";

  const rawServers =
    details?.server?.qualityList ?? data?.server?.qualityList ?? [];
  const normalizedServers = Array.isArray(rawServers)
    ? rawServers
        .map((q: any) => ({
          quality: String(q?.title || "Default").trim(),
          serverList: Array.isArray(q?.serverList)
            ? q.serverList.map((s: any) => ({
                serverId: String(s?.serverId || s?.id || ""),
                title: String(s?.title || s?.name || "Server").trim(),
                url: s?.url ?? null,
              }))
            : [],
        }))
        .filter((q: any) => q.serverList.length > 0)
    : [];

  const normalizeEpRef = (ep: any) => {
    if (!ep) return null;
    if (typeof ep === "string") return { episodeId: ep, title: null };
    const epId =
      ep?.animeId && ep?.animeSlug && ep?.episodeId
        ? `${ep.animeId}|${ep.animeSlug}|${ep.episodeId}`
        : ep?.episodeId || ep?.id || ep?.slug || "";
    if (!epId) return null;
    return {
      episodeId: epId,
      title: ep?.title ?? ep?.name ?? null,
    };
  };

  const rawEpList =
    details?.info?.episodeList ?? details?.episodeList ?? data?.episodes ?? [];
  const episodeList = Array.isArray(rawEpList)
    ? rawEpList
        .map((ep: any) => ({
          episodeId: ep?.episodeId || ep?.id || ep?.slug || "",
          title: ep?.title || ep?.name || null,
          episodeNumber: ep?.episodeNumber ?? ep?.number ?? ep?.title ?? null,
          releaseDate: ep?.releaseDate ?? ep?.uploadedOn ?? null,
        }))
        .filter((ep: any) => ep.episodeId)
    : [];

  const payload: EpisodeDetail = {
    episodeId:
      details?.episodeId ||
      fallbackEpisodeId ||
      details?.id ||
      details?.slug ||
      "",
    animeId: details?.animeId || data?.animeId || null,
    title: details?.episodeTitle || details?.title || details?.name || null,
    streaming: {
      url: rawStreamingUrl,
      directUrl,
      isDirect: Boolean(directUrl),
      format,
    },
    server: normalizedServers,
    downloads: allDownloads,
    hasPrevEpisode: Boolean(details?.hasPrevEpisode || details?.prevEpisode),
    hasNextEpisode: Boolean(details?.hasNextEpisode || details?.nextEpisode),
    prevEpisode: normalizeEpRef(details?.prevEpisode),
    nextEpisode: normalizeEpRef(details?.nextEpisode),
    episodeList,
  };

  if (!isProduction) {
    payload.raw = upstream;
  }

  return payload;
};

const WEEK_DAYS: { id: string; label: string }[] = [
  { id: "monday", label: "Senin" },
  { id: "tuesday", label: "Selasa" },
  { id: "wednesday", label: "Rabu" },
  { id: "thursday", label: "Kamis" },
  { id: "friday", label: "Jumat" },
  { id: "saturday", label: "Sabtu" },
  { id: "sunday", label: "Minggu" },
];

const DAY_SLUG_MAP: Record<string, string> = {
  senin: "monday",
  selasa: "tuesday",
  rabu: "wednesday",
  kamis: "thursday",
  jumat: "friday",
  sabtu: "saturday",
  minggu: "sunday",
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday",
};

const slugifyDay = (value: unknown): string =>
  DAY_SLUG_MAP[String(value ?? "").trim().toLowerCase()] ??
  slugify(String(value ?? ""));

const extractClockTime = (value: unknown): string | null => {
  const match = String(value ?? "").match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : null;
};

// Schedule payloads differ per upstream source (otakudesu: day groups with
// title-only items; kuramanime: single-day list with poster + releaseTime;
// oploverz: day groups with poster + clock time + episode). Detection is by
// payload shape so upstream failover still normalizes correctly.
export const normalizeSchedule = (
  upstream: any,
  activeDay: string,
): ScheduleResponse => {
  const data = upstream?.data ?? upstream;
  const scheduleList = Array.isArray(data?.scheduleList)
    ? data.scheduleList
    : null;

  if (scheduleList && scheduleList[0]?.day !== undefined) {
    // oploverz shape
    const byDay = new Map<string, ScheduleItem[]>();
    for (const group of scheduleList) {
      const id = slugifyDay(group?.day);
      if (!id) continue;
      byDay.set(
        id,
        (Array.isArray(group.animeList) ? group.animeList : []).map(
          (item: any) => ({
            id: item?.slug || item?.animeId || item?.id || "",
            title: item?.title || "Untitled",
            poster: item?.poster || item?.thumbnail || null,
            releaseTime: extractClockTime(item?.status),
            episode: item?.episode ?? null,
            type: null,
            quality: null,
          }),
        ),
      );
    }
    return {
      activeDay: byDay.has(activeDay) ? activeDay : (WEEK_DAYS[0]?.id ?? activeDay),
      days: WEEK_DAYS.map((d) => ({ ...d, animeList: byDay.get(d.id) ?? [] })),
    };
  }

  if (scheduleList) {
    // otakudesu shape
    const byDay = new Map<string, { label: string; items: ScheduleItem[] }>();
    for (const group of scheduleList) {
      const id = slugifyDay(group?.title);
      if (!id) continue;
      byDay.set(id, {
        label: String(group?.title ?? id),
        items: (Array.isArray(group.animeList) ? group.animeList : []).map(
          (item: any) => ({
            id: item?.animeId || item?.id || "",
            title: item?.title || "Untitled",
            poster: null,
            releaseTime: null,
            episode: null,
            type: null,
            quality: null,
          }),
        ),
      });
    }
    const days = Array.from(byDay.entries()).map(([id, value]) => ({
      id,
      label: value.label,
      animeList: value.items,
    }));
    return {
      activeDay: byDay.has(activeDay)
        ? activeDay
        : (days[0]?.id ?? activeDay),
      days,
      note:
        "Jadwal dari otakudesu tidak menyertakan poster atau jam rilis di upstream.",
    };
  }

  // kuramanime shape: single-day list for the requested day
  const items: ScheduleItem[] = (
    Array.isArray(data?.animeList) ? data.animeList : []
  ).map((item: any) => {
    const itemId = item?.animeId;
    const itemSlug = item?.animeSlug ?? item?.slug;
    const combinedId =
      itemId && itemSlug ? `${itemId}|${itemSlug}` : itemSlug || itemId || "";
    return {
      id: combinedId,
      title: item?.title || "Untitled",
      poster: item?.poster || item?.thumbnail || null,
      releaseTime: item?.releaseTime ? String(item.releaseTime) : null,
      episode: item?.episode ?? null,
      type: item?.type ?? null,
      quality: item?.quality ?? null,
    };
  });
  return {
    activeDay,
    days: WEEK_DAYS.map((d) => ({
      ...d,
      animeList: d.id === activeDay ? items : [],
    })),
  };
};

// otakudesu directory listings label the episode column "Eps" and often leave
// score as an empty string — clean those before returning to the frontend.
export const cleanupBrowseItems = (
  response: OngoingAnimeResponse,
): OngoingAnimeResponse => {
  const items: OngoingAnimeItem[] = (response.items ?? []).map((item) => ({
    ...item,
    episodes: /^\d+$/.test(String(item.episodes ?? "").trim())
      ? item.episodes
      : null,
    score:
      item.score === "" || item.score === undefined || item.score === null
        ? null
        : item.score,
  }));
  return { ...response, items };
};
