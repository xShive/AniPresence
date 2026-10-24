# auth docs: https://myanimelist.net/apiconfig/references/authorization

# ========== Imports ==========
import os, json, secrets, webbrowser, requests, logging
from paths import app_data_dir
from typing import Any, Optional

# ========== Logging ==========
logger = logging.getLogger(__name__)

# ========== Constants ==========
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
        bool: True if the browser was opened, raises on failure.
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
        if webbrowser.open(url):
            return True
        raise RuntimeError("Unable to open browser.")
    
    except Exception as e:
        logger.error(f"Could not open the MAL login page: {e}")
        raise


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
        with open(TOKEN_FILE, "w") as f: json.dump(response.json(), f)
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


def logout() -> None:
    """Disconnect from MAL by deleting the saved tokens."""
    try:
        os.remove(TOKEN_FILE)
        logger.info("MAL disconnected; tokens removed.")

    except FileNotFoundError:
        logger.warning("Unable to logout; can't find tokens.")
        raise FileNotFoundError("Unable to logout; can't find tokens.")