import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { UpstreamClient, normalizeAnimeDetail, normalizeEpisodeDetail, normalizeOngoing } from "../lib/upstreamClient.js";
import { ApiError, formatError } from "../lib/errors.js";
import { cache } from "../lib/cache.js";
import { cacheMiddleware } from "../middleware/cache.js";
import type { ResponseMeta } from "../types/api.js";

const router = Router();
const upstream = new UpstreamClient();
const fallbackSourceEnv = process.env.FALLBACK_SOURCE_ON_FORBIDDEN;
const fallbackSourceParse = z.enum(["otakudesu", "kuramanime", "oploverz"]).safeParse(fallbackSourceEnv);
const fallbackSource = fallbackSourceParse.success ? fallbackSourceParse.data : undefined;

const sourceSchema = z.enum(["otakudesu", "kuramanime", "oploverz"], {
  required_error: "source is required",
});
const pageSchema = z.coerce.number().int().positive().default(1);
const querySchema = z.string().min(1, "q is required");
const animeIdSchema = z.string().min(1, "animeId is required");
const episodeIdSchema = z.string().min(1, "episodeId is required");

const respond = (res: Response, payload: unknown) => {
  const cacheKey = (res.locals as any).cacheKey as string | undefined;
  if (cacheKey) {
    cache.set(cacheKey, payload);
  }
  return res.json(payload);
};

router.get("/health", (_req, res) =>
  res.json({
    ok: true,
    uptime: process.uptime(),
    upstreamBaseUrl: upstream.getBaseUrl(),
  })
);

router.get("/:source/diagnose", async (req: Request, res: Response) => {
  try {
    const source = sourceSchema.parse(req.params.source);
    const diagnosis = await runDiagnosis(source);
    return res.json(diagnosis);
  } catch (err) {
    const payload = formatError(handleError(err, req.params.source));
    return res.status(mapStatus(payload.error.code)).json(payload);
  }
});

router.get("/kuramanime/routes", async (_req: Request, res: Response) => {
  try {
    const data = await upstream.getJson<any>({ path: "/kuramanime" });
    return res.json(data?.data?.routes ?? data);
  } catch (err) {
    const payload = formatError(handleError(err, "kuramanime"));
    return res.status(mapStatus(payload.error.code)).json(payload);
  }
});

router.get("/:source/ongoing", cacheMiddleware, async (req: Request, res: Response) => {
  try {
    const source = sourceSchema.parse(req.params.source);
    const page = pageSchema.parse(req.query.page ?? 1);

    const normalized = await withFallback(
      source,
      (src) =>
        upstream.getJson<any>({
          path: src === "oploverz" ? "/oploverz/home" : `/${src}/ongoing`,
          searchParams: src === "oploverz" ? undefined : { page },
          source: src,
        }),
      normalizeOngoing
    );
    return respond(res, normalized);
  } catch (err) {
    const payload = formatError(handleError(err, req.params.source));
    return res.status(mapStatus(payload.error.code)).json(payload);
  }
});

router.get("/:source/search", cacheMiddleware, async (req: Request, res: Response) => {
  try {
    const source = sourceSchema.parse(req.params.source);
    const page = pageSchema.parse(req.query.page ?? 1);
    const q = querySchema.parse(req.query.q);

    const normalized = await withFallback(
      source,
      (src) =>
        upstream.getJson<any>({
          path: src === "kuramanime" ? `/${src}/anime` : `/${src}/search`,
          searchParams: src === "kuramanime" ? { search: q, page } : { q, page },
          source: src,
        }),
      normalizeOngoing
    );
    return respond(res, normalized);
  } catch (err) {
    const payload = formatError(handleError(err, req.params.source));
    return res.status(mapStatus(payload.error.code)).json(payload);
  }
});

router.get("/:source/anime/:animeId", cacheMiddleware, async (req: Request, res: Response) => {
  const source = sourceSchema.parse(req.params.source);
  const animeIdRaw = animeIdSchema.parse(req.params.animeId);
  const { animeId, animeSlug } = normalizeKuramanimeComposite(animeIdRaw, source);
  const upstreamPath =
    source === "kuramanime"
      ? `/${source}/anime/${animeId}/${animeSlug}`
      : source === "oploverz"
        ? `/${source}/anime/${animeIdRaw}`
      : `/${source}/anime/${animeId}`;

  try {
    console.info(`[api] anime detail request source=${source} raw=${animeIdRaw} normalized=${animeId}`);

    const normalized = await withFallback(
      source,
      (src) =>
        upstream.getJson<any>({
          path:
            src === "kuramanime"
              ? `/${src}/anime/${animeId}/${animeSlug}`
              : `/${src}/anime/${animeId}`,
          source: src,
        }),
      normalizeAnimeDetail
    );
    return respond(res, normalized);
  } catch (err) {
    const payload = formatError(
      handleError(err, req.params.source, {
        animeId,
        originalAnimeId: animeIdRaw,
        upstreamPath,
      })
    );
    if (payload.error.code === "NOT_FOUND") {
      console.warn(
        `[api] anime not found source=${source} raw=${animeIdRaw} normalized=${animeId} upstreamPath=${upstreamPath}`
      );
    }
    return res.status(mapStatus(payload.error.code)).json(payload);
  }
});

router.get("/:source/episode/:episodeId", cacheMiddleware, async (req: Request, res: Response) => {
  try {
    const source = sourceSchema.parse(req.params.source);
    const episodeIdRaw = episodeIdSchema.parse(req.params.episodeId);
    const { animeId, animeSlug, episodeId } = normalizeKuramanimeEpisodeComposite(episodeIdRaw, source);

    const normalized = await withFallback(
      source,
      (src) =>
        upstream.getJson<any>({
          path:
            src === "kuramanime"
              ? `/${src}/episode/${animeId}/${animeSlug}/${episodeId}`
              : src === "oploverz"
                ? `/${src}/episode/${episodeIdRaw}`
              : `/${src}/episode/${episodeId}`,
          source: src,
        }),
      normalizeEpisodeDetail
    );
    return respond(res, normalized);
  } catch (err) {
    const payload = formatError(handleError(err, req.params.source));
    return res.status(mapStatus(payload.error.code)).json(payload);
  }
});

const handleError = (
  err: unknown,
  source?: string,
  ctx?: { animeId?: string; originalAnimeId?: string; upstreamPath?: string }
) => {
  if (err instanceof z.ZodError) {
    return new ApiError("BAD_REQUEST", "Invalid request parameters", { issues: err.issues });
  }
  if (err instanceof ApiError) {
    if (err.code === "NOT_FOUND" && ctx?.animeId) {
      return new ApiError(
        "NOT_FOUND",
        "Anime not found in upstream. The animeId/slug may be invalid.",
        {
          ...(err.details ?? {}),
          source,
          animeId: ctx.animeId,
          originalAnimeId: ctx.originalAnimeId ?? ctx.animeId,
          upstreamPath: ctx.upstreamPath,
        }
      );
    }
    if (err.code === "UPSTREAM_FORBIDDEN") {
      return new ApiError(
        "UPSTREAM_FORBIDDEN",
        "Upstream blocked this request (403). Try again later, adjust headers, or use another source.",
        {
          ...(err.details ?? {}),
          source,
          upstreamStatus: (err.details as any)?.status ?? 403,
        }
      );
    }
    return err;
  }
  return new ApiError("UPSTREAM_ERROR", "Unexpected error", { cause: err });
};

const mapStatus = (code: string) => {
  if (code === "BAD_REQUEST") return 400;
  if (code === "NOT_FOUND") return 404;
  if (code === "UPSTREAM_FORBIDDEN") return 403;
  return 502;
};

const shouldFallback = (source: string, err: unknown) =>
  Boolean(
    fallbackSource &&
      fallbackSource !== source &&
      err instanceof ApiError &&
      err.code === "UPSTREAM_FORBIDDEN"
  );

const buildMeta = (source: string, actualSource: string): ResponseMeta => ({
  fallbackUsed: true,
  originalSource: source,
  actualSource,
});

const withFallback = async <Raw, Normalized extends { meta?: ResponseMeta }>(
  source: string,
  fetcher: (sourceOverride?: string) => Promise<Raw>,
  normalizer: (raw: Raw) => Normalized
): Promise<Normalized> => {
  try {
    const raw = await fetcher(source);
    return normalizer(raw);
  } catch (err) {
    if (shouldFallback(source, err) && fallbackSource) {
      try {
        const raw = await fetcher(fallbackSource);
        const normalized = normalizer(raw);
        return { ...normalized, meta: buildMeta(source, fallbackSource) };
      } catch {
        // swallow fallback errors and return original
      }
    }
    throw err;
  }
};

const runDiagnosis = async (source: string) => {
  try {
    await upstream.getJson({ path: `/${source}/ongoing`, searchParams: { page: 1 }, source });
    return {
      ok: true,
      upstreamStatus: 200,
      forbidden: false,
      upstreamBaseUrl: upstream.getBaseUrl(),
      suggestions: [],
    };
  } catch (err) {
    const handled = handleError(err, source);
    const isForbidden = handled.code === "UPSTREAM_FORBIDDEN";
    return {
      ok: false,
      upstreamStatus: (handled.details as any)?.status ?? null,
      forbidden: isForbidden,
      upstreamBaseUrl: upstream.getBaseUrl(),
      suggestions: buildSuggestions(isForbidden),
      error: formatError(handled).error,
    };
  }
};

const buildSuggestions = (forbidden: boolean) => {
  const suggestions = [
    "Coba set header di UPSTREAM_DEFAULT_HEADERS_JSON lalu restart BFF.",
    "Gunakan endpoint /api/v1/{source}/diagnose untuk cek status.",
  ];
  if (forbidden) {
    suggestions.push("Pertimbangkan mengganti sumber ke kuramanime atau set fallback.");
  }
  return suggestions;
};

const normalizeAnimeId = (value: string) => {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split("/").filter(Boolean);
      const slug = segments[segments.length - 1] ?? trimmed;
      try {
        return decodeURIComponent(slug);
      } catch {
        return slug;
      }
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

const normalizeKuramanimeComposite = (value: string, source: string) => {
  if (source !== "kuramanime") {
    return { animeId: normalizeAnimeId(value), animeSlug: "" };
  }
  const [animeId, animeSlug] = value.split("|");
  return {
    animeId: animeId ?? value,
    animeSlug: animeSlug ?? value,
  };
};

const normalizeKuramanimeEpisodeComposite = (value: string, source: string) => {
  if (source !== "kuramanime") {
    return { animeId: "", animeSlug: "", episodeId: value };
  }
  const [animeId, animeSlug, episodeId] = value.split("|");
  return {
    animeId: animeId ?? "",
    animeSlug: animeSlug ?? "",
    episodeId: episodeId ?? value,
  };
};

export default router;
