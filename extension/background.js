// ========== Background fetches (to avoid local network popup) ==========

// do the actual fetch and send the result back (async helper)
async function doFetch(message, sendResponse) {
    try {
        const response = await fetch(message.url, {
            method: message.method,
            headers: message.headers,
            body: message.body ? JSON.stringify(message.body) : undefined,
        });
        const data = await response.json();
        sendResponse({ ok: true, data: data });
    } catch (error) {
        sendResponse({ ok: false, error: error.message });
    }
}

// listen to messages coming from the content scripts
function handleMessage(message, sender, sendResponse) {
    // a fetch request from content.js -> hit the API in rpc.py, send the result (status) back
    if (message.type === "fetch") {
        doFetch(message, sendResponse);
        return true;    // keep the message channel open for the async response
    }

    // kwik video data -> forward it to content.js
    if (message.type === "video_data") {
        chrome.tabs.sendMessage(sender.tab.id, message);        // tabId needed: send to specific tab
    }
}

chrome.runtime.onMessage.addListener(handleMessage);
