const version = chrome.runtime.getManifest().version;
document.querySelector(".version").textContent = "v" + version;

// fetch is async and returns a promise
// that promise has a .then() method which takes the data and passes it to the function inside
/* fetch("http://127.0.0.1:5001/update")
    .then(function(response) {
        return response.json()      // response.json() is async, returs a promise
    })                              // another .then() is needed
    .then(function(data) {
        let latest_version = data["latest_version"];
        let download_url = data["download_url"];

        if (!latest_version) {
            document.getElementById("download-button").textContent = "Up to date!"
            return
        }
        
        function openURL() {
            window.open(download_url)
        }

        document.getElementById("download-button").textContent = "Download " + latest_version;
        document.getElementById("download-button").onclick = openURL;
    })
    */


function selectStatus(event) {
  statusText.textContent = event.target.textContent;   // the clicked <li>'s word
  statusWrap.classList.remove("open");                 // close the menu
}

function closeMenuOnOutsideClick(event) {               // listens to whole page (any clicks runs it)
  if (!statusWrap.contains(event.target)) {             // event.target = the thing clicked | check if that is inside dropdown
    statusWrap.classList.remove("open");             
  }
}

// even more css
const animeStatuses = ["Watching", "Completed", "On hold", "Dropped", "Plan to watch"];
const mangaStatuses = ["Reading", "Completed", "On hold", "Dropped", "Plan to read"]

function fillStatusMenu(statuses) {         // build menu items
    statusText.textContent = statuses[0];   // reset button to first status
    statusMenu.innerHTML = "";              // wipe the old <li>'s

    for (const status of statuses) {
        const li = document.createElement("li");
        li.textContent = status;
        li.addEventListener("click", selectStatus);
        statusMenu.appendChild(li);
  }
}

// css
const statusWrap = document.querySelector(".status-wrap");
const statusButton = document.querySelector(".status-select");
const statusText = document.querySelector(".status-text");
const statusMenu = document.querySelector(".status-menu");

function toggleStatusMenu() {
    statusWrap.classList.toggle("open");    // add "open" class to the already existing classes of statusWrap
}

statusButton.addEventListener("click", toggleStatusMenu);

// more css
const modeSwitch = document.querySelector(".mode-switch")
const modeText = document.querySelector(".mode-text")

function toggleMode() {
    modeSwitch.classList.toggle("manga");

    if (modeSwitch.classList.contains("manga")) {
        modeText.textContent = "Manga"
        fillStatusMenu(mangaStatuses);
    }

    else {
        modeText.textContent = "Anime"
        fillStatusMenu(animeStatuses);
    }
}

modeSwitch.addEventListener("click", toggleMode);
fillStatusMenu(animeStatuses);
document.addEventListener("click", closeMenuOnOutsideClick)

// dark mode
const themeButton = document.querySelector(".theme-btn");

function toggleTheme() {
    document.body.classList.toggle("dark");     // add .dark to classlist on <body>

    if (document.body.classList.contains("dark")) {
        themeButton.textContent = "light_mode";   // show the sun in dark mode
    } else {
        themeButton.textContent = "dark_mode";     // show the moon in light mode
    }
}

themeButton.addEventListener("click", toggleTheme);