# ========== Imports ==========
import logging
import os
from logging.handlers import RotatingFileHandler
from paths import appdata_dir

# ========== Function ==========
def setup_logging():
    log_location = os.path.join(appdata_dir(), "anipresence.log")

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.StreamHandler(),
            RotatingFileHandler(log_location, maxBytes=1_000_000, backupCount=3)
        ]
    )