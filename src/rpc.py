# ========== Imports ==========
from pypresence.presence import Presence
from pypresence.types import ActivityType
from flask import Flask, request, jsonify
from flask_cors import CORS
from tray import create_tray
from mal import get_mal_url, get_mal_cover
from updater import check_for_updates
from helpers import time_to_seconds
from functools import wraps
from log_setup import setup_logging
from mal_auth import start_login, handle_callback, get_my_info, logout, get_animelist, get_mangalist, update_anime_status, find_in_list

import time
import threading
import logging

# ========== Logging ==========
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ========== Global Variables ==========
APP_ID="1510673753871352070"

last_ping_time = time.time()
is_presence_active = False
is_paused_active = False
rpc_connected = False
ghost_mode = False
current_end_timestamp = None
last_episode = None

current_title_and_number = None
current_anime_title = None
current_episode_line = None
current_episode_title = None
current_cover = None

auto_progress_enabled = False
auto_progress_threshold = 85
last_marked_episode = None

# ========== Heartbeat Timeout Logic =========
def timeout_monitor():
    """
    Every 15 seconds content.js sends a /watching ping. last_ping_time records the time of the last ping.
    The timeout_monitor thread wakes up every 5 seconds to check if it has been more than 25 seconds.
    """
    global last_ping_time, is_presence_active, is_paused_active, rpc_connected
    while True:
        time.sleep(5)
        
        # if active, but no signal from the browser in 25 seconds
        if is_presence_active and (time.time() - last_ping_time > 25):
            logger.info("Browser tab closed! Clearing Discord presence.")
            try:
                if rpc_connected:   # check if youre not disconnected
                    rpc.clear()

            except Exception as e:
                rpc_connected = False
                logger.error(f"Discord's RPC socket failed: {e}.\nA reconnect attempt will trigger shortly.")

            is_presence_active = False

# ========== Decorator ==========
# if two endpoints use the decorator, both endpoints will be named wrapper (prevent)
def not_ghost(func):
    @wraps(func)
    def wrapper():
        if ghost_mode:
            return jsonify({ "status": "ghost_mode" })
        return func()
    return wrapper

# ========== Flask app - API endpoints ==========
app = Flask(__name__)
CORS(app) 

@app.route('/watching', methods=['POST'])
@not_ghost
def watching():
    global last_ping_time, is_presence_active, is_paused_active, rpc_connected, rpc, current_title_and_number
    global current_end_timestamp, last_episode
    global current_anime_title, current_episode_line, current_episode_title, current_cover      # everything for discord strip
    global last_marked_episode

    last_ping_time = time.time() # reset timer
    is_presence_active = True

    # reconnect rpc if needed
    if not rpc_connected:
        try:
            rpc = Presence(APP_ID)
            rpc.connect()
            rpc_connected = True
            current_end_timestamp = None
            logger.info("Successfully reconnected to Discord's RPC socket.")
            
        except Exception as e:
            logger.error(f"Failed reconnecting to Discord's RPC socket: {e}")

    data = request.get_json()

    anime_title = data.get('anime_title', '')
    episode_title = data.get('episode_title', '')
    episode = data.get('episode', '').replace('.', '').strip()
    episode_line = f"EP {episode}" if episode else ""
    cover = data.get('cover', '') or None
    current_time = data.get('current_time', '0:00')
    duration = data.get('duration', '0:00')
    paused = data.get('paused', False)

    anime_title_and_number = f"{anime_title} ∙ {episode_line}"

    # look up the mal poster
    mal_url = get_mal_url(anime_title)
    mal_cover = get_mal_cover(anime_title) or cover

    # remember the live snapshot so the popup strip can read it from /status
    current_anime_title = anime_title
    current_episode_line = episode_line
    current_episode_title = episode_title
    current_cover = mal_cover

    episode_changed = (episode_line != last_episode)
    last_episode = episode_line

    try:
        # if video player is blocked (crunchyroll not subscribed)
        if not current_time or not duration:
            seconds_remaining = 0
        else:
            seconds_remaining = time_to_seconds(duration) - time_to_seconds(current_time)

        # Is the video finished?
        if seconds_remaining <= 0 and duration not in ("", "0:00"):
            if current_end_timestamp is not None:
                current_end_timestamp = None
                rpc.clear()     # erase countdown, only first time when 0 remaining

            rpc.update(
                details=anime_title_and_number,
                state="✓ Finished!",
                large_image=mal_cover,
                buttons=[{"label": "View on MAL", "url": mal_url}]
            )

        # Is it paused?
        elif paused:
            if not is_paused_active:
                is_paused_active = True
                current_end_timestamp = None
                rpc.clear()

            rpc.update(
                details=anime_title_and_number,
                state="⏸ Paused",
                large_image=mal_cover,
                buttons=[{"label": "View on MAL", "url": mal_url}]
            )

        # 3. It is playing normally
        else:
            is_paused_active = False
            new_end_timestamp = int(time.time()) + seconds_remaining
            start_timestamp = int(time.time()) - time_to_seconds(current_time)

            
            if current_end_timestamp is None or episode_changed or abs(current_end_timestamp - new_end_timestamp) > 3:
                current_end_timestamp = new_end_timestamp
            
            current_title_and_number = anime_title_and_number

            rpc.update(
                activity_type=ActivityType.WATCHING,
                details=anime_title_and_number,
                state=episode_title if episode_title else None,
                large_image=mal_cover,
                start=start_timestamp,
                end=current_end_timestamp,
                buttons=[{"label": "View on MAL", "url": mal_url}]
            )

    except Exception as e:
        rpc_connected = False
        logger.error(f"Discord's RPC socket failed: {e}.\nA reconnect attempt will trigger shortly.")

    # auto progress
    if auto_progress_enabled and episode and current_time and duration:
        total = time_to_seconds(duration)
        fraction = time_to_seconds(current_time) / total if total else 0

        if fraction * 100 >= auto_progress_threshold and episode_line != last_marked_episode:
            last_marked_episode = episode_line          # mark FIRST so we only attempt once per episode
            try:
                entry = find_in_list(anime_title, get_animelist() or [])
                n = int(episode)
                if entry and n > (entry.get("watched") or 0):       # check if current list entry episode is lower than currently watching
                    total = entry.get("num_episodes") or 0
                    is_completed = total > 0 and n >= total
                    is_rewatching = entry.get("is_rewatching") or False
                    times_rewatched = entry.get("num_times_rewatched") or 0
                    
                    update_anime_status({
                        "is_manga": False,
                        "id": entry["id"],
                        "target_status": "completed" if (is_completed or entry["status"] == "completed") else "watching",
                        "score": entry["score"],
                        "progress": n,
                        "is_rewatching": False if is_completed else is_rewatching,
                        "num_times_rewatched": times_rewatched + 1 if (is_completed and is_rewatching) else times_rewatched
                    })
                    logger.info(f"Auto-progress: {anime_title} -> ep {n}")
                    
            except Exception as e:
                logger.error(f"Auto-progress failed: {e}")

    return jsonify({ "status": "ok" })

@app.route('/stopped', methods=['POST'])
def stopped():
    global is_presence_active, current_end_timestamp, last_episode, current_title_and_number
    global current_anime_title, current_episode_line, current_episode_title, current_cover
    try:
        rpc.clear()

    except Exception as e:
        logger.error(f"Discord's RPC socket failed: {e} Couldn't clear status.")

    is_presence_active = False
    current_end_timestamp = None
    last_episode = None
    current_title_and_number = None
    current_anime_title = None
    current_episode_line = None
    current_episode_title = None
    current_cover = None
    logger.info("Presence cleared.")
    return jsonify({ "status": "ok" })

@app.route('/update', methods=['GET'])
def update():
    latest_version, download_url = check_for_updates()
    return jsonify({"latest_version": latest_version or None, "download_url": download_url or None})

@app.route('/status', methods=['GET'])
def status():
    return jsonify({
        "is_watching": is_presence_active,
        "is_paused": is_paused_active,
        "title_number": current_title_and_number or None,
        "anime_title": current_anime_title,
        "episode_line": current_episode_line,
        "episode_title": current_episode_title,
        "cover": current_cover,
        "ghost_mode": ghost_mode,
        "auto_progress": auto_progress_enabled
    })

@app.route('/ghost', methods=['POST'])
def toggle_ghost():
    global ghost_mode
    ghost_mode = not ghost_mode
    if ghost_mode:
        try:
            rpc.clear()
        except Exception as e:
            logger.error(f"Discord's RPC socket failed: {e} Couldn't clear status.")
            
    return jsonify({ "ghost_mode": ghost_mode })

@app.route("/mal/login", methods=["GET"])   # 'login' button in extension hits this
def mal_login():
    start_login()
    return jsonify({"status": "opening browser"})

@app.route("/mal/logout", methods=["POST"])
def mal_logout():
    logout()
    return jsonify({"status": "disconnected"})

@app.route("/mal/callback", methods=['GET'])    # when login works, it hits this
def mal_callback():
    code = request.args.get("code")
    if code is None:
        logger.error("MAL callback was hit without a code")
        return "Login failed: no code received."

    if handle_callback(code):
        return "Connected! You can close this tab."
    return "Login failed. Please try again."

@app.route("/mal/me", methods=['GET'])      # the extension should hit this when loading profile data
def mal_me():
    return jsonify(get_my_info())

@app.route("/mal/me/animelist", methods=['GET'])
def mal_animelist():
    return jsonify(get_animelist())

@app.route("/mal/me/mangalist", methods=['GET'])
def mal_mangalist():
    return jsonify(get_mangalist())

@app.route("/mal/me/update/status", methods=['POST'])
def mal_update_anime_status():
    update_anime_status(request.get_json())
    return jsonify({ "status" : "ok" })

@app.route('/autoprogress', methods=['POST'])
def set_autoprogress():
    global auto_progress_enabled, auto_progress_threshold
    data = request.get_json()
    auto_progress_enabled = data.get("enabled", False)
    auto_progress_threshold = data.get("threshold", 85)
    print(auto_progress_enabled)
    return jsonify({"enabled": auto_progress_enabled, "threshold": auto_progress_threshold})

# ========== Main ==========
if __name__ == '__main__':
    setup_logging()

    # Connect RPC
    try:
        rpc = Presence(APP_ID)
        rpc.connect()
        rpc_connected = True
        logger.info("Successfully connected to Discord's RPC")
        
    except Exception as e:
        logger.error(f"Initial Discord connection failed: {e}. Will retry on next browser update.")
        rpc_connected = False

    # thread 1: flask server listens for HTTP requests on port 5001 (daemon)
    threading.Thread(target=lambda: app.run(host='127.0.0.1', port=5001), daemon=True).start()
    logger.info("RPC client running on port 5001...") 

    # thread 2: check heartbeat every 5 seconds (daemon)
    threading.Thread(target=timeout_monitor, daemon=True).start()
    
    # main thread: blocks running tray icon
    create_tray()