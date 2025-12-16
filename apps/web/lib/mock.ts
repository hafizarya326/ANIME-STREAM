import type { Anime, Chapter, Episode, Manga } from "./types";

function createDownloads() {
  return [
    { quality: "1080p", size: "800MB" },
    { quality: "720p", size: "500MB" },
    { quality: "480p", size: "300MB" },
  ];
}

function pagePlaceholders(count: number) {
  return Array.from({ length: count }, (_, idx) => `page-${idx}`);
}

const episodesAot: Episode[] = [
  { id: "aot-1", title: "To You, 2000 Years", number: 1, animeId: "aot", downloads: createDownloads() },
  { id: "aot-2", title: "That Day", number: 2, animeId: "aot", downloads: createDownloads() },
  { id: "aot-3", title: "The Night of the Closing Ceremony", number: 3, animeId: "aot", downloads: createDownloads() },
];

const episodesJjk: Episode[] = [
  { id: "jjk-1", title: "Ryomen Sukuna", number: 1, animeId: "jjk", downloads: createDownloads() },
  { id: "jjk-2", title: "For Myself", number: 2, animeId: "jjk", downloads: createDownloads() },
  { id: "jjk-3", title: "Girl of Steel", number: 3, animeId: "jjk", downloads: createDownloads() },
];

const animeData: Anime[] = [
  {
    id: "aot",
    title: "Attack on Titan: The Final Season",
    poster: "https://i.ibb.co/4Yfx7Sq/aot.jpg",
    rating: 9.1,
    status: "Ongoing",
    type: "TV",
    studio: "MAPPA",
    year: 2023,
    episodes: 12,
    synopsis:
      "Umat manusia bertahan hidup di balik tembok untuk melawan Titan. Eren dan teman-temannya berjuang menemukan kebebasan di dunia yang penuh intrik dan perang.",
    genres: ["Action", "Drama", "Mystery"],
    episodesList: episodesAot,
  },
  {
    id: "jjk",
    title: "Jujutsu Kaisen Season 2",
    poster: "https://i.ibb.co/b7wmdsQ/jjk.jpg",
    rating: 8.8,
    status: "Ongoing",
    type: "TV",
    studio: "MAPPA",
    year: 2023,
    episodes: 24,
    synopsis:
      "Yuji Itadori dan para penyihir jujutsu melawan kutukan kuat, mengungkap masa lalu Gojo dan perseteruan mematikan dengan Geto.",
    genres: ["Action", "Supernatural", "Shounen"],
    episodesList: episodesJjk,
  },
  {
    id: "ds",
    title: "Demon Slayer: Swordsmith Village",
    poster: "https://i.ibb.co/vhG8Bpt/demonslayer.jpg",
    rating: 8.7,
    status: "Completed",
    type: "TV",
    studio: "Ufotable",
    year: 2023,
    episodes: 11,
    synopsis:
      "Tanjiro mencari pedang baru di Desa Penempa, menghadapi iblis tingkat atas bersama Nezuko, Mitsuri, dan Muichiro.",
    genres: ["Action", "Adventure", "Historical"],
    episodesList: [
      { id: "ds-1", title: "Someone's Dream", number: 1, animeId: "ds", downloads: createDownloads() },
    ],
  },
];

const mangaChapters: Chapter[] = [
  { id: "op-1090", title: "Gear 5 Awakens", number: 1090, mangaId: "onepiece", pages: pagePlaceholders(6) },
  { id: "op-1091", title: "The New Age", number: 1091, mangaId: "onepiece", pages: pagePlaceholders(6) },
  { id: "op-1092", title: "Straw Hat Clash", number: 1092, mangaId: "onepiece", pages: pagePlaceholders(6) },
];

const mangaData: Manga[] = [
  {
    id: "onepiece",
    title: "One Piece",
    cover: "https://i.ibb.co/HxHCKtv/onepiece.jpg",
    author: "Eiichiro Oda",
    status: "Ongoing",
    synopsis:
      "Monkey D. Luffy berlayar mencari One Piece untuk menjadi Raja Bajak Laut, menghadapi Yonko, Marijoa, dan rahasia abad kekosongan.",
    genres: ["Adventure", "Shounen", "Fantasy"],
    chapters: mangaChapters,
  },
  {
    id: "berserk",
    title: "Berserk",
    cover: "https://i.ibb.co/FbnfB8f/berserk.jpg",
    author: "Kentaro Miura",
    status: "Hiatus",
    synopsis: "Guts menapaki jalan balas dendam di dunia kelam penuh iblis, bersama Dragon Slayer dan Brand of Sacrifice.",
    genres: ["Dark Fantasy", "Action", "Drama"],
    chapters: [
      { id: "berserk-371", title: "Stars on the ground", number: 371, mangaId: "berserk", pages: pagePlaceholders(5) },
    ],
  },
];

export async function getOngoingAnime(): Promise<Anime[]> {
  return animeData.filter((a) => a.status === "Ongoing");
}

export async function getPopularAnime(): Promise<Anime[]> {
  return animeData.slice().sort((a, b) => b.rating - a.rating).slice(0, 4);
}

export async function getAnimeDetail(animeId: string): Promise<Anime> {
  const anime = animeData.find((a) => a.id === animeId);
  if (!anime) throw new Error("Not found");
  return anime;
}

export async function getEpisodeDetail(episodeId: string) {
  const episode = animeData.flatMap((a) => a.episodesList).find((ep) => ep.id === episodeId);
  if (!episode) throw new Error("Not found");
  const anime = animeData.find((a) => a.id === episode.animeId)!;
  const idx = anime.episodesList.findIndex((ep) => ep.id === episodeId);
  const prevEpisodeId = anime.episodesList[idx - 1]?.id ?? null;
  const nextEpisodeId = anime.episodesList[idx + 1]?.id ?? null;
  return { episode, anime, prevEpisodeId, nextEpisodeId };
}

export async function getLatestManga(): Promise<Manga[]> {
  return mangaData;
}

export async function getPopularManga(): Promise<Manga[]> {
  return mangaData.slice().reverse();
}

export async function getMangaDetail(mangaId: string): Promise<Manga> {
  const manga = mangaData.find((m) => m.id === mangaId);
  if (!manga) throw new Error("Not found");
  return manga;
}

export async function getChapterDetail(chapterId: string) {
  const chapter = mangaData.flatMap((m) => m.chapters).find((c) => c.id === chapterId);
  if (!chapter) throw new Error("Not found");
  const manga = mangaData.find((m) => m.id === chapter.mangaId)!;
  const idx = manga.chapters.findIndex((c) => c.id === chapterId);
  const prevChapterId = manga.chapters[idx + 1]?.id ?? null; // descending list
  const nextChapterId = manga.chapters[idx - 1]?.id ?? null;
  return { chapter, manga, prevChapterId, nextChapterId };
}
