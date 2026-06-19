// ========== grab elements ==========
const versionText = document.querySelector(".version");
const statusWrap = document.querySelector(".status-wrap");
const statusButton = document.querySelector(".status-select");
const statusText = document.querySelector(".status-text");
const statusMenu = document.querySelector(".status-menu");
const modeSwitch = document.querySelector(".mode-switch");
const modeText = document.querySelector(".mode-text");
const themeButton = document.querySelector(".theme-btn");


// ========== data ==========
const LOCAL_URL = "http://127.0.0.1:5001";   // our local Python server
const animeStatuses = ["Watching", "Completed", "On hold", "Dropped", "Plan to watch"];
const mangaStatuses = ["Reading", "Completed", "On hold", "Dropped", "Plan to read"];


// ========== status dropdown ==========
// open/close the menu (click the button)
function toggleStatusMenu() {
    statusWrap.classList.toggle("open");    // add/remove "open" on the wrapper -> CSS shows/hides the menu
}

// build the menu items from a status list (called on load and on anime/manga switch)
function fillStatusMenu(statuses) {
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
function selectStatus(event) {
    statusText.textContent = event.target.textContent;   // put the clicked word on the button
    statusWrap.classList.remove("open");                 // close the menu
}

// close the menu when clicking anywhere outside it
function closeMenuOnOutsideClick(event) {
    if (!statusWrap.contains(event.target)) {            // event.target = what was clicked
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


// ========== fill animelist panel ==========
async function fillAnime(type) {
    const response = await fetch(`${LOCAL_URL}/mal/me/animelist`)
    const data = await response.json()
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

statusButton.addEventListener("click", toggleStatusMenu);
modeSwitch.addEventListener("click", toggleMode);
themeButton.addEventListener("click", toggleTheme);
document.addEventListener("click", closeMenuOnOutsideClick);