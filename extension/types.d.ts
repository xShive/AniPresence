// shared types — global, so every .ts file can use them without importing
type AnimeStatus = "watching" | "completed" | "on_hold" | "dropped" | "plan_to_watch";

interface Anime {
  id: number;
  title: string;
  cover: string;
  status: AnimeStatus;
  score: number;
  watched: number;
  num_episodes: number;
  mean: number;
  media_type: string;
}
