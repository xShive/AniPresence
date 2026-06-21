// =====================================================================
// loaded after helpers.js but before content.js (see manifest), so SITE_CONFIGS
// is a shared global content.ts can read. each site entry says which URLs count
// as a "watch page" and which CSS selectors to scrape. shape = SiteConfig (types.d.ts)

// in manifest, config, helpers and content are within the same scope, so they
// can use eachother's variables
// =====================================================================

// ========== Miruro Config ==========
const MIRURO_CONFIG: SiteConfig = {
    watchPathIncludes: "/watch",
    selectors: {
        animeTitle:   ".anime-title",
        episodeTitle: ".ep-title",
        episodeNum:   ".ep-number",
        cover:        "img[style*='view-transition-name: poster']",
        video:        "video",
    },
    parseEpisodeTitle: function (raw) {
        return raw.includes("· ") ? raw.split("· ")[1].trim() : raw.trim();
    },
};


// ========== Site Configs ==========
const SITE_CONFIGS: Record<string, SiteConfig> = {
    "miruro.tv": MIRURO_CONFIG,
    "miruro.bz": MIRURO_CONFIG,
    "miruro.to": MIRURO_CONFIG,
    "miruro.ru": MIRURO_CONFIG,

    "crunchyroll.com": {
        watchPathIncludes: ["/watch", "/episode-"],
        selectors: {
            animeTitle:   "[data-t='show-title-link'] h4",
            episodeTitle: "h1.title",
            episodeNum:   "h1.title",
            cover:        ".bitmovinplayer-poster",
            video:        "video",
        },
        parseEpisodeTitle: function (raw) {
            return raw.includes(" - ") ? raw.split(" - ")[1].trim() : raw.trim();
        },
        parseEpisodeNumber: function (raw) {
            if (!raw) return "";
            const match = raw.trim().match(/^(?:E|Ep(?:isode)?)[\s:]*([0-9]+)/i) || raw.trim().match(/^([0-9]+)/);
            return match ? match[1].trim() : "";
        },
    },

    "animepahe.pw": {
        watchPathIncludes: ["/play"],
        selectors: {
            animeTitle:   "h1 a",
            episodeTitle: null,
            episodeNum:   "#episodeMenu",
            cover:        ".anime-poster",
            video:        "video",      // the player is a kwik.cx iframe that injects kwik.js into kwik.cx
        },
        parseEpisodeNumber: function (raw) {
            if (!raw) return "";
            const match = raw.trim().match(/^(?:E|Ep(?:isode)?)[\s:]*([0-9]+)/i) || raw.trim().match(/^([0-9]+)/);
            return match ? match[1].trim() : "";
        },
        parseCoverUrl: function (url) {
            return url.replace(".th.jpg", ".jpg");
        },
    },
};
