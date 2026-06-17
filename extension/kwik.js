// convert seconds into a "m:ss" time string (helper)
function formatTime(seconds) {
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

// find the <video> element and send its timestamps to background.js
function sendVideoData() {
    const videoEl = document.querySelector("video");
    if (!videoEl) return;

    chrome.runtime.sendMessage({
        type: "video_data",
        currentTime: videoEl.currentTime != null ? formatTime(videoEl.currentTime) : "",
        duration: videoEl.duration ? formatTime(videoEl.duration) : "",
        paused: videoEl.paused,
    });
}

// repeatedly send video data
function start() {
    sendVideoData();
    setInterval(sendVideoData, 15000);
}

start();