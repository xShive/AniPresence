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

type statusType = string;