const NEKOKUN_BASE_URL = "https://nekokun.my.id";
const KNOWN_STREAMS: Record<string, string> = {
  "grand-blue-season-3|11":
    "https://mega.nz/embed/kqA11R5Z#E03LIFkOAncdFOEAAaHJUJElIi1JYrWd79QLAxPOD3U",
  "liar-game|24":
    "https://mega.nz/embed/3GgyGDrL#EEcliPpUA1budZGxf9_lDGs6VlITwz-mOVcjbCYdeFQ",
  "buchigire-reijou-wa-houfuku|11":
    "https://mega.nz/embed/d2JkjCSC#00RWmueimhnVo8rwNeE7ePdOx3B6wuonqVW4YypxmP8",
  "degarashi-ouji-episodedeg|11":
    "https://mega.nz/embed/u1BRTZQJ#0erDumbs-kf2nBK9GusS7OB_56nlmTLmvCZuOQz5UF4",
  "saikyou-degarashi-ouji-no-anyaku-teii-arasoi|11":
    "https://mega.nz/embed/u1BRTZQJ#0erDumbs-kf2nBK9GusS7OB_56nlmTLmvCZuOQz5UF4",
  "toumei-na-yoru-ni-kakeru|11":
    "https://mega.nz/embed/KgIC2Y5a#ee0z5cXCZQvTkW_Gm2-lbx5MgnrvQXz9_T7rwpLg6gQ",
  "toumei-na-yoru-ni-kakeru-kimi-to-me-ni-mienai-koi-wo-shita|11":
    "https://mega.nz/embed/KgIC2Y5a#ee0z5cXCZQvTkW_Gm2-lbx5MgnrvQXz9_T7rwpLg6gQ",
  "gaikotsu-kishi-sama-tadaima-isekai-e-odekakechuu-season-2|11":
    "https://mega.nz/embed/hAUTQZLI#8FjO_I9gEy0kritXhNuPABNPDCdfSnDUhih6KljUNcM",
  "kuroneko-to-majo-no-kyoushitsu|23":
    "https://mega.nz/embed/bOx3WZaI#apS5j0SG5Dz-AD8t4oM3rKCcNvrC7udRF46q21TFaTk",
  "mushoku-tensei-isekai-ittara-honki-dasu-season-3|12":
    "https://mega.nz/embed/bSpwADoS#NmJbftwZFkOY36WhhAyQU3Vqw44hu1leRCZyRMD3ZbA",
  "mairimashita-iruma-kun-season-4|22":
    "https://mega.nz/embed/fGhlVCRB#p6TsYSxd5DmWizVNR2NXq5SiBf7fl-QkGzREJxnQEjs",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const decodeIframe = (value: string) => {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return decoded.match(/<iframe[^>]+src=["']([^"']+)/i)?.[1] ?? null;
  } catch {
    return null;
  }
};

export const getNekokunEpisode = async (title: string, episode: string) => {
  const episodeNumber = episode.trim();
  const baseSlug = slugify(title);
  const knownStream = KNOWN_STREAMS[`${baseSlug}|${episodeNumber}`];

  if (knownStream) {
    return {
      episodeId: `${baseSlug}-episode-${episodeNumber}`,
      title: `${title} Episode ${episodeNumber}`,
      streaming: { url: knownStream },
      downloads: [],
    };
  }

  const candidates = [
    `${baseSlug}-episode-${episodeNumber}`,
    `${baseSlug}-episode-${episodeNumber}-end`,
  ];

  for (const slug of candidates) {
    const response = await fetch(`${NEKOKUN_BASE_URL}/${slug}/`, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      redirect: "follow",
    });
    if (!response.ok) continue;

    const html = await response.text();
    const values = [...html.matchAll(/<option[^>]+value=["']([^"']+)["']/gi)].map((match) => match[1]);
    const streamUrl = values.map(decodeIframe).find(Boolean);
    if (streamUrl) {
      return {
        episodeId: slug,
        title: `${title} Episode ${episodeNumber}`,
        streaming: { url: streamUrl },
        downloads: [],
      };
    }
  }

  return null;
};
