// =====================================================================
// websites that play video in cross-origin iframes: inject script inside
// iframe, read timestamps, relay them out through background.js
// iframes dont have their own tabid, only their own frame
// =====================================================================

// find the <video> element and send its timestamps to background.js
function sendVideoData() {
    const videoEl = document.querySelector("video");
    if (!videoEl) return;

    const message: VideoData = {
        type: "video_data",
        currentTime: videoEl.currentTime != null ? formatTime(videoEl.currentTime) : "",
        duration: videoEl.duration ? formatTime(videoEl.duration) : "",
        paused: videoEl.paused,
    };
    chrome.runtime.sendMessage(message);
}

// repeatedly send video data
function start() {
    sendVideoData();
    setInterval(sendVideoData, 15000);
}

start();
