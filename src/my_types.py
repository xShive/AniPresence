from typing import TypedDict


class BaseMedia(TypedDict):
    id: int | None
    title: str | None
    cover: str | None
    synopsis: str | None
    rank: int | None
    mean: float | None
    media_type: str | None
    status: str | None
    score: int | None
    title_en: str | None
    title_ja: str | None
    synonyms: list[str]
    tags: list[str] | None


class Broadcast(TypedDict, total=False):
    day_of_the_week: str
    start_time: str


class Anime(BaseMedia):
    num_episodes: int | None
    watched: int | None
    is_rewatching: bool | None
    num_times_rewatched: int | None
    airing_status: str | None
    broadcast: Broadcast | None


class Manga(BaseMedia):
    num_volumes: int | None
    num_chapters: int | None
    volumes_read: int | None
    chapters_read: int | None