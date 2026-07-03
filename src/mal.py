# ========== Imports ==========
import requests
import logging

# ========== Logging ==========
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# cache a title's mal url + cover so we dont spam jikan lol
mal_info_cache = {}   # title -> {"url": str, "cover": str | None}

def _fetch_mal_info(title: str) -> dict:
    """look up a title on jikan once (url + poster), then cache the result."""
    if title in mal_info_cache:
        return mal_info_cache[title]

    # fallback if the lookup fails: search link, no cover
    info = {"url": f"https://myanimelist.net/anime.php?q={title}", "cover": None}

    try:
        response = requests.get("https://api.jikan.moe/v4/anime",
                                params={
                                    "q": title,
                                    "limit": 1
                                    },
                                timeout=10
                            )
        response.raise_for_status()

        data = response.json()
        if data.get("data"):
            node = data["data"][0]
            info["url"] = node["url"]
            info["cover"] = node.get("images", {}).get("jpg", {}).get("image_url")

    except Exception as e:
        logger.error(f"Failed to fetch MAL info: {e}")

    mal_info_cache[title] = info
    return info


def get_mal_url(title: str) -> str:
    """the anime's MAL page url (for the 'View on MAL' button)."""
    return _fetch_mal_info(title)["url"]


def get_mal_cover(title: str):
    """the anime's MAL poster url (discord can load this), or None if not found."""
    return _fetch_mal_info(title)["cover"]