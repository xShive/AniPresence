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
  id: int;
  target_status: string;
  num_episodes: int;
  num_volumes: int | null;
  score: int;
}