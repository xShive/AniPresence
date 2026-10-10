// =====================================================================
// websites that play video in cross-origin iframes: inject script inside
// iframe, read timestamps, relay them out through background.js
// iframes dont have their own tabid, only their own frame

// document.querySelector search within one document.
// one tab can have multiple frames; each own documents.
// inject this script and search that document
// 
// =====================================================================

/**
 * Scrapes video-element within iframe and forwards it to background script.
 * Handles errors from iframes -> background
 */
function sendVideoData() {
    const videoEl = document.querySelector("video");
    if (!videoEl) return;

    const message: VideoData = {
        type: "video_data",
        currentTime: videoEl.currentTime != null ? formatTime(videoEl.currentTime) : "",
        duration: videoEl.duration ? formatTime(videoEl.duration) : "",
        paused: videoEl.paused,
    };
    chrome.runtime.sendMessage(message
    ).catch((error: unknown) => {   // .catch returns ANOTHER promise
        console.error(error);
    })
}

// repeatedly send video data
function start() {
    sendVideoData();
    setInterval(sendVideoData, 15000);
}

start();
