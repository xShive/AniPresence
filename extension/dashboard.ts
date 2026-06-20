// ========== grab elements ==========
const versionText = document.querySelector(".version");
const statusWrap = document.querySelector(".status-wrap");
const statusButton = document.querySelector(".status-select");
const statusText = document.querySelector(".status-text");
const statusMenu = document.querySelector(".status-menu");
const modeSwitch = document.querySelector(".mode-switch");
const modeText = document.querySelector(".mode-text");
const themeButton = document.querySelector(".theme-btn");

// discord strip
const stripCover = document.querySelector<HTMLImageElement>(".strip-cover");
const stripTitle = document.querySelector(".strip-title");
const stripSubtitle = document.querySelector(".strip-subtitle");
const stripMeta = document.querySelector<HTMLElement>(".strip-meta");
const stripStatus = document.querySelector(".strip-status");
const pillProgress = document.querySelector(".pill-progress");
const pillScore = document.querySelector(".pill-score");
const pillType = document.querySelector(".pill-type");


// ========== data ==========
const LOCAL_URL = "http://127.0.0.1:5001";   // our local Python server
const animeStatuses = ["Watching", "Completed", "On hold", "Dropped", "Plan to watch"];
const mangaStatuses = ["Reading", "Completed", "On hold", "Dropped", "Plan to read"];
let fullAnimeList: Anime[] = [];
let fullMangaList: Manga[]  = [];


// ========== status dropdown ==========
// open/close the menu (click the button)
function toggleStatusMenu() {
    statusWrap.classList.toggle("open");    // add/remove "open" on the wrapper -> CSS shows/hides the menu
}

// build the menu items from a status list (called on load and on anime/manga switch)
function fillStatusMenu(statuses: string[]) {
    statusText.textContent = statuses[0];   // reset the button to the first status
    statusMenu.innerHTML = "";              // remove the old <li>'s

    for (const status of statuses) {
        const li = document.createElement("li");
        li.textContent = status;
        li.addEventListener("click", selectStatus);
        statusMenu.appendChild(li);
    }
}

// pick an option (click an <li>)
function selectStatus(event: MouseEvent) {
    const target = event.target as HTMLElement;          // event.target is a generic EventTarget; cast to read text
    statusText.textContent = target.textContent;         // put the clicked word on the button
    statusWrap.classList.remove("open");                 // close the menu
    renderPosters()
}

// close the menu when clicking anywhere outside it
function closeMenuOnOutsideClick(event: MouseEvent) {
    if (!statusWrap.contains(event.target as Node)) {    // event.target = what was clicked
        statusWrap.classList.remove("open");
    }
}


// ========== anime / manga toggle ==========
function toggleMode() {
    modeSwitch.classList.toggle("manga");

    if (modeSwitch.classList.contains("manga")) {
        modeText.textContent = "Manga";
        fillStatusMenu(mangaStatuses);
    } else {
        modeText.textContent = "Anime";
        fillStatusMenu(animeStatuses);
    }
    renderPosters()
}


// ========== dark mode ==========
function toggleTheme() {
    document.body.classList.toggle("dark");             // CSS swaps the whole palette off this class

    if (document.body.classList.contains("dark")) {
        themeButton.textContent = "light_mode";         // show the sun in dark mode
    } else {
        themeButton.textContent = "dark_mode";          // show the moon in light mode
    }
}


// ========== fetch once on load ==========
async function loadLists() {
    const [animeResp, mangaResp] = await Promise.all([
        fetch(`${LOCAL_URL}/mal/me/animelist`),
        fetch(`${LOCAL_URL}/mal/me/mangalist`)
    ]);
    fullAnimeList = await animeResp.json();
    fullMangaList = await mangaResp.json();
    renderPosters();
    loadStatus();               // lists are ready, so the strip pills can match
}


// ========== discord strip ==========
// hit api to fetch current data
async function loadStatus() {
    const resp = await fetch(`${LOCAL_URL}/status`);
    const status: LiveStatus = await resp.json();
    renderStrip(status);
}

function renderStrip(status: LiveStatus) {
    // nothing playing -> idle state
    if (!status.is_watching) {
        stripCover.style.display = "none";
        stripTitle.textContent = "Nothing playing";
        stripSubtitle.textContent = "Start an episode to see it here";
        stripMeta.style.visibility = "hidden";
        stripStatus.textContent = status.ghost_mode ? "Ghost" : "Idle";
        return;
    }

    // live playback (from the browser scrape, via Python)
    stripCover.src = status.cover ?? "";
    stripTitle.textContent = status.anime_title ?? "";

    let subtitle = status.episode_title;
    stripSubtitle.textContent = subtitle;

    stripStatus.textContent = status.ghost_mode ? "Ghost" : "Visible";

    fillStripPills(status.anime_title, status.episode_line);
}

// fill pills using MAL list data
function fillStripPills(title: string | null, episode_line: string | null) {
    const match = findAnimeByTitle(title);
    if (!match) {
        stripMeta.style.visibility = "hidden";   // no MAL match -> no metadata to show
        return;
    }
    stripMeta.style.visibility = "visible";

    const epNum = episode_line ? episode_line.replace(/\D/g, "") : "";
    pillProgress.textContent = `${epNum || match.watched || 0} / ${match.num_episodes || "?"}`;
    pillScore.textContent = match.mean != null ? String(match.mean) : "—";
    pillType.textContent = match.media_type ? match.media_type.toUpperCase() : "—";
}

// find the currently-watched anime in the loaded list
function findAnimeByTitle(title: string | null): Anime | null {
    if (!title) return null;
    const target = title.toLowerCase().trim();

    for (const anime of fullAnimeList) {
        const names = [anime.title, anime.title_en, ...(anime.synonyms ?? [])];
        for (const name of names) {
            if (name && name.toLowerCase().trim() === target) {
                return anime;
            }
        }
    }
    return null;
}

// ========== renderPosters ==========
function renderPosters() {
    const isManga = modeSwitch.classList.contains("manga");
    const list = isManga ? fullMangaList : fullAnimeList;
    const status = statusText.textContent.toLowerCase().replace(/ /g, "_");

    const grid = document.querySelector(".grid");
    grid.innerHTML = "";                       // clear old posters

    for (const item of list) {
        if (item.status !== status) continue;  // skip ones that don't match

        const card = document.createElement("div");
        card.className = "poster";             // wrapper: anchors the overlay

        const img = document.createElement("img");
        img.className = "poster-img";
        img.src = item.cover ?? "";            // ?? "" handles a null cover

        const overlay = document.createElement("div");
        overlay.className = "poster-overlay";
        overlay.innerHTML =
            `<div class="poster-title">${item.title ?? ""}</div>` +
            `<div class="poster-meta">★ ${item.score ?? "—"}</div>`;

        card.appendChild(img);
        card.appendChild(overlay);
        grid.appendChild(card);
    }
}



// ========== UPDATE CHECK (disabled — moving into Settings later) ==========
/* fetch("http://127.0.0.1:5001/update")
    .then(function (response) {
        return response.json();
    })
    .then(function (data) {
        let latest_version = data["latest_version"];
        let download_url = data["download_url"];

        if (!latest_version) {
            document.getElementById("download-button").textContent = "Up to date!";
            return;
        }

        function openURL() {
            window.open(download_url);
        }

        document.getElementById("download-button").textContent = "Download " + latest_version;
        document.getElementById("download-button").onclick = openURL;
    });
*/


// ========== fill versionm, menu, add listeners ==========
versionText.textContent = "v" + chrome.runtime.getManifest().version;
fillStatusMenu(animeStatuses);
loadLists();
statusButton.addEventListener("click", toggleStatusMenu);
modeSwitch.addEventListener("click", toggleMode);
themeButton.addEventListener("click", toggleTheme);
document.addEventListener("click", closeMenuOnOutsideClick);