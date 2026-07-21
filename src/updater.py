# ========== Imports ==========
import requests
import logging

from typing import Optional, Tuple

# ========== Logging ==========
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ========== Global variables ==========
CURRENT_VERSION = "v1.4.3"

# ========== Functions ==========
# https://docs.github.com/en/rest/releases/releases?apiVersion=2026-03-10
def check_for_updates() -> Tuple[Optional[str], Optional[str]]:
    """Checks for updates.

    Returns:
        Tuple[Optional[str], Optional[str]]: Returns a tuple containing the newest version and its download link, if found. Else None, None.
    """
    try:
        response = requests.get(
            f"https://api.github.com/repos/xShive/AniPresence/releases/latest",
            headers={"accept": "application/vnd.github+json"},
            timeout=10
        )

        response.raise_for_status()

        data = response.json()
        if data.get("tag_name"):
            latest_version = data["tag_name"].strip()

            if latest_version != CURRENT_VERSION:
                download_url = data.get("html_url")     # fallback url

                if data.get("assets"):
                    for asset in data["assets"]:        # each asset for a release (exe, zip) has a dictoinary
                        if asset["name"].endswith(".exe"):
                            download_url = asset["browser_download_url"]
                            break
                
                return latest_version, download_url

    except Exception as e:
        logger.error(f"Failed to check for updates: {e}")
    
    return None, None