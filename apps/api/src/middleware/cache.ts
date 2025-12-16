import type { Request, Response, NextFunction } from "express";
import { buildCacheKey, cache } from "../lib/cache.js";

export const cacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "GET") {
    return next();
  }

  const key = buildCacheKey(req.method, req.path, req.query as Record<string, unknown>);
  const cached = cache.get(key);
  if (cached) {
    return res.json(cached);
  }

  (res.locals as any).cacheKey = key;
  return next();
};
