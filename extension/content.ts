// ========== Setup + State ==========
const currentHost = window.location.hostname.replace("www.", "");
const SITE = SITE_CONFIGS[currentHost];

let isWatching = false;
let iframeVideoData: VideoData | null = null;

// ========== Incoming messages ==========
// listen to background.js: if kwik video data arrives, store it for scrapeData()
function handleVideoData(message: VideoData) {
    if (message.type === "video_data") {
        iframeVideoData = message;
    }
}

chrome.runtime.onMessage.addListener(handleVideoData);

// ========== Scraping ==========
/**
 * Checks whether the current URL contains any of the specified watch-page fragments.
 *
 * @param pathIncludes - A URL fragment or array of fragments identifying watch pages.
 * @returns True if any fragment matches; otherwise false.
 */
function pathMatches(pathIncludes: string | string[]): boolean {
    if (!pathIncludes) return false;
    if (Array.isArray(pathIncludes)) {      // crunchyroll has two paths (array)
        return pathIncludes.some((p) => window.location.href.includes(p));
    }
    return window.location.href.includes(pathIncludes);
}

/**
 * Scrapes data from the website using queryselectors.
 * 
 * Returns scraped data when on a supported watch page.
 * Returns null if
 * - unsupported website
 * - supported website but not on an episode
 */
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

    // extract cover url from element
    const coverUrl =
        coverEl?.getAttribute("content")
        ?? coverEl?.getAttribute("src")
        ?? "";

    // read timestamps from the video element (or from kwik for animepahe)
    let currentTime: string, duration: string, isPaused: boolean;
    if (videoEl) {
        currentTime = videoEl.currentTime != null ? formatTime(videoEl.currentTime) : "";
        duration = videoEl.duration ? formatTime(videoEl.duration) : "";
        isPaused = videoEl.paused;
    } else if (iframeVideoData) {
        currentTime = iframeVideoData.currentTime;
        duration = iframeVideoData.duration;
        isPaused = iframeVideoData.paused;
    } else {
        currentTime = "";
        duration = "";
        isPaused = true;
    }

    // prefer the dedicated number element; otherwise fall back to the title and parse a number out of it
    const rawEpisodeValue = numberEl ? numberEl.textContent : (titleEl ? titleEl.textContent : "");
    return {
        anime_title: animeTitleEl
            ? (SITE.parseAnimeTitle ? SITE.parseAnimeTitle(animeTitleEl.textContent)
                                    : animeTitleEl.textContent.trim())
            : "",
        episode_title: titleEl
            ? (SITE.parseEpisodeTitle ? SITE.parseEpisodeTitle(titleEl.textContent)
                                      : titleEl.textContent.trim())
            : "",
        episode: SITE.parseEpisodeNumber ? SITE.parseEpisodeNumber(rawEpisodeValue) : (rawEpisodeValue ? rawEpisodeValue.trim() : ""),
        current_time: currentTime,
        duration: duration,
        cover: SITE.parseCoverUrl ? SITE.parseCoverUrl(coverUrl) : coverUrl,
        paused: isPaused,
    };
}

// ========== Backend Communication ==========
/**
 * Sends a fetch request to background script and **waits for its response**.
 * 
 * Wraps Chrome's `.sendMessage()` in a Promise so callers can await the completion of the request.
 * 
 * Resolves when the background script reports success.
 * Rejects if
 * - Chrome messaging failed (`chrome.runtime.lastError`)
 * - No response somehow (undefined)
 * - HTTP request failed
 * 
 * @param url - URL that the background script sends request to
 * @param method - HTTP method to use
 * @param body - Optional scraped data to send as the body
 */
function bgFetch(
    url: string,
    method: string,
    body: ScrapedData | null = null
): Promise<void> {
    return new Promise(function (resolve, reject) {
        chrome.runtime.sendMessage({
            type: "fetch",  
            url: url,
            method: method,
            headers: { "Content-Type": "application/json" },
            body: body,
        }, function (response: ResponseMessage | undefined) {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (response === undefined) {
                reject(new Error("Background script did not respond"));
                return;
            }
            if (response.ok === true) {
                resolve();
            } else {
                reject(new Error(response.error));
            }
        });
    });
}


// forward to bgFetch with /watching endpoint + data
function sendData(data: ScrapedData): Promise<void> {
    return bgFetch(`${LOCAL_URL}/watching`, "POST", data);
}

// forward to bgFetch with /stopped endpoint
function sendStop(): Promise<void> {
    return bgFetch(`${LOCAL_URL}/stopped`, "POST");
}

// ========== Scraping loop ==========
/**
 * Makes a single scrape call and decides what to do with the result.
 * 
 * If watch data is available, it is sent through `sendData()` before
 * `isWatching` is updated.
 *
 * If watching has stopped, `sendStop()` is awaited before clearing
 * `isWatching`.
 * 
 * Handles errors from `sendData()` and `sendStop()`
 */
async function tick() {
    const data = scrapeData();

    try {
        if (data) {
            await sendData(data);
            isWatching = true;
        } else if (isWatching) {
            await sendStop();
            isWatching = false;
        }
    } catch (error: unknown) {
        console.error(error);
    }
}

function startScraping() {
    tick();
    setInterval(tick, 15000);
}

// ========== Initialization ==========
/**
 * Runs a callback once the DOM is ready.
 *
 * Two options:
 * 1. If the page is already loaded (readyState) -> run callback immediately
 * 2. Else, register callback with browser's DOM event system
 * 
 * @param callback - Function to run when the DOM is ready.
 */
function waitForPageReady(callback: () => void) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        callback();
    } else {
        window.addEventListener("DOMContentLoaded", callback);
    }
}

function onPageReady() {
    if (!SITE) return;
    startScraping();
}

waitForPageReady(onPageReady);