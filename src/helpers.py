# ========== Imports ==========
from typing import Optional
import string
translator = str.maketrans('', '', string.punctuation)

# ========== Helpers ==========
def time_to_seconds(t: str) -> int:
    """Convert a 'M:SS' or 'H:MM:SS' timestamp string into total seconds."""
    parts = t.split(':')
    return int(parts[0]) * 60 + int(parts[1]) if (len(parts) == 2) else int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])

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
    target = title.lower().strip().translate(translator)    
    
    for anime in anime_list:
        names = [anime.get("title"), anime.get("title_en")] + (anime.get("synonyms") or [])
        for name in names:
            if name and name.lower().strip().translate(translator) == target:
                return anime
    return None