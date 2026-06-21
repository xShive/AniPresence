// =====================================================================
// logic for the extension
// =====================================================================

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
const detailEpisode = document.querySelector(".episode-label");
const detailProgress = document.querySelector(".detail-progress");
const detailStatusDd = document.querySelector<HTMLElement>(".detail-status-dd");
const detailScoreDd = document.querySelector<HTMLElement>(".detail-score-dd");
const detailSynopsis = document.querySelector(".detail-synopsis");
const detailMal = document.querySelector<HTMLAnchorElement>(".detail-mal");
const detailCountdown = document.querySelector(".detail-countdown");
const countdownRow = document.querySelector<HTMLElement>(".countdown-row");
const epMinus = document.querySelector(".ep-minus");
const epPlus = document.querySelector(".ep-plus");
const synopsisToggle = document.querySelector(".synopsis-toggle");

// the anime/manga the modal is currently showing (so the +/- buttons know what to edit)
let currentDetailItem: Anime | Manga | null = null;

// account modal
const accountOverlay = document.querySelector<HTMLElement>(".account-overlay");
const accountBtn = document.querySelector(".account-btn");
const accountBack = document.querySelector(".account-back");
const accountIn = document.querySelector<HTMLElement>(".account-in");
const accountOut = document.querySelector<HTMLElement>(".account-out");
const accountName = document.querySelector(".account-name");
const accountMean = document.querySelector(".account-mean");
const accountDays = document.querySelector(".account-days");
const accountEps = document.querySelector(".account-eps");
const accountCompleted = document.querySelector(".account-completed");
const accountConnect = document.querySelector(".account-connect");
const accountDisconnect = document.querySelector(".account-disconnect");

// settings modal
const settingsOverlay = document.querySelector<HTMLElement>(".settings-overlay");
const ghostSwitch = document.querySelector<HTMLElement>(".ghost-switch");
const settingsVersion = document.querySelector(".settings-version");
const updateBtn = document.querySelector<HTMLButtonElement>(".update-btn");
const settingsBtn = document.querySelector(".settings-btn")
const settingsBack = document.querySelector(".settings-back");

let userInfo: any = null;   // the /mal/me profile, or null when logged out


// ========== data ==========
// LOCAL_URL now comes from helpers.js (loaded before dashboard.js)
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
        fullAnimeList = cached.animeList as Anime[];   // storage returns loose types; we know the shape
        fullMangaList = cached.mangaList as Manga[];
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


// ========== account modal ==========
// fetch the profile (or null) and paint the right state
async function loadAccount() {
    const resp = await fetch(`${LOCAL_URL}/mal/me`);
    userInfo = await resp.json();   // null when not logged in
    renderAccount();
}

function renderAccount() {
    if (userInfo) {
        accountOut.classList.add("hidden");
        accountIn.classList.remove("hidden");

        const stats = userInfo.anime_statistics || {};
        accountName.textContent = userInfo.name ?? "";
        accountMean.textContent = stats.mean_score != null ? String(stats.mean_score) : "—";
        accountDays.textContent = stats.num_days_watched != null ? String(stats.num_days_watched) : "—";
        accountEps.textContent = stats.num_episodes != null ? stats.num_episodes.toLocaleString() : "—";
        accountCompleted.textContent = stats.num_items_completed != null ? String(stats.num_items_completed) : "—";
    } else {
        accountIn.classList.add("hidden");
        accountOut.classList.remove("hidden");
    }
}

function openAccount() {
    accountOverlay.classList.remove("hidden");
}

function closeAccount() {
    accountOverlay.classList.add("closing");
    accountOverlay.addEventListener("animationend", function () {
        accountOverlay.classList.remove("closing");
        accountOverlay.classList.add("hidden");
    }, { once: true });
}

// connect: kick off MAL login (opens a browser tab via Python)
function connectMal() {
    fetch(`${LOCAL_URL}/mal/login`);
}

// disconnect: drop the token, clear data, flip to the signed-out state
async function disconnectMal() {
    await fetch(`${LOCAL_URL}/mal/logout`, { method: "POST" });
    userInfo = null;
    fullAnimeList = [];
    fullMangaList = [];
    chrome.storage.local.remove(["animeList", "mangaList"]);   // wipe the cache too
    renderPosters();        // clears the grid
    renderAccount();        // shows the connect prompt
}

// how long until the next episode airs
// MAL's broadcast day + time are in JST (UTC+9) so we do math in JST then convert back.
function nextEpisodeIn(broadcast: { day_of_the_week?: string; start_time?: string } | null | undefined): string | null {
    if (!broadcast || !broadcast.day_of_the_week || !broadcast.start_time) return null;

    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const targetDay = days.indexOf(broadcast.day_of_the_week.toLowerCase());
    if (targetDay === -1) return null;

    const [hh, mm] = broadcast.start_time.split(":").map(Number);

    const now = new Date();
    // shift "now" +9h so its UTC fields read as the current JST wall-clock
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    const dayDiff = (targetDay - jstNow.getUTCDay() + 7) % 7;   // days until that weekday (in JST)

    // build the target JST wall-clock moment, then convert that back to a real UTC instant (-9h)
    const targetJst = Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() + dayDiff, hh, mm, 0);
    let airTime = targetJst - 9 * 60 * 60 * 1000;

    if (airTime <= now.getTime()) {           // already passed this week -> jump a week
        airTime += 7 * 24 * 60 * 60 * 1000;
    }

    const diffMin = Math.floor((airTime - now.getTime()) / 60000);
    const d = Math.floor(diffMin / (60 * 24));
    const h = Math.floor((diffMin % (60 * 24)) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h`;
    return `${diffMin % 60}m`;
}

// fill the modal with the clicked item, then show it
function openDetail(item: Anime | Manga) {
    currentDetailItem = item;   // remember it so the +/- buttons can edit it

    const total = (item as Anime).num_episodes ?? (item as Manga).num_chapters;   // anime -> episodes, manga -> chapters
    const done  = (item as Anime).watched ?? (item as Manga).chapters_read;
    const isManga = "num_chapters" in item;

    detailCover.src = item.cover ?? "";
    detailTitle.textContent = item.title_en || item.title || "Untitled";   // prefer English, fall back to romaji
    detailRomaji.textContent = item.title ?? "";
    detailKanji.textContent = item.title_ja ?? "";
    detailType.textContent = item.media_type ? item.media_type.toUpperCase() : "—";
    detailMean.textContent = item.mean != null ? String(item.mean) : "—";
    detailRank.textContent = item.rank != null ? "#" + item.rank : "—";
    detailEpisode.textContent = isManga ? "Chapters" : "Episodes";
    detailProgress.textContent = `${done ?? 0} / ${total || "?"}`;
    fillDropdown(detailStatusDd, statusOptions("num_chapters" in item), item.status ?? "", onStatusPick);
    fillDropdown(detailScoreDd, scoreOptions(), String(item.score ?? 0), onScorePick);
    detailSynopsis.textContent = item.synopsis || "No synopsis available.";
    detailMal.href = `https://myanimelist.net/anime/${item.id}`;

    // next-episode countdown: only for shows that are actually still airing
    const isAiring = (item as Anime).airing_status === "currently_airing";
    const countdown = isAiring ? nextEpisodeIn((item as Anime).broadcast) : null;
    if (countdown) {
        detailCountdown.textContent = countdown;
        countdownRow.classList.remove("hidden");
    } else {
        countdownRow.classList.add("hidden");
    }

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
    const list = (isManga ? fullMangaList : fullAnimeList) || [];   // || [] -> never crash on a null list (logged out)
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

function openSettings() {
    loadSettings();                              // refresh the toggle + update check each time it opens
    settingsOverlay.classList.remove("hidden");
}

// pull the current ghost state + version + update status into the settings panel
async function loadSettings() {
    settingsVersion.textContent = "Version " + chrome.runtime.getManifest().version;

    // ghost state lives in /status
    const resp = await fetch(`${LOCAL_URL}/status`);
    const status: LiveStatus = await resp.json();
    ghostSwitch.classList.toggle("on", status.ghost_mode);

    checkUpdate();
}

// ask Python if there's a newer release
function checkUpdate() {
    updateBtn.textContent = "Checking…";
    fetch(`${LOCAL_URL}/update`)
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data.latest_version) {
                updateBtn.textContent = "Up to date";
                updateBtn.onclick = null;
            } else {
                updateBtn.textContent = "Download " + data.latest_version;
                updateBtn.onclick = function () { window.open(data.download_url); };
            }
        });
}

// flip ghost mode by hitting python api
async function toggleGhost() {
    const resp = await fetch(`${LOCAL_URL}/ghost`, { method: "POST" });
    const data = await resp.json();
    ghostSwitch.classList.toggle("on", data.ghost_mode);
}

function closeSettings() {
    settingsOverlay.classList.add("closing");
    settingsOverlay.addEventListener("animationend", function () {
        settingsOverlay.classList.remove("closing");
        settingsOverlay.classList.add("hidden");
    }, { once: true });
}


// ========== boot ==========
// check login first: logged in -> load lists; logged out -> show the connect prompt (no crash)
async function boot() {
    await loadAccount();
    if (userInfo) {
        loadLists();
    } else {
        openAccount();
    }
}


// ========== fill versionm, menu, add listeners ==========
versionText.textContent = "v" + chrome.runtime.getManifest().version;
loadTheme();
fillStatusMenu(animeStatuses);
boot();
statusButton.addEventListener("click", toggleStatusMenu);
modeSwitch.addEventListener("click", toggleMode);
themeButton.addEventListener("click", toggleTheme);
backBtn.addEventListener("click", function () { closeDetail(); });
epMinus.addEventListener("click", function () { changeProgress(-1); });
epPlus.addEventListener("click", function () { changeProgress(1); });
detailStatusDd.querySelector(".dropdown-btn").addEventListener("click", function () { detailStatusDd.classList.toggle("open"); });
detailScoreDd.querySelector(".dropdown-btn").addEventListener("click", function () { detailScoreDd.classList.toggle("open"); });
accountBtn.addEventListener("click", openAccount);
accountBack.addEventListener("click", closeAccount);
accountConnect.addEventListener("click", connectMal);
accountDisconnect.addEventListener("click", disconnectMal);
accountOverlay.addEventListener("click", function (event) { if (event.target === accountOverlay) closeAccount(); });
document.addEventListener("click", closeMenuOnOutsideClick);
document.addEventListener("click", closeDropdownsOnOutsideClick);
settingsBtn.addEventListener("click", openSettings);
settingsBack.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", function (event) { if (event.target === settingsOverlay) closeSettings(); });
ghostSwitch.addEventListener("click", toggleGhost);
