# AniPresence

<p align="center">
  <img src="https://img.shields.io/github/license/xShive/AniPresence?style=flat-square" alt="License">
  <img src="https://img.shields.io/github/v/release/xShive/AniPresence?style=flat-square" alt="Version">
  <img src="https://img.shields.io/github/downloads/xShive/AniPresence/total?style=flat-square" alt="Downloads">
</p>

AniPresence is a lightweight hub for all your favorite anime and manga. Track your lists, sync your progress to MyAnimeList, and show what you're watching live on your Discord profile. It pairs an easy-to-use browser extension with a small app that runs locally on your machine.

<div align="center">
  <a href="https://imgur.com/ry3eCfV">
    <img src="assets/demo-thumbnail.png" alt="Watch Video" width="500">
  </a>
  <br>
  <p><b>↑ Click to view demo ↑</b></p>
</div>

## Installation & Setup

### Part 1: Install the app
1. Download the latest `AniPresence_Setup.exe` from the [Releases Page](https://github.com/xShive/AniPresence/releases).
2. Run the installer and follow the on-screen instructions.
3. When it finishes, the installer opens the **`extension` folder** for you. Leave this window open: it's needed in Part 2.

### Part 2: Load the browser extension
1. Open your browser's extension manager:
   - Chrome / Brave / Edge: type `chrome://extensions` in the address bar.
   - Opera GX: type `opera://extensions` in the address bar.
2. Toggle **Developer Mode** to **ON** (top-right corner).
3. Click **Load unpacked** (top-left).
4. Select the **`extension` folder** that opened in Part 1. (default: `C:\Program Files (x86)\AniPresence\extension`)

## Supported Websites

| Website | Mirrors | Type |
| :------ | :------ | :--- |
| [Animepahe](https://animepahe.pw/) | .pw | Anime |
| [Animetsu](https://animetsu.bz/) | .bz, .cc, .live, .net | Anime |
| [Crunchyroll](https://www.crunchyroll.com/) | .com | Anime |
| [Miruro](https://miruro.to/) | .bz, .ru, .to, .tv | Anime |

## FAQ

### Q: Why does Windows display a "This PC is protected" or Firewall warning?
A: This is a standard Windows security feature for any custom application that has not been digitally signed by a paid developer certificate. Because this is an open-source project managed locally, Windows does not recognize the publisher. You can safely click "More info" and then "Run anyway" to proceed.

### Q: How do I ensure this tool is safe to use?
A: The source code of this project is publicly available, which you can use to verify its safety. The tracker runs entirely locally on your machine and only interacts with website data to scrape the current video status. It does not log anything else related to your browser.

### Q: What about my MyAnimeList password?
A: You sign in through MyAnimeList's own official login page, so AniPresence never sees or stores your password. It only keeps the access token MAL hands back, saved locally on your machine.

### Q: How do I fix the 400 Bad Request error when connecting my MAL account?
A: Open your terminal, run `netsh winsock reset` and reboot your pc. Try connecting again. Why does this fix it? Well, Window Sockets is the part of WIndows that handles all network connections for every program. Winsock is basically the central switchboard for outbound connections. It lets other programs insert themselves into that switchboard (LSP), like VPNs and antivirusses. One of these probably got corrupted and started rejecting connections from certain apps, like `python.exe`, resulting in that local `PermissionError`.
