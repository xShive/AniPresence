/* const version = chrome.runtime.getManifest().version;
document.getElementById(".version").textContent = "v" + version;

// fetch is async and returns a promise
// that promise has a .then() method which takes the data and passes it to the function inside
fetch("http://127.0.0.1:5001/update")
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

// css
const statusWrap = document.querySelector(".status-wrap");
const statusButton = document.querySelector(".status-select");

function toggleStatusMenu() {
    statusWrap.classList.toggle("open");    // classList = list of CSS classes -> open class
}

statusButton.addEventListener("click", toggleStatusMenu);