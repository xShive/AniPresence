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

// detail modal
const detailModal = document.querySelector<HTMLElement>(".modal-overlay");
const backBtn = document.querySelector(".back-btn");
const detailCover = document.querySelector<HTMLImageElement>(".detail-cover");
const detailTitle = document.querySelector(".detail-title");
const detailRomaji = document.querySelector(".detail-romaji");
const detailKanji = document.querySelector(".detail-kanji");
const detailType = document.querySelector(".detail-type");
const detailMean = document.querySelector(".detail-mean");
const detailRank = document.querySelector(".detail-rank");
const detailProgress = document.querySelector(".detail-progress");
const detailStatusDd = document.querySelector<HTMLElement>(".detail-status-dd");
const detailScoreDd = document.querySelector<HTMLElement>(".detail-score-dd");
const detailSynopsis = document.querySelector(".detail-synopsis");
const detailMal = document.querySelector<HTMLAnchorElement>(".detail-mal");
const epMinus = document.querySelector(".ep-minus");
const epPlus = document.querySelector(".ep-plus");
const synopsisToggle = document.querySelector(".synopsis-toggle");

// the anime/manga the modal is currently showing (so the +/- buttons know what to edit)
let currentDetailItem: Anime | Manga | null = null;


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
    const isDark = document.body.classList.toggle("dark");   // toggle returns true if "dark" is now on
    themeButton.textContent = isDark ? "light_mode" : "dark_mode";
    chrome.storage.local.set({ theme: isDark ? "dark" : "light" });   // remember the choice
}

// apply the saved theme on open
async function loadTheme() {
    const data = await chrome.storage.local.get("theme");
    if (data.theme === "dark") {
        document.body.classList.add("dark");
        themeButton.textContent = "light_mode";
    }
}


// ========== fetch once on load ==========
async function loadLists() {
    // check if we have lists in cache
    const cached = await chrome.storage.local.get(["animeList", "mangaList"]);
    if (cached.animeList && cached.mangaList) {
        fullAnimeList = cached.animeList;
        fullMangaList = cached.mangaList;
        renderPosters();
    }

    // fetch new list in background
    const [animeResp, mangaResp] = await Promise.all([
        fetch(`${LOCAL_URL}/mal/me/animelist`),
        fetch(`${LOCAL_URL}/mal/me/mangalist`)
    ]);
    fullAnimeList = await animeResp.json();
    fullMangaList = await mangaResp.json();
    renderPosters();        // re-render
    loadStatus();

    // save the new lists so next open is instant
    chrome.storage.local.set({ animeList: fullAnimeList, mangaList: fullMangaList });
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

// ========== detail modal ==========
// turn a MAL status pretty without underscores
function prettyStatus(status: string | null): string {
    if (!status) return "—";
    const spaced = status.replace(/_/g, " ");                 // plan_to_watch -> plan to watch
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);   // capitalise the first letter
}

// build {value,label} options for a status dropdown (anime or manga) so that plan_to_watch = Plan to watch
function statusOptions(isManga: boolean) {
    const labels = isManga ? mangaStatuses : animeStatuses;
    return labels.map(function (label) {
        return { value: label.toLowerCase().replace(/ /g, "_"), label: label };
    });
}

// build the score options 0-10 (0 shown as "-" = not rated)
function scoreOptions() {
    const opts = [{ value: "0", label: "—" }];
    for (let i = 1; i <= 10; i++) {
        opts.push({ value: String(i), label: String(i) });
    }
    return opts;
}

// fill dropdown: set its current label + build the menu items
function fillDropdown(wrap: HTMLElement, options: { value: string; label: string }[], current: string, onSelect: (value: string) => void) {
    const text = wrap.querySelector(".dropdown-text");
    const menu = wrap.querySelector(".dropdown-menu");
    menu.innerHTML = "";

    const currentOpt = options.find(function (o) { return o.value === current; });
    text.textContent = currentOpt ? currentOpt.label : "—";

    for (const opt of options) {
        const li = document.createElement("li");        // create new list ite\
        li.textContent = opt.label;
        li.addEventListener("click", function () {
            text.textContent = opt.label;      // show the picked label on the button
            wrap.classList.remove("open");      // close the menu
            onSelect(opt.value);                // hand the value to the caller
        });
        menu.appendChild(li);
    }
}

// build an EntryUpdate from the open item's CURRENT values and send it to MAL.
// every edit (episodes, status, score) funnels through here, so it always sends a full, consistent snapshot.
function pushUpdate() {
    if (!currentDetailItem) return;
    const item = currentDetailItem;
    const isManga = "num_chapters" in item;
    const progress = (isManga ? (item as Manga).chapters_read : (item as Anime).watched) || 0;

    update_status({
        is_manga: isManga,
        id: item.id,
        target_status: item.status,
        progress: progress,
        score: item.score,
    });
}

// the user picked a new status
function onStatusPick(value: string) {
    if (!currentDetailItem) return;
    currentDetailItem.status = value;   // update our object
    pushUpdate();                       // then send everything
}

// the user picked a new score
function onScorePick(value: string) {
    if (!currentDetailItem) return;
    currentDetailItem.score = Number(value);   // dropdown values are strings -> number
    pushUpdate();
}

// close any open custom dropdown when clicking outside it
function closeDropdownsOnOutsideClick(event: MouseEvent) {
    const dropdowns = document.querySelectorAll(".dropdown");
    for (const dd of dropdowns) {
        if (!dd.contains(event.target as Node)) {
            dd.classList.remove("open");
        }
    }
}

// fill the modal with the clicked item, then show it
function openDetail(item: Anime | Manga) {
    currentDetailItem = item;   // remember it so the +/- buttons can edit it

    const total = (item as Anime).num_episodes ?? (item as Manga).num_chapters;   // anime -> episodes, manga -> chapters
    const done  = (item as Anime).watched ?? (item as Manga).chapters_read;

    detailCover.src = item.cover ?? "";
    detailTitle.textContent = item.title_en || item.title || "Untitled";   // prefer English, fall back to romaji
    detailRomaji.textContent = item.title ?? "";
    detailKanji.textContent = item.title_ja ?? "";
    detailType.textContent = item.media_type ? item.media_type.toUpperCase() : "—";
    detailMean.textContent = item.mean != null ? String(item.mean) : "—";
    detailRank.textContent = item.rank != null ? "#" + item.rank : "—";
    detailProgress.textContent = `${done ?? 0} / ${total || "?"}`;
    fillDropdown(detailStatusDd, statusOptions("num_chapters" in item), item.status ?? "", onStatusPick);
    fillDropdown(detailScoreDd, scoreOptions(), String(item.score ?? 0), onScorePick);
    detailSynopsis.textContent = item.synopsis || "No synopsis available.";
    detailMal.href = `https://myanimelist.net/anime/${item.id}`;
    
    detailSynopsis.classList.remove("expanded");        // reset each time new modal opens
    synopsisToggle.textContent = "Show more...";
    detailModal.classList.remove("hidden");   // show the overlay
}

function closeDetail() {
    detailModal.classList.add("closing");                 // play the exit animation

    detailModal.addEventListener("animationend", function () {      // animation fires when animation finishes
        detailModal.classList.remove("closing");
        detailModal.classList.add("hidden");              // remove it from the page
    }, { once: true });
}

// bump the episode/chapter count by +1 or -1 and push it to MAL
function changeProgress(delta: number) {
    if (!currentDetailItem) return;
    const item = currentDetailItem;
    const isManga = "num_chapters" in item;    // manga objects have num_chapters, anime don't

    const total   = (isManga ? (item as Manga).num_chapters : (item as Anime).num_episodes) || 0;
    const current = (isManga ? (item as Manga).chapters_read : (item as Anime).watched) || 0;

    let next = current + delta;
    if (next < 0) next = 0;                     // can't go below 0
    if (total && next > total) next = total;    // can't exceed the total (only if the total is known)
    if (next === current) return;               // nothing changed -> don't bother MAL

    // keep our local object in sync so reopening shows the new number
    if (isManga) { (item as Manga).chapters_read = next; }
    else         { (item as Anime).watched = next; }

    detailProgress.textContent = `${next} / ${total || "?"}`;   // update the screen right away

    // reaching the last episode/chapter auto-marks it completed
    if (total && next === total && item.status !== "completed") {
        item.status = "completed";
        detailStatusDd.querySelector(".dropdown-text").textContent = "Completed";   // reflect it in the dropdown too
    }

    pushUpdate();   // send the full snapshot to MAL
}

// click the bg to close
detailModal.addEventListener("click", function (event) {
    if (event.target === detailModal) {
        closeDetail();
    }
});

// update anime status
async function update_status(status: EntryUpdate) {
    await fetch(`${LOCAL_URL}/mal/me/update/status`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(status)
    })
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

        // click a cover -> open the detail modal filled with this item
        card.addEventListener("click", function () {
            openDetail(item);
        });

        card.appendChild(img);
        card.appendChild(overlay);
        grid.appendChild(card);
    }
}

synopsisToggle.addEventListener("click", function () {
    const expanded = detailSynopsis.classList.toggle("expanded");
    synopsisToggle.textContent = expanded ? "Show less" : "Show more...";
})


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
loadTheme();
fillStatusMenu(animeStatuses);
loadLists();
statusButton.addEventListener("click", toggleStatusMenu);
modeSwitch.addEventListener("click", toggleMode);
themeButton.addEventListener("click", toggleTheme);
backBtn.addEventListener("click", function () { closeDetail(); });
epMinus.addEventListener("click", function () { changeProgress(-1); });
epPlus.addEventListener("click", function () { changeProgress(1); });
detailStatusDd.querySelector(".dropdown-btn").addEventListener("click", function () { detailStatusDd.classList.toggle("open"); });
detailScoreDd.querySelector(".dropdown-btn").addEventListener("click", function () { detailScoreDd.classList.toggle("open"); });
document.addEventListener("click", closeMenuOnOutsideClick);
document.addEventListener("click", closeDropdownsOnOutsideClick);