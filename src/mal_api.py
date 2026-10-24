# API docs: https:/myanimelist.net/apiconfig/references/api/v2

# ========== Imports ==========
import requests, logging
from mal_auth import get_token, refresh_token
from my_types import Anime, Manga
from typing import Any, Optional
from urllib.parse import quote_plus

# ========== Logging ==========
logger = logging.getLogger(__name__)
_anime_cache: dict[str, dict] = {}

# ========== Constants & Code setup ==========
def get_my_info() -> Optional[dict[str, Any]]:
    """Fetch the logged-in user's MAL profile (name, picture, etc.) using the
    saved access token.

    Returns:
        Optional[dict[str, Any]]: the profile data, or None if it failed
    """
    try:
        tokens = get_token()
        if not tokens:
            return None
        
        response = requests.get(
            "https://api.myanimelist.net/v2/users/@me",
            headers={"Authorization": "Bearer " + tokens["access_token"]},
            params={"fields": "anime_statistics"},
            timeout=10,
        )
        if response.status_code == 401:
            refresh_token()
            tokens = get_token()
            if not tokens:
                return None
            
            response = requests.get(
                "https://api.myanimelist.net/v2/users/@me",
                headers={"Authorization": "Bearer " + tokens["access_token"]},
                params={"fields": "anime_statistics"},
                timeout=10,
            )
        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        logger.error(f"Could not fetch MAL user info: {e}")
        return None


def get_animelist() -> Optional[list[Anime]]:
    """Fetch the user's full MAL anime list and flatten each entry into our own dict shape.
    Refreshes the token and retries once on a 401.

    Returns:
        list[Anime] | None: our anime entry dicts, or None on failure.
    """
    try:
        tokens = get_token()
        if not tokens:
            return None

        response = requests.get(
            "https://api.myanimelist.net/v2/users/@me/animelist",
            headers={"Authorization": "Bearer " + tokens["access_token"]},
            params={
                "fields": "list_status{status,score,num_episodes_watched,is_rewatching,num_times_rewatched,tags},synopsis,rank,media_type,num_episodes,broadcast,mean,alternative_titles,status",
                "limit": 1000,
                "nsfw": "true"
            },
            timeout=10,
        )
        if response.status_code == 401:
            refresh_token()
            tokens = get_token()
            if not tokens:
                return None
            
            response = requests.get(
                "https://api.myanimelist.net/v2/users/@me/animelist",
                headers={"Authorization": "Bearer " + tokens["access_token"]},
                params={
                "fields": "list_status{status,score,num_episodes_watched,is_rewatching,num_times_rewatched,tags},synopsis,rank,media_type,num_episodes,broadcast,mean,alternative_titles,status",
                "limit": 1000,
                "nsfw": "true"
                },
                timeout=10,
            )
        response.raise_for_status()

        raw = response.json()
        anime = []

        for item in raw["data"]:
            node   = item["node"]
            status = item["list_status"] 

            anime.append({
                "id":           node.get("id"),
                "title":        node.get("title"),
                "cover":        node.get("main_picture", {}).get("medium"),
                "synopsis":     node.get("synopsis"),
                "rank":         node.get("rank"),
                "mean":         node.get("mean"),
                "media_type":   node.get("media_type"),
                "num_episodes": node.get("num_episodes"),
                "broadcast":    node.get("broadcast"),
                "title_en":     node.get("alternative_titles", {}).get("en"),
                "title_ja":     node.get("alternative_titles", {}).get("ja"),
                "synonyms":     node.get("alternative_titles", {}).get("synonyms", []),
                "airing_status":node.get("status"),

                "status":       status.get("status"),
                "score":        status.get("score"),
                "watched":      status.get("num_episodes_watched"),
                "is_rewatching": status.get("is_rewatching"),
                "num_times_rewatched": status.get("num_times_rewatched"),
                "tags":         status.get("tags"),
            })

        return anime

    except Exception as e:
        logger.error(f"Could not fetch MAL animelist: {e}")
        return None
    

def get_mangalist() -> Optional[list[Manga]]:
    """Same as `get_animelist` but with different fields, reserved for manga.

    Returns:
        list[Manga] | None: our manga entry dicts, or None on failure.
    """
    try:
        tokens = get_token()
        if not tokens:
            return None

        response = requests.get(
            "https://api.myanimelist.net/v2/users/@me/mangalist",
            headers={"Authorization": "Bearer " + tokens["access_token"]},
            params={
                "fields": "list_status{status,score,num_chapters_read,num_volumes_read,is_rereading,num_times_reread,tags},synopsis,rank,media_type,num_volumes,num_chapters,mean,alternative_titles",
                "limit": 1000,
                "nsfw": "true"
            },
            timeout=10,
        )
        if response.status_code == 401:
            refresh_token()
            tokens = get_token()
            if not tokens:
                return None
            
            response = requests.get(
                "https://api.myanimelist.net/v2/users/@me/mangalist",
                headers={"Authorization": "Bearer " + tokens["access_token"]},
                params={
                "fields": "list_status{status,score,num_chapters_read,num_volumes_read,is_rereading,num_times_reread,tags},synopsis,rank,media_type,num_volumes,num_chapters,mean,alternative_titles",
                "limit": 1000,
                "nsfw": "true"
                },
                timeout=10,
            )
        response.raise_for_status()

        raw = response.json()
        manga = []

        for item in raw["data"]:
            node   = item["node"]
            status = item["list_status"] 

            manga.append({
                "id":           node.get("id"),
                "title":        node.get("title"),
                "cover":        node.get("main_picture", {}).get("medium"),
                "synopsis":     node.get("synopsis"),
                "rank":         node.get("rank"),
                "mean":         node.get("mean"),
                "media_type":   node.get("media_type"),
                "num_volumes":  node.get("num_volumes"),
                "num_chapters": node.get("num_chapters"),
                "title_en":     node.get("alternative_titles", {}).get("en"),
                "synonyms":     node.get("alternative_titles", {}).get("synonyms", []),

                "status":       status.get("status"),
                "score":        status.get("score"),
                "volumes_read": status.get("num_volumes_read"),
                "chapters_read":status.get("num_chapters_read"),
                "is_rereading": status.get("is_rereading"),
                "num_times_reread": status.get("num_times_reread"),
                "tags":         status.get("tags"),
            })

        return manga
    
    except Exception as e:
        logger.error(f"Could not fetch MAL mangalist: {e}")
        return None
    

def update_anime_status(raw: dict) -> dict:
    """Write an updated entry back to MAL (PATCH my_list_status).

    Builds MAL's expected field names from EntryUpdate dict (e.g.
    num_watched_episodes vs num_chapters_read depending on is_manga).
    Refreshes the token and retries once on a 401.

    Args:
        raw (dict): an EntryUpdate.

    Returns:
        dict | None: MAL's response json, or None on failure.
    """
    try:
        tokens = get_token()
        if not tokens:
            raise RuntimeError("Not logged in")
        
        anime_manga = "manga" if raw["is_manga"] else "anime"
        id = raw["id"]
        progress_field = "num_chapters_read" if raw["is_manga"] else "num_watched_episodes"
        data = {        # MAL formatted dict
            "status": raw["target_status"],
            "score": raw["score"],
            progress_field: raw["progress"]
        }
        # anime rewatching
        if raw.get("is_rewatching") is not None:
            data["is_rewatching"] = "true" if raw["is_rewatching"] else "false"
        if raw.get("num_times_rewatched") is not None:
            data["num_times_rewatched"] = raw["num_times_rewatched"]
        
        response = requests.patch(
            f"https://api.myanimelist.net/v2/{anime_manga}/{id}/my_list_status",
            headers={"Authorization": "Bearer " + tokens["access_token"]},
            data=data,
            timeout=10
        )
        if response.status_code == 401:
            refresh_token()
            tokens = get_token()
            if not tokens:
                raise RuntimeError("Not logged in")
            
            response = requests.patch(
                f"https://api.myanimelist.net/v2/{anime_manga}/{id}/my_list_status",
                headers={"Authorization": "Bearer " + tokens["access_token"]},
                data=data,
                timeout=10,
            )

        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        logger.error(f"Could not update status: {e}")
        raise

def _search_anime(title: str) -> Optional[dict]:
    # avoid unloaded DOM -> empty titles error
    if not title.strip():
        return None
    
    if title in _anime_cache:
        return _anime_cache[title]
    
    try:
        tokens = get_token()
        if not tokens:
            return None

        response = requests.get(
            "https://api.myanimelist.net/v2/anime",
            headers={"Authorization": "Bearer " + tokens["access_token"]},
            params={"q": title},
            timeout=10
        )
        if response.status_code == 401:
            refresh_token()
            tokens = get_token()
            if not tokens:
                return None

            response = requests.get(
                "https://api.myanimelist.net/v2/anime",
                headers={"Authorization": "Bearer " + tokens["access_token"]},
                params={"q": title},
                timeout=10
            )

        response.raise_for_status()
        data = response.json()
        _anime_cache[title] = data
        return data

    except Exception as e:
        logger.error(f"Could not match anime's title to its ID: {e}")

def get_mal_cover(title: str) -> Optional[str]:
    raw = _search_anime(title)
    if not raw:
        return None

    try:
        return raw["data"][0]["node"]["main_picture"]["large"]
    
    except (KeyError, IndexError, TypeError):
        return None

def get_mal_url(title: str) -> str:
    raw = _search_anime(title)
    if not raw:
        return f"https://myanimelist.net/search/all?q={quote_plus(title)}&cat=all"

    try:
        return f"https://myanimelist.net/anime/{raw["data"][0]["node"]["id"]}"
        
    except (KeyError, IndexError, TypeError):
        return f"https://myanimelist.net/search/all?q={quote_plus(title)}&cat=all"
