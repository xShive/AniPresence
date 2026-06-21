# auth docs: https://myanimelist.net/apiconfig/references/authorization

# ========== Imports ==========
import os, json, secrets, webbrowser, requests, logging
from paths import app_data_dir
from typing import Any, Optional

# ========== Logging ==========
logger = logging.getLogger(__name__)

# ========== Constants & Code setup ==========
CLIENT_ID = "02232d5ee959c84e51196e9f1968b041"
REDIRECT_URI = "http://127.0.0.1:5001/mal/callback"     # MAL sends the browser here after login
TOKEN_FILE = os.path.join(app_data_dir(), "mal_tokens.json")

_code_verifier = None   # random secret, remembered between start_login and handle_callback

# ========== Helper ==========
def get_token() -> Optional[Any]:
    try:
        with open(TOKEN_FILE) as f:
            return json.load(f)
        
    except Exception as e:
        logger.error(f"Could not find token. `Check appdata/roaming/anipresence`\n{e}")
        return

# ========== Functions ==========
def start_login() -> bool:
    """Open MAL's login page in the user's browser to begin logging in.

    Returns:
        bool: True if the browser was opened, False on failure.
    """
    global _code_verifier
    _code_verifier = secrets.token_urlsafe(64)      # the random secret (PKCE verifier)
    url = (
        "https://myanimelist.net/v1/oauth2/authorize"
        "?response_type=code"               # ask MAL for a temporary code, which we trade for the token
        f"&client_id={CLIENT_ID}"
        f"&code_challenge={_code_verifier}"
        "&code_challenge_method=plain"      # no hashing; the challenge equals the verifier
        f"&redirect_uri={REDIRECT_URI}"
    )
    try:
        webbrowser.open(url)
        return True
    except Exception as e:
        logger.error(f"Could not open the MAL login page: {e}")
        return False


# MAL sends us a new code in the redirect which is used here to request the token and save it
def handle_callback(code: str) -> bool:
    """Trade MAL's authorization code for the access + refresh tokens and save
    them to the appdata token file.

    Args:
        code (str): the authorization code MAL returns after a successful login.

    Returns:
        bool: True if tokens were fetched and saved, False on failure.
    """
    try:
        response = requests.post(
            "https://myanimelist.net/v1/oauth2/token",
            data={
                "client_id": CLIENT_ID,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "code_verifier": _code_verifier,
            },
            timeout=10,
        )
        response.raise_for_status()
        with open(TOKEN_FILE, "w") as f:
            json.dump(response.json(), f)
        logger.info(f"MAL login successful; tokens saved to {app_data_dir}.")
        return True
    except Exception as e:
        logger.error(f"Failed to exchange code for MAL tokens: {e}")
        return False


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
        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        logger.error(f"Could not fetch MAL user info: {e}")
        return None
    
def logout() -> None:
    """Disconnect from MAL by deleting the saved tokens."""
    try:
        os.remove(TOKEN_FILE)
        logger.info("MAL disconnected; tokens removed.")

    except FileNotFoundError:
        logger.warning("Unable to logout; can't find tokens.")
        pass

def get_animelist():
    """
    STRUCTURE:
    - data: list. each element is one anime.
        -- each element has two parts:
            1. node (the anime: id, title, picture)
            2. list status (personal progress: scores, episodes)
    - paging: pagination info. if there's a next URL, there are more entries beyond this page
    mal doesnt include all the things directly so add to fields
    """
    try:
        tokens = get_token()
        if not tokens:
            return None

        response = requests.get(
            "https://api.myanimelist.net/v2/users/@me/animelist",
            headers={"Authorization": "Bearer " + tokens["access_token"]},
            params={
                "fields": "list_status,synopsis,rank,media_type,num_episodes,broadcast,mean,alternative_titles,status",
                "limit": 1000,
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
                "watched":      status.get("num_episodes_watched")
            })

        return anime

    except Exception as e:
        logger.error(f"Could not fetch MAL animelist: {e}")
        return None
    

def get_mangalist():
    try:
        tokens = get_token()
        if not tokens:
            return None

        response = requests.get(
            "https://api.myanimelist.net/v2/users/@me/mangalist",
            headers={"Authorization": "Bearer " + tokens["access_token"]},
            params={
                "fields": "list_status,synopsis,rank,media_type,num_volumes,num_chapters,mean,alternative_titles",
                "limit": 1000,
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
                "chapters_read":status.get("num_chapters_read")    
            })

        return manga
    
    except Exception as e:
        logger.error(f"Could not fetch MAL mangalist: {e}")
        return None
    

def update_anime_status(raw):
    try:
        tokens = get_token()
        if not tokens:
            return None
        
        anime_manga = "manga" if raw["is_manga"] else "anime"
        id = raw["id"]
        progress_field = "num_chapters_read" if raw["is_manga"] else "num_watched_episodes"
        data = {
            "status": raw["target_status"],
            "score": raw["score"],
            progress_field: raw["progress"]
        }
        
        response = requests.patch(
            f"https://api.myanimelist.net/v2/{anime_manga}/{id}/my_list_status",
            headers={"Authorization": "Bearer " + tokens["access_token"]},
            data=data,
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    
    except Exception as e:
        logger.error(f"Could not update status: {e}")
