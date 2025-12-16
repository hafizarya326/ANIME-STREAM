export interface Episode {
  id: string;
  title: string;
  number: number;
  animeId: string;
  downloads: { quality: string; size: string }[];
}

export interface Anime {
  id: string;
  title: string;
  poster: string;
  rating: number;
  status: string;
  type: string;
  studio: string;
  year: number;
  episodes: number;
  synopsis: string;
  genres: string[];
  episodesList: Episode[];
}

export interface Chapter {
  id: string;
  title: string;
  number: number;
  mangaId: string;
  pages: string[];
}

export interface Manga {
  id: string;
  title: string;
  cover: string;
  author: string;
  status: string;
  synopsis: string;
  genres: string[];
  chapters: Chapter[];
}

export type UnifiedAnime = {
  otakudesu: { animeId: string; title: string; poster: string; otakudesuUrl?: string };
  kuramanime?: { animeId: string; title: string; poster?: string };
};
