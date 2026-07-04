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
    

def refresh_token() -> bool:
    """Use the saved refresh token to get a fresh access token from MAL and
    overwrite the token file with the new tokens.

    Returns:
        bool: True if new tokens were fetched and saved, False on failure.
    """
    try:
        tokens = get_token()
        if not tokens:
            return False
        
        response = requests.post(
            "https://myanimelist.net/v1/oauth2/token",
            data={
                "client_id": CLIENT_ID,
                "grant_type": "refresh_token",
                "refresh_token": tokens["refresh_token"],
            },
            timeout=10,
        )
        response.raise_for_status()
        with open(TOKEN_FILE, "w") as f:
            json.dump(response.json(), f)   # new access + refresh token, overwrites old file

        logger.info(f"Successfully refresed MAL token!")
        return True
    
    except Exception as e:
        logger.error(f"Could not refresh MAL token: {e}")
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
    
def logout() -> None:
    """Disconnect from MAL by deleting the saved tokens."""
    try:
        os.remove(TOKEN_FILE)
        logger.info("MAL disconnected; tokens removed.")

    except FileNotFoundError:
        logger.warning("Unable to logout; can't find tokens.")
        pass

def find_in_list(title: str, anime_list) -> Optional[dict]:
    """Find the entry in a MAL list whose title matches a scraped title.

    Args:
        title (str): the scraped anime title to look for.
        anime_list (list): the list of entry dicts from get_animelist / get_mangalist.

    Returns:
        dict | None: the matching entry dict, or None if nothing matched. The entry dict contains the stuff listed below in `get_animelist`.
    """
    if not title:
        return None
    target = title.lower().strip()
    
    for anime in anime_list:
        names = [anime.get("title"), anime.get("title_en")] + (anime.get("synonyms") or [])
        for name in names:
            if name and name.lower().strip() == target:
                return anime
    return None

def get_animelist() -> Optional[list[dict]]:
    """Fetch the user's full MAL anime list and flatten each entry into our own dict shape.
    Refreshes the token and retries once on a 401.

    Returns:
        list[dict] | None: our anime entry dicts, or None on failure.
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
    

def get_mangalist() -> Optional[list[dict]]:
    """Same as `get_animelist` but with different fields, reserved for manga.

    Returns:
        list[dict] | None: our manga entry dicts, or None on failure.
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
                "https://api.myanimelist.net/v2/users/mangalist",
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
    

def update_anime_status(raw: dict) -> Optional[dict]:
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
            return None
        
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
                return None
            
            response = requests.patch(
                f"https://api.myanimelist.net/v2/{anime_manga}/{id}/my_list_status",
                headers={"Authorization": "Bearer " + tokens["access_token"]},
                data=data,
                timeout=10,
            )
        return response.json()
    
    except Exception as e:
        logger.error(f"Could not update status: {e}")
