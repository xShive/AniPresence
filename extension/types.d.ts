// shared types: global, so every .ts file can use them without importing
type AnimeStatus = "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";

// Base interface for fields present in animelist dict and mangalist dict
interface BaseMedia {
  id: number | null;
  title: string | null;
  cover: string | null;
  synopsis: string | null;
  rank: number | null;
  mean: number | null;
  media_type: string | null;
  status: string | null;
  score: number | null;
  title_en: string | null;
  title_ja: string | null;
  synonyms: string[];
}
  
// animelist dict type extension
interface Anime extends BaseMedia {
  num_episodes: number | null;
  watched: number | null;
  airing_status: string | null;   // MAL "status": currently_airing / finished_airing / not_yet_aired
  broadcast: {
    day_of_the_week?: string;
    start_time?: string;
  } | null;
}

// manga dict type extension
interface Manga extends BaseMedia {
  num_volumes: number | null;
  num_chapters: number | null;
  volumes_read: number | null;
  chapters_read: number | null;
}

// what /status returns: the live "now watching" snapshot
interface LiveStatus {
  is_watching: boolean;
  is_paused: boolean;
  ghost_mode: boolean;
  title_number: string | null;
  anime_title: string | null;
  episode_line: string | null;
  episode_title: string | null;
  cover: string | null;
}

interface EntryUpdate {
  is_manga: boolean;
  id: number;
  target_status: string;
  progress: number;
  score: number;
}

// the object content.js scrapes off the page and sends to /watching
interface ScrapedData {
  anime_title: string;
  episode_title: string;
  episode: string;
  current_time: string;
  duration: string;
  cover: string;
  paused: boolean;
}

// the message kwik.js sends out of the iframe (and content.js stores)
interface VideoData {
  type: "video_data";
  currentTime: string;
  duration: string;
  paused: boolean;
}

// one site's scraping data
interface SiteConfig {
  watchPathIncludes: string | string[];
  selectors: {
    animeTitle: string;
    episodeTitle: string | null;
    episodeNum: string | null;
    cover: string;
    video: string;
  };
  parseEpisodeTitle?: (raw: string) => string;
  parseEpisodeNumber?: (raw: string) => string;
  parseCoverUrl?: (url: string) => string;
}

// the message content.ts sends to background.js to be fetched
interface FetchMessage {
  type: "fetch";
  url: string;
  method: string;
  headers: Record<string, string>;
  body: ScrapedData | null;
}