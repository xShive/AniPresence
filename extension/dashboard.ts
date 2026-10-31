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
const detailStats = document.querySelector(".detail-stats");

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
const ghostSwitch = document.querySelector(".ghost-switch");
const autoProgressSwitch = document.querySelector(".auto-progress-switch")
const settingsVersion = document.querySelector(".settings-version");
const updateBtn = document.querySelector<HTMLButtonElement>(".update-btn");
const settingsBtn = document.querySelector(".settings-btn")
const settingsBack = document.querySelector(".settings-back");

// footer
const notifyWrapper = document.querySelector(".notify-activity");
const notifyText = document.querySelector(".notify-activity p");


// error popup modal
const errorOverlay = document.querySelector(".popup-overlay");
const errorMessage = document.querySelector(".error-message");
const errorClose = document.querySelector(".close-btn");

// ========== state ==========
// LOCAL_URL now comes from helpers.js (loaded before dashboard.js)
const animeStatuses = ["Watching", "Completed", "On hold", "Dropped", "Plan to watch"];
const mangaStatuses = ["Reading", "Completed", "On hold", "Dropped", "Plan to read"];
let fullAnimeList: Anime[] = [];
let fullMangaList: Manga[]  = [];
let currentDetailItem: Anime | Manga | null = null;   // the anime/manga the modal is showing (so the +/- buttons know what to edit)
let userInfo: any = null;                             // the /mal/me profile, or null when logged out
let listEdited = false;                               // did you edit a list since load? -> ignore the late background fetch if so


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


// ========== lists (load + render the grid) ==========
// fetch once on load: show the cached copy instantly, then refetch and re-save
async function loadLists() {
    showTask("Fetching lists...")

    // fetch new list in background (slow)
    try {
        const [animeResp, mangaResp] = await Promise.all([
            fetch(`${LOCAL_URL}/mal/me/animelist`),
            fetch(`${LOCAL_URL}/mal/me/mangalist`)
        ]);
        if (!animeResp.ok) {
            const errorData: { error?: string } | null = await animeResp.json().catch(() => null);
            throw new Error(errorData?.error || `${animeResp.status} ${animeResp.statusText}`);
        }
        if (!mangaResp.ok) {
            const errorData: { error?: string } | null = await mangaResp.json().catch(() => null);
            throw new Error(errorData?.error || `${mangaResp.status} ${mangaResp.statusText}`);
        }

        const animeData: Anime[] | null = await animeResp.json();
        const mangaData: Manga[] | null = await mangaResp.json();

        if (!listEdited) {
            fullAnimeList = animeData;
            fullMangaList = mangaData;
            renderPosters();        // re-render
            chrome.storage.local.set({ animeList: fullAnimeList, mangaList: fullMangaList });
        }
    }
    catch(error: unknown) {
        showError(error instanceof Error ? error.message : String(error));  
    }
    finally {
        hideTask();
    }
}

// build a poster for every item in the current list (anime or manga) that matches the picked status
function renderPosters() {
    const isManga = modeSwitch.classList.contains("manga");
    const list = (isManga ? fullMangaList : fullAnimeList) || [];   // || [] -> never crash on a null list (logged out)
    const status = statusText.textContent.toLowerCase().replace(/ /g, "_");

    const grid = document.querySelector(".grid");
    grid.innerHTML = "";                       // clear old posters

    for (const item of list) {
        let isRewatching: boolean = false;

        if ((item as Anime).is_rewatching && item.status === "completed" && status == "watching") isRewatching = true;
        if ((item.status !== status && !isRewatching) || ((item as Anime).is_rewatching && status === "completed")) continue;  // skip ones that don't match selected status)

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


// ========== discord strip ==========
// hit api to fetch current data to fill in strip + check error
async function loadStatus() {
    try {
        const resp = await fetch(`${LOCAL_URL}/status`);
        const status: LiveStatus = await resp.json();
        renderStrip(status);
        chrome.storage.local.set({ lastStatus: status});
        if (status.auto_progress_error) {
            showError(status.auto_progress_error, ((): Promise<Response> => {
                return fetch(`${LOCAL_URL}/autoprogress/error/clear`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json"}
                });
            }));
        }
    }
    catch (error: unknown) {
        showError(error instanceof Error ? error.message : String(error));
    }
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

// normalize  crunchyroll title, turn "4th season" into "season 4",
// then strip punctuation
function normalizeTitle(s: string): string {
    return s
        .toLowerCase()
        .replace(/(\d+)\s*(?:st|nd|rd|th)\s+season/g, "season $1")   // "4th season" -> "season 4"
        .replace(/[^a-z0-9]+/g, " e")                                // drop punctuation / symbols
        .trim()
        .replace(/\s+/g, " ");                                      // collapse double spaces
}

// find the currently-watched anime in the loaded list
function findAnimeByTitle(title: string | null): Anime | null {
    if (!title) return null;
    const target = normalizeTitle(title);

    for (const anime of fullAnimeList) {
        const names = [anime.title, anime.title_en, ...(anime.synonyms ?? [])];
        for (const name of names) {
            if (name && normalizeTitle(name) === target) {
                return anime;
            }
        }
    }
    return null;
}


// ========== detail modal: dropdown + countdown helpers ==========
// turn a MAL status pretty without underscores
function prettyStatus(status: string | null): string {
    if (!status) return "—";
    const spaced = status.replace(/_/g, " ");                 // plan_to_watch -> plan to watch
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);   // capitalise the first letter
}

// build {value,label} options for a status dropdown (anime or manga) so that plan_to_watch = Plan to watch
function statusOptions(isManga: boolean) {
    const labels = isManga ? mangaStatuses : animeStatuses;
    const opts = labels.map(function (label) {
        return { value: label.toLowerCase().replace(/ /g, "_"), label: label };
    });
    // rewatching isnt a real mal status
    if (!isManga) {
        opts.push({ value: "rewatching", label: "Rewatching" });
    }
    return opts;
}

// build the score options 0-10 (0 shown as "-" = not rated)
function scoreOptions() {
    const opts = [{ value: "0", label: "—" }];
    for (let i = 1; i <= 10; i++) {
        opts.push({ value: String(i), label: String(i) });
    }
    return opts;
}

/**
 * Fills a custom dropdown with its selected label and clickable options.
 * Registers click handlers now; they run later when an option is clicked.
 * Each handler updates the button text, closes the menu, then calls the callback.
 * Changing the displayed text does not change the selected anime/manga object.
 *
 * @param wrap - the .dropdown element to fill
 * @param options - Choices whose label is displayed and whose value is passed to the callback.
 * @param selectedValue - Value used to find the initially selected option's label.
 * @param onOptionSelected - Callback receiving the new value and the PREVIOUS
 * button label. The old label is captured before replacing it, so the callback
 * can restore it if saving fails. Called after updating the text and closing the menu.
 */
function fillDropdown(wrap: HTMLElement, options: { value: string; label: string }[], selectedValue: string, onOptionSelected: (value: string, previousLabel: string | null) => void) {
    const selectedTextEl = wrap.querySelector(".dropdown-text");
    const optionsListEl = wrap.querySelector(".dropdown-menu");
    optionsListEl.innerHTML = "";

    const selectedOption = options.find((option) => option.value === selectedValue);    // find value-label pair matching current
    selectedTextEl.textContent = selectedOption ? selectedOption.label : "—";

    for (const option of options) {
        const optionEl = document.createElement("li");
        optionEl.textContent = option.label;
        optionEl.addEventListener("click", () => {
            const previousLabel = selectedTextEl.textContent;   // save for fallback
            selectedTextEl.textContent = option.label;
            wrap.classList.remove("open");
            onOptionSelected(option.value, previousLabel);
        });
        optionsListEl.appendChild(optionEl);
    }
}

function fillTags(tags: string[]) {
    console.log("fillTags:", tags);
    const tags_wrapper = document.querySelector(".detail-tags");
    tags_wrapper.innerHTML = "";
    if (!tags.length) return;

    for (const tag of tags) {
        const pill = document.createElement("span");
        pill.textContent = tag;
        pill.classList.add("detail-pill", "detail-tag")
        tags_wrapper.appendChild(pill);
    }
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


// ========== detail modal: open / close ==========
/**
 * fill the detail modal with a clicked entry and show it. stores the entry in
 * currentDetailItem so the +/- buttons and dropdowns know what to edit.
 *
 * @param item - the anime or manga whose poster was clicked
 */
function openDetail(item: Anime | Manga) {
    currentDetailItem = item;   // remember it so the +/- buttons can edit it
    
    const total = (item as Anime).num_episodes ?? (item as Manga).num_chapters;   // anime -> episodes, manga -> chapters
    const done  = (item as Anime).watched ?? (item as Manga).chapters_read;         
    const isManga = "num_chapters" in item;
    const type = isManga ? "manga" : "anime";

    detailCover.src = item.cover ?? "";
    detailTitle.textContent = item.title_en || item.title || "Untitled";   // prefer English, fall back to romaji
    detailRomaji.textContent = item.title ?? "";
    detailKanji.textContent = item.title_ja ?? "";
    detailType.textContent = item.media_type ? item.media_type.toUpperCase() : "—";
    detailMean.textContent = item.mean != null ? String(item.mean) : "—";
    detailRank.textContent = item.rank != null ? "#" + item.rank : "—";
    detailEpisode.textContent = isManga ? "Chapters" : "Episodes";
    detailProgress.textContent = `${done ?? 0} / ${total || "?"}`;
    const currentStatus = (item as Anime).is_rewatching ? "rewatching" : (item.status ?? "");
    fillDropdown(detailStatusDd, statusOptions("num_chapters" in item), currentStatus, onStatusPick);
    if ((item as Anime).is_rewatching) {
        const times = ((item as Anime).num_times_rewatched ?? 0) + 1;   // current rewatch number
        detailStatusDd.querySelector(".dropdown-text").textContent = `Rewatch #${times}`;
    }
    fillDropdown(detailScoreDd, scoreOptions(), String(item.score ?? 0), onScorePick);
    fillTags(item.tags);
    detailSynopsis.textContent = item.synopsis || "No synopsis available.";
    detailMal.href = `https://myanimelist.net/${type}/${item.id}`;

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


// ========== detail modal: edits ==========
/**
 * Changes the episode/chapter count immediately, then awaits saving to MAL.
 * On failure, restores the old object fields AND the old visible text.
 *
 * The +/- button calls this directly: unlike a dropdown option, it has not
 * changed any text before this function starts. Both old labels can therefore
 * be read directly from the HTML before editing.
 *
 * Reaching the end also changes status; finishing a rewatch additionally changes
 * is_rewatching and num_times_rewatched. All of these need rollback, not just progress.
 * updateStatus() displays the error and rethrows; this function handles restoring state.
 *
 * @param delta - +1 or -1
 */
async function changeProgress(delta: number) {
    if (!currentDetailItem) return;
    const item = currentDetailItem;
    const isManga = "num_chapters" in item;

    // Remember old data
    const fallback_status = item.status;
    const fallback_progress_value = isManga
    ? (item as Manga).chapters_read
    : (item as Anime).watched;
    const progressTextEl = detailProgress;
    const statusTextEl = detailStatusDd.querySelector(".dropdown-text");
    const fallback_progress_text = progressTextEl.textContent;
    const fallback_status_text = statusTextEl.textContent; // Includes wording such as "Rewatch #1"
    const fallback_is_rewatching = (item as Anime).is_rewatching;
    const fallback_rewatch_count = (item as Anime).num_times_rewatched;

    const total   = (isManga ? (item as Manga).num_chapters : (item as Anime).num_episodes) || 0;
    const current = (isManga ? (item as Manga).chapters_read : (item as Anime).watched) || 0;

    let next = current + delta;
    if (next < 0) next = 0;                     // can't go below 0
    if (total && next > total) next = total;    // can't exceed the total (only if the total is known)
    if (next === current) return;               // nothing changed -> don't bother MAL

    // apply locally
    if (isManga) { (item as Manga).chapters_read = next; }
    else         { (item as Anime).watched = next; }

    detailProgress.textContent = `${next} / ${total || "?"}`;   // update the screen right away

    // reaching the last episode/chapter auto-marks it completed
    if (total && next === total && item.status !== "completed") {
        item.status = "completed";
        detailStatusDd.querySelector(".dropdown-text").textContent = "Completed";   // reflect it in the dropdown too
    }

    // finishing a rewatch: reached the end while rewatching -> bump the count + turn rewatching off
    if (total && next === total && (item as Anime).is_rewatching) {
        (item as Anime).num_times_rewatched = ((item as Anime).num_times_rewatched ?? 0) + 1;
        (item as Anime).is_rewatching = false;
        detailStatusDd.querySelector(".dropdown-text").textContent = "Completed";
    }

    try {
        await pushUpdate();
    }
    catch (error) {
        item.status = fallback_status;

        if (isManga) {
            (item as Manga).chapters_read = fallback_progress_value;
        } else {
            (item as Anime).watched = fallback_progress_value;
            (item as Anime).is_rewatching = fallback_is_rewatching;
            (item as Anime).num_times_rewatched = fallback_rewatch_count;
        }

        // check if user already swapped screens
        if (currentDetailItem === item) {
            progressTextEl.textContent = fallback_progress_text;
            statusTextEl.textContent = fallback_status_text;
        }
    }
}

/**
 * Applies a chosen status immediately, then awaits saving; restores it on failure.
 *
 * fillDropdown() has ALREADY changed the status button before calling this.
 * It captures the old label first and passes it as previousLabel. Reading the
 * button here would read the NEW label, so use that argument for rollback.
 *
 * @param value - New option value, e.g. "plan_to_watch" or "rewatching".
 * @param previousLabel - Status button text captured BEFORE the option click replaced it.
 */
async function onStatusPick(value: string, previousLabel: string | null) {
    if (!currentDetailItem) return;
    const item = currentDetailItem as Anime;

    // Remember old data
    const fallback_status = item.status;
    const fallback_is_rewatching = item.is_rewatching;
    const fallback_watched = item.watched;
    const progressTextEl = detailProgress;
    const statusTextEl = detailStatusDd.querySelector(".dropdown-text");
    const fallback_progress_text = progressTextEl.textContent;
    const fallback_status_text = previousLabel;

    // Rewatching = completed + boolean
    if (value === "rewatching") {
        item.is_rewatching = true;
        item.status = "completed";
        item.watched = 0;               // start the rewatch from episode 0
        detailProgress.textContent = `0 / ${item.num_episodes || "?"}`;
    } else {
        item.is_rewatching = false;     // any real status turns rewatching off
        item.status = value;
    }

    try {
        await pushUpdate();
    }
    catch (error) {
        item.status = fallback_status;
        item.is_rewatching = fallback_is_rewatching;
        item.watched = fallback_watched;
        // check if user already swapped screens
        if (currentDetailItem === item) {
            statusTextEl.textContent = fallback_status_text;
            progressTextEl.textContent = fallback_progress_text;
        }
    }
}

/**
 * Applies a chosen rating, awaits saving, and rolls back on failure.
 *
 * @param value - New score as an option string, e.g. "9".
 * @param previousLabel - Score button text from before the click changed it.
 */
async function onScorePick(value: string, previousLabel: string | null) {
    if (!currentDetailItem) return;
    const item = currentDetailItem; // Keep the edited object even if another entry is opened while awaiting.
    const scoreTextEl = detailScoreDd.querySelector(".dropdown-text");

    // Remember old data (and old button label)
    const fallback_score = item.score;
    const fallback_score_text = previousLabel;

    // Change local object (button label already changed in dropdown())
    item.score = Number(value);
    try {
        await pushUpdate();
    }
    catch (error) {
        item.score = fallback_score;

        // check if user already swapped screens
        if (currentDetailItem === item) {
            scoreTextEl.textContent = fallback_score_text;
        }
    } 
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


// ========== detail modal: build + send the update ==========
/**
 * build a slim EntryUpdate from currentDetailItem (only what mal writes: id, status,
 * progress, score, plus anime rewatch fields) and send it to python -> mal. also
 * writes the edit back into the live list + cache so the grid and reopen stay in sync.
 * every edit (episodes, status, score) funnels through here.
 */
async function pushUpdate() {
    if (!currentDetailItem) return;

    // avoid sending another update
    detailStats.classList.add("saving");

    const item = currentDetailItem;
    const isManga = "num_chapters" in item;
    const progress = (isManga ? (item as Manga).chapters_read : (item as Anime).watched) || 0;

    try {
        await updateStatus({
            is_manga: isManga,
            id: item.id,
            target_status: item.status,
            progress: progress,
            score: item.score,
            is_rewatching: isManga ? undefined : ((item as Anime).is_rewatching ?? false),      // undefined: JSON.jsonify removes these entries. null: python sees as None
            num_times_rewatched: isManga ? undefined : ((item as Anime).num_times_rewatched ?? 0),
        });
    }
    catch (error) {
        throw error;        // propegate error from updateStatus back to caller
    }
    finally {
        detailStats.classList.remove("saving");
    }

    // bug: you click card from the cache array, so currentDetailItem points into it. (cuz MAL is still fetching)
    // then mal fetch finishes and does fullAnimeList = the new mal array
    // + edits the cache array's object, but the save in pushUpdate below saves fullAnimeList = the mal array,
    // which never got edit -> cache ends up with mal's old number
    const list: (Anime | Manga)[] = isManga ? fullMangaList : fullAnimeList;
    for (let i = 0; i < list.length; i++) {
        if (list[i].id === item.id) {
            list[i] = item;         // item = from cache // list = new
            break;
        }
    }

    chrome.storage.local.set({ animeList: fullAnimeList, mangaList: fullMangaList });
    listEdited = true;   // our local copy is now newer than any in-flight fetch -> tell loadLists to back off
}

// send an EntryUpdate to the python api (which forwards it to mal)
async function updateStatus(status: EntryUpdate) {
    try {
        const resp = await fetch(`${LOCAL_URL}/mal/me/update/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(status),
        });

        if (resp.status !== 204) {
            const data = await resp.json().catch(() => null);
            throw new Error(data?.error || `${resp.status} ${resp.statusText}`);
        }

    } catch (error: unknown) {
        showError(error instanceof Error ? error.message : String(error));
        throw error;    // propegate error back to pushUpdate
    }
}

// ========== error popup ==========
async function showError(error_msg: string, callback: (() => Promise<Response>) | null = null) {
    errorOverlay.classList.remove("hidden");
    errorMessage.textContent = error_msg;
    if (callback) {
        try {
            const resp = await callback();
            if (resp.status !== 204) {
                throw new Error(`${resp.status} ${resp.statusText}`);
            }
        }
        catch(error: unknown) {
            console.error("Couldn't clear the stored error: ", error);
        }
    }
}

function closeError() {
    errorOverlay.classList.add("hidden");
}


// ========== account modal ==========
// fetch the profile (or null) and paint the right state
async function loadAccount() {
    showTask("Loading account...");
    try {
        const resp = await fetch(`${LOCAL_URL}/mal/me`).catch(() => {
            throw new Error("The AniPresence app isn't running.")
        }); 
        const data = await resp.json();  
        if (!resp.ok) {     // HTTP request failed
            throw new Error(data.error);
        }
        userInfo = data;
        renderAccount();
    }
    catch(error: unknown) {     // loading the account failed
        showError(error instanceof Error ? error.message : String(error));  
        throw error;            // boot awais this function, throw to make it reject
    }
    finally {
        hideTask();
    }
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
async function connectMal() {
    try {
        const resp = await fetch(`${LOCAL_URL}/mal/login`, { method: "GET" });

        if (resp.status !== 204) {
            const data = await resp.json().catch(() => null);
            throw new Error(data?.error || `${resp.status} ${resp.statusText}`);
        }
    }
    catch(error: unknown) {
        showError(error instanceof Error ? error.message : String(error));
    }
}

// disconnect: drop the token, clear data, flip to the signed-out state
async function disconnectMal() {
    try {
        const resp = await fetch(`${LOCAL_URL}/mal/logout`, { method: "POST" });

        if (resp.status !== 204) {
            const data = await resp.json().catch(() => null);
            throw new Error(data?.error || `${resp.status} ${resp.statusText}`);
        }

        userInfo = null;
        fullAnimeList = [];
        fullMangaList = [];
        chrome.storage.local.remove(["animeList", "mangaList"]);
        renderPosters();
        renderAccount();
    }
    catch (error: unknown) {
        showError(error instanceof Error ? error.message : String(error));
    }
}

// ========== footer ==========
function showTask(status_text: string) {
    notifyWrapper.classList.remove("hidden");
    notifyText.textContent = status_text;
}

function hideTask() {
    notifyWrapper.classList.add("hidden");
    notifyText.textContent = "";
}


// ========== settings modal ==========
function openSettings() {
    loadSettings();                              // refresh the toggle + update check each time it opens
    settingsOverlay.classList.remove("hidden");
}

// pull the current ghost state + version + update status into the settings panel
async function loadSettings() {
    settingsVersion.textContent = "Version " + chrome.runtime.getManifest().version;

    // ghost state lives in /status
    try {
        const resp = await fetch(`${LOCAL_URL}/status`);
        if (!resp.ok) {
            throw new Error(`${resp.status} ${resp.statusText}`);
        }
        const data: LiveStatus = await resp.json();
        ghostSwitch.classList.toggle("on", data.ghost_mode);
        autoProgressSwitch.classList.toggle("on", data.auto_progress);
    }
    catch(error: unknown) {
        showError(error instanceof Error ? error.message : String(error));
    }
    checkUpdate();
}

async function checkUpdate() {
    try {
        updateBtn.textContent = "Checking...";
        const response = await fetch(`${LOCAL_URL}/update`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error);
        }

        if (!data.latest_version) {
            updateBtn.textContent = "Up to date";
            updateBtn.onclick = null;
        }
        else {
            updateBtn.textContent = `Download ${data.latest_version}`;
            updateBtn.onclick = () => window.open(data.download_url);
        }
    } catch (error: unknown) {
        showError(error instanceof Error ? error.message : String(error))
        updateBtn.textContent = `Check failed`;
        updateBtn.onclick = null;
    }
}

// flip ghost mode by hitting python api
async function toggleGhost() {
    try {
        const resp = await fetch(`${LOCAL_URL}/ghost`, { method: "POST" });
        const data = await resp.json();
        ghostSwitch.classList.toggle("on", data.ghost_mode);
        if (!resp.ok) {
            throw new Error(data.error);
        }
    }
    catch(error: unknown) {
        showError(error instanceof Error ? error.message : String(error));
     } 
}

async function toggleAutoProgress() {
    const enabled = !autoProgressSwitch.classList.contains("on");   // if u click it, u want the opposite of current state
    try {
        const resp = await fetch(`${LOCAL_URL}/autoprogress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled, threshold: 85 })
        });
        const data = await resp.json();
        autoProgressSwitch.classList.toggle("on", data.enabled);
        if (!resp.ok) {
            throw new Error(data.error);
        }
    }
    catch(error: unknown) {
        showError(error instanceof Error ? error.message : String(error));
    }
}

function closeSettings() {
    settingsOverlay.classList.add("closing");
    settingsOverlay.addEventListener("animationend", function () {
        settingsOverlay.classList.remove("closing");
        settingsOverlay.classList.add("hidden");
    }, { once: true });
}


// show cards instantly from cache so the grid isnt blank
async function showCachedLists() {
    const cached = await chrome.storage.local.get(["animeList", "mangaList"]);
    if (cached.animeList && cached.mangaList) {
        fullAnimeList = cached.animeList as Anime[];
        fullMangaList = cached.mangaList as Manga[];
        renderPosters();
    }
}

// show the strip instantly from the last saved status
async function showCachedStrip() {
    const cached = await chrome.storage.local.get("lastStatus");
    if (cached.lastStatus) {
        renderStrip(cached.lastStatus as LiveStatus);
    }
}


// ========== boot ==========
// check login first: logged in -> load lists; logged out -> show the connect prompt (no crash)
async function boot() {
    await showCachedLists();
    await showCachedStrip();

    try {
        await loadAccount();
    } 
    catch {
        return; // loadAccount already displayed the error
    }

    loadStatus();

    if (userInfo) {
        loadLists();
    } else {
        openAccount();
    }
}


// ========== init: fill version, build menu, wire listeners ==========
versionText.textContent = "v" + chrome.runtime.getManifest().version;
loadTheme();
fillStatusMenu(animeStatuses);
boot();
statusButton.addEventListener("click", toggleStatusMenu);
modeSwitch.addEventListener("click", toggleMode);
themeButton.addEventListener("click", toggleTheme);
backBtn.addEventListener("click", () => { closeDetail(); });
epMinus.addEventListener("click", () => { changeProgress(-1); });
epPlus.addEventListener("click", () => { changeProgress(1); });
detailStatusDd.querySelector(".dropdown-btn").addEventListener("click", function () { detailStatusDd.classList.toggle("open"); });
detailScoreDd.querySelector(".dropdown-btn").addEventListener("click", function () { detailScoreDd.classList.toggle("open"); });
detailModal.addEventListener("click", function (event) { if (event.target === detailModal) closeDetail(); });   // click the bg to close
synopsisToggle.addEventListener("click", function () {
    const expanded = detailSynopsis.classList.toggle("expanded");
    synopsisToggle.textContent = expanded ? "Show less" : "Show more...";
});
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
autoProgressSwitch.addEventListener("click", toggleAutoProgress);
errorOverlay.addEventListener("click", (event) => { if (event.target === errorOverlay) closeError();})
errorClose.addEventListener("click", closeError);
