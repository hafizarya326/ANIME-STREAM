import {
  getKuramanimeAnimeDetail,
  getOploverzAnimeDetail,
  searchKuramanime,
  searchOploverz,
} from "./api";

const STOP_WORDS = ["sub", "indo", "subtitle", "indonesia", "season", "part", "tv", "movie"];

const cache = new Map<string, string>();

export const normalizeTitle = (value: string) => {
  const lower = value.toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9\s]/g, " ");
  const tokens = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !STOP_WORDS.includes(t));
  return tokens.join(" ").trim();
};

const scoreMatch = (a: string, b: string) => {
  const normA = normalizeTitle(a);
  const normB = normalizeTitle(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const tokensA = new Set(normA.split(" ").filter(Boolean));
  const tokensB = new Set(normB.split(" ").filter(Boolean));
  const overlap = [...tokensA].filter((t) => tokensB.has(t)).length;
  const base = overlap / Math.max(1, Math.min(tokensA.size, tokensB.size));
  const starts = normB.startsWith(normA) || normA.startsWith(normB) ? 0.2 : 0;
  return Math.min(1, base + starts);
};

export const findBestKuramanimeId = async (otakudesuId: string, title: string) => {
  if (cache.has(otakudesuId)) {
    return { kuramanimeId: cache.get(otakudesuId) ?? null, fromCache: true };
  }

  const searchTitle = title || otakudesuId;
  const searchRes = await searchKuramanime(searchTitle, 1);
  const candidates = searchRes.data?.items ?? [];
  let bestId: string | null = null;
  let bestScore = 0;

  candidates.forEach((item) => {
    const score = scoreMatch(title, item.title);
    if (score > bestScore) {
      bestScore = score;
      const rawId = item.animeId ?? item.id ?? "";
      const rawSlug = item.animeSlug ?? item.slug ?? "";
      bestId = rawSlug
        ? `${rawId}|${rawSlug}`
        : rawId.includes("|")
          ? rawId
          : rawId;
    }
  });

  if (bestId && bestScore >= 0.15) {
    cache.set(otakudesuId, bestId);
    return { kuramanimeId: bestId, score: bestScore };
  }

  return { kuramanimeId: null, score: bestScore };
};

export const getCachedKuramanimeDetail = async (kuramanimeId: string) => {
  return getKuramanimeAnimeDetail(kuramanimeId);
};

export const findBestOploverzEpisodeId = async (title: string, episodeNumber: string) => {
  const searchRes = await searchOploverz(title);
  const candidates = searchRes.data?.items ?? [];
  let bestId: string | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreMatch(title, candidate.title);
    const animeSlug = candidate.slug ?? candidate.id;
    if (score <= bestScore || !animeSlug) continue;

    const detail = await getOploverzAnimeDetail(animeSlug);
    if (!detail.data) continue;
    const episode = detail.data.episodes.find(
      (item) => String(item.episodeNumber ?? "") === String(episodeNumber)
    );
    if (episode?.episodeId) {
      bestScore = score;
      bestId = episode.episodeId;
    }
  }

  return bestId;
};
