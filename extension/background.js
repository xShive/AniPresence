// ========== Background fetches (to avoid local network popup) ==========

// listen to messages coming from the content scripts
function handleMessage(message, sender, sendResponse) {
    // a fetch request from content.js -> hit the API in rpc.py, send the result (status) back
    if (message.type === "fetch") {
        fetch(message.url, {
            method: message.method,
            headers: message.headers,
            body: message.body ? JSON.stringify(message.body) : undefined,
        })
        .then(function (response) {     // when response arrives, pass it as the first argument in .then()
            return response.json();
        })
        .then(function (data) {
            sendResponse({ ok: true, data: data });
        })
        .catch(function (error) {
            sendResponse({ ok: false, error: error.message });
        });

        return true;    // keep the message channel open for the async response
    }

    // kwik video data -> forward it to content.js
    if (message.type === "video_data") {
        chrome.tabs.sendMessage(sender.tab.id, message);        // tabId needed: send to specific tab
    }
}

chrome.runtime.onMessage.addListener(handleMessage);