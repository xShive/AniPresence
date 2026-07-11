# ========== Imports ==========
import requests
import logging
import urllib.parse

# ========== Logging ==========
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# cache a title's mal url + cover so we dont spam jikan lol
mal_info_cache = {}   # title -> {"url": str, "cover": str | None}

def _fetch_mal_info(title: str) -> dict:
    """Look up a title on Jikan and cache the response.

    Internal helper behind get_mal_url / get_mal_cover so both share a single
    request per title. Falls back to a search url + no cover if the lookup fails.

    Args:
        title (str): the anime title to search for.

    Returns:
        dict: {"url": str, "cover": str | None} for this title.
    """
    if title in mal_info_cache:
        return mal_info_cache[title]

    # fallback if the lookup fails: search link, no cover
    info = ({"url": f"https://myanimelist.net/anime.php?q={urllib.parse.quote_plus(title)}", "cover": None})

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
    """The anime's MAL page url (for the 'View on MAL' button).

    Args:
        title (str): the anime title.

    Returns:
        str: the MAL url (a search url if the title wasn't found).
    """
    return _fetch_mal_info(title)["url"]


def get_mal_cover(title: str):
    """The anime's MAL poster url (a CDN image Discord can load).

    Args:
        title (str): the anime title.

    Returns:
        str | None: the poster url, or None if the title wasn't found.
    """
    return _fetch_mal_info(title)["cover"]