# ========== Imports ==========
import os

# ========== Helper ==========
def appdata_dir() -> str:
    """Return `%APPDATA%\\AniPresence`
    
    (`C:\\Users\\{name}\\AppData\\Roaming\\AniPresence`)

    Creates the folder if needed."""
    base = os.getenv("APPDATA")
    if base is None:
        raise RuntimeError("APPDATA environment variable not found")

    path = os.path.join(base, "AniPresence")
    os.makedirs(path, exist_ok=True)
    return path