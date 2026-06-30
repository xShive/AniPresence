// =====================================================================
// scrapes what you're watching (title/episode/cover/timestamps) every 15s
// and sends it to the Python app, routed through background.js.
//
// types (ScrapedData, VideoData, SiteConfig, SITE_CONFIGS) live in types.d.ts.
// =====================================================================

// ========== Setup ==========
// check if the current website is in the config
const currentHost = window.location.hostname.replace("www.", "");
const SITE = SITE_CONFIGS[currentHost];

// ========== State ==========
let isWatching = false;
let kwikVideoData: VideoData | null = null;

// listen to background.js: if kwik video data arrives, store it for scrapeData()
function handleVideoData(message: VideoData) {
    if (message.type === "video_data") {
        kwikVideoData = message;
    }
}

chrome.runtime.onMessage.addListener(handleVideoData);

// ========== URL Helpers ==========
// check if the current URL is still on a watch page
function pathMatches(pathIncludes: string | string[]): boolean {
    if (!pathIncludes) return false;
    if (Array.isArray(pathIncludes)) {      // crunchyroll has two paths (array)
        return pathIncludes.some(function (p) {
            return window.location.href.includes(p);
        });
    }
    return window.location.href.includes(pathIncludes);
}

// ========== Cover Image Helpers ==========
// fallback: read the cover from the page's hidden meta tags
function getMetaCover(): string {
    const meta =
        document.querySelector<HTMLMetaElement>("meta[property='og:image']") ||
        document.querySelector<HTMLMetaElement>("meta[name='og:image']") ||
        document.querySelector<HTMLMetaElement>("meta[name='twitter:image']");
    return meta ? meta.content || meta.getAttribute("content") || "" : "";
}

// Extract a usable image URL from a cover element: an <img> src, a CSS background-image, or a nested <img>.
function getCoverUrl(el: Element | null): string {
    if (!el) return getMetaCover();
    if (el.tagName === "IMG") return (el as HTMLImageElement).src || getMetaCover();

    const bgImage = (el as HTMLElement).style && (el as HTMLElement).style.backgroundImage;
    if (bgImage && bgImage !== "none") {
        const match = bgImage.match(/url\((?:['"]?)(.*?)(?:['"]?)\)/);
        if (match) return match[1];
    }

    const nestedImg = el.querySelector("img");
    if (nestedImg) return nestedImg.src || getMetaCover();

    return el.getAttribute("src") || getMetaCover();
}

// ========== Scraper ==========
// (formatTime + LOCAL_URL now live in helpers.ts, loaded first)
function scrapeData(): ScrapedData | null {
    // not a supported site, or not on a watch page
    if (!SITE) return null;
    if (!pathMatches(SITE.watchPathIncludes)) return null;

    const selectors = SITE.selectors;
    const animeTitleEl = document.querySelector(selectors.animeTitle);
    const titleEl = document.querySelector(selectors.episodeTitle);
    const numberEl = document.querySelector(selectors.episodeNum);
    const coverEl = document.querySelector(selectors.cover);
    const videoEl = document.querySelector<HTMLVideoElement>(selectors.video);

    // read timestamps from the video element (or from kwik for animepahe)
    let currentTime: string, duration: string, isPaused: boolean;
    if (videoEl) {
        currentTime = videoEl.currentTime != null ? formatTime(videoEl.currentTime) : "";
        duration = videoEl.duration ? formatTime(videoEl.duration) : "";
        isPaused = videoEl.paused;
    } else if (kwikVideoData) {
        currentTime = kwikVideoData.currentTime;
        duration = kwikVideoData.duration;
        isPaused = kwikVideoData.paused;
    } else {
        currentTime = "";
        duration = "";
        isPaused = true;
    }

    // prefer the dedicated number element; otherwise fall back to the title and parse a number out of it
    const rawEpisodeValue = numberEl ? numberEl.textContent : (titleEl ? titleEl.textContent : "");

    return {
        anime_title: animeTitleEl
            ? (SITE.parseAnimeTitle ? SITE.parseAnimeTitle(animeTitleEl.textContent) : animeTitleEl.textContent.trim())
            : "",
        episode_title: (titleEl && SITE.parseEpisodeTitle) ? SITE.parseEpisodeTitle(titleEl.textContent) : "",
        episode: SITE.parseEpisodeNumber ? SITE.parseEpisodeNumber(rawEpisodeValue) : (rawEpisodeValue ? rawEpisodeValue.trim() : ""),
        current_time: currentTime,
        duration: duration,
        cover: SITE.parseCoverUrl ? SITE.parseCoverUrl(getCoverUrl(coverEl)) : getCoverUrl(coverEl),
        paused: isPaused,
    };
}

// ========== Communication with Python ==========
// route requests through background.js (a direct localhost request triggers a browser security popup)
// put all scraped data in an object, pass to background.js
function bgFetch(url: string, method: string, body: ScrapedData | null = null): Promise<any> {
    return new Promise(function (resolve) {
        chrome.runtime.sendMessage({
            type: "fetch",
            url: url,
            method: method,
            headers: { "Content-Type": "application/json" },
            body: body,
        }, resolve);
    });
}

// send the current watch data to the Python app
async function sendData(data: ScrapedData) {
    await bgFetch(`${LOCAL_URL}/watching`, "POST", data);
}

// tell the Python app to clear the Discord presence
function sendStop() {
    bgFetch(`${LOCAL_URL}/stopped`, "POST");
}

// ========== Main Loop ==========
// scrape every 15s and send to Python; if the data disappears, send a stop signal
async function tick() {
    const data = scrapeData();

    if (data) {
        await sendData(data);
        isWatching = true;
    } else if (isWatching) {
        sendStop();
        isWatching = false;
    }
}

function startScraping() {
    tick();
    setInterval(tick, 15000);
}

// wait for the page to finish loading before starting the scraper
function waitForPageReady(callback: () => void) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        callback();
    } else {
        window.addEventListener("DOMContentLoaded", callback);
    }
}

function onPageReady() {
    if (!SITE) return;
    setTimeout(startScraping, 1000);
}

waitForPageReady(onPageReady);
