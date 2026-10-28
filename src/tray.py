# ========== Imports ==========
import pystray
import webbrowser
import threading
from PIL import Image
from updater import check_for_updates, CURRENT_VERSION

# ========== Update Checker Task ==========
def background_check(icon):
    try:
        latest_version, download_url = check_for_updates()
        if latest_version and download_url:
            icon.notify(
                "A new version of AniPresence is available. Right-click the tray icon to download.",
                f"Update available: {latest_version}"
            )

            updated_menu = pystray.Menu(
                pystray.MenuItem(f"Download Update ({latest_version})", lambda: webbrowser.open(download_url)),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem(f"AniPresence {CURRENT_VERSION}", None, enabled=False),
                pystray.MenuItem("Quit", lambda: icon.stop())
            )
            icon.menu = updated_menu
    except:
        pass

# problem with one thread: if it stops at request.get(), the thread stops on that line
# if a user then right clicks the tray, and then clicks quit, python cant answer, because it's waiting
def create_tray():
    image = Image.open("assets/icon.ico")
    
    icon = pystray.Icon("AniPresence", image, "AniPresence")

    icon.menu = pystray.Menu(
        pystray.MenuItem(f"AniPresence {CURRENT_VERSION}", None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Quit", lambda: icon.stop())
    )

    # runs once
    def setup(icon):
        icon.visible = True
        threading.Thread(target=background_check, args=(icon,), daemon=True).start()

    icon.run(setup=setup)
