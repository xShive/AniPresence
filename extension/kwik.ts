// =====================================================================
// animepahe plays video in a cross-origin kwik.cx iframe, so content.ts
// can't read the <video> across origins. this script lives inside that
// iframe, reads the timestamps, and relays them out through background.js
// (formatTime comes from helpers.js, loaded first)
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
