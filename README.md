<<<<<<< HEAD
# ANIME-STREAM
NONTON ANIME BERBASIS SUBTITLE BAHASA INDONESIA DENGAN MENGGUNAKAN REST API 
=======
# Nonton Anime Monorepo

Anime streaming & download web app (sub Indo) with an Express BFF in front of [`wajik45/wajik-anime-api`](https://github.com/wajik45/wajik-anime-api) and a Next.js App Router frontend.

## Monorepo layout
- `apps/api` - Express BFF (TypeScript) that calls the upstream anime API, normalizes responses, caches, validates, and rate-limits.
- `apps/web` - Next.js App Router frontend (TypeScript + Tailwind) that only talks to the BFF.

## Prerequisites
- Node.js 18+
- npm (or pnpm/yarn if you prefer)

## Upstream API (port 3001)
1. Clone and start the upstream service:
   ```bash
   git clone https://github.com/wajik45/wajik-anime-api.git
   cd wajik-anime-api
   npm install
   npm run dev # serves on http://localhost:3001
   ```
2. Keep it running while using this project.

## Backend BFF (apps/api, port 3002)
1. From repo root, copy env:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
   Adjust `UPSTREAM_API_BASE_URL` if the upstream URL differs.
2. Install deps and start dev server:
   ```bash
   npm install
   npm run dev --workspace apps/api
   ```
3. API base path: `http://localhost:3002/api/v1`
   - `GET /:source/ongoing?page=1`
   - `GET /:source/search?q=naruto&page=1`
   - `GET /:source/anime/:animeId`
   - `GET /:source/episode/:episodeId`
   - Health: `GET /api/v1/health`
   - Diagnose: `GET /api/v1/:source/diagnose`
4. Useful env (in `apps/api/.env`):
   - `UPSTREAM_TIMEOUT_MS` (default 10000)
   - `UPSTREAM_DEFAULT_HEADERS_JSON` for browser-like headers
   - `UPSTREAM_SOURCE_HEADERS_JSON` for per-source overrides
   - `FALLBACK_SOURCE_ON_FORBIDDEN` to auto-fallback when a source 403s

## Frontend (apps/web, port 3000)
1. Copy env:
   ```bash
   cp apps/web/.env.example apps/web/.env
   ```
   Ensure `NEXT_PUBLIC_API_BASE_URL` points to the BFF (default http://localhost:3002/api/v1).
2. Start dev server:
   ```bash
   npm install
   npm run dev --workspace apps/web
   ```
3. Visit `http://localhost:3000`.

## Root workflows
- `npm run dev` - start BFF and web concurrently.
- `npm run build` - build both apps.

## Notes
- Caching: in-memory (default TTL 60s) with rate limiting via `express-rate-limit`.
- Validation: Zod for params/query. Error responses follow `{ error: { code, message, details } }`.
- Frontend uses server components by default; client components only for search/source switching.

## Troubleshooting: otakudesu returns 403
If a source (e.g. otakudesu) blocks non-browser requests (HTTP 403):
1. Test upstream directly: `http://localhost:3001/otakudesu/ongoing?page=1`.
2. Set browser-like headers in `apps/api/.env` using `UPSTREAM_DEFAULT_HEADERS_JSON` (and optional per-source `UPSTREAM_SOURCE_HEADERS_JSON`), then restart the BFF.
3. Optionally enable fallback: `FALLBACK_SOURCE_ON_FORBIDDEN=kuramanime` to auto-serve data from `kuramanime` when another source is blocked. Responses will include `meta.fallbackUsed`.
4. Use diagnostics: `GET http://localhost:3002/api/v1/otakudesu/diagnose` to check upstream status and suggestions.
5. Health check: `GET http://localhost:3002/api/v1/health` shows uptime and upstream base URL.
>>>>>>> 70c553c (first commit)
