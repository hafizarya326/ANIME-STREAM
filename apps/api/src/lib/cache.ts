import NodeCache from "node-cache";

const defaultTtlSeconds = Number(process.env.CACHE_TTL_SECONDS || 60);

export const cache = new NodeCache({
  stdTTL: Number.isFinite(defaultTtlSeconds) ? defaultTtlSeconds : 60,
  checkperiod: 120,
  useClones: false,
});

export const buildCacheKey = (method: string, path: string, query?: Record<string, unknown>) => {
  const q = query ? JSON.stringify(query) : "";
  return `${method}:${path}:${q}`;
};
