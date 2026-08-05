// =====================================================================
// two funcs:
//   1. content scripts can't call http://127.0.0.1 directly without a
//      browser security popup, so they send the request here and this file
//      does the fetch and passes the result back
//   2. relays iframe video data over to content.js in the top page
// =====================================================================

// ========== Background fetches (to avoid local network popup) ==========
// do the actual fetch (hit the Python API) and send the result back
async function doFetch(message: FetchMessage, sendResponse: (response: any) => void) {
    try {
        const response = await fetch(message.url, {
            method: message.method,
            headers: message.headers,
            body: message.body ? JSON.stringify(message.body) : undefined,
        });
        const data = await response.json();
        sendResponse({ ok: true, data: data });
    } catch (error: any) {
        sendResponse({ ok: false, error: error.message });
    }
}

// listen to messages coming from the content scripts
function handleMessage(message: FetchMessage | VideoData, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
    // fetch request from content.js -> hit the API in rpc.py, send the status back
    if (message.type === "fetch") {
        doFetch(message, sendResponse);
        return true;
    }

    // iframe video data -> forward it to content.js
    if (message.type === "video_data") {
        chrome.tabs.sendMessage(sender.tab!.id!, message);      // send back to content scripts
    }
}

chrome.runtime.onMessage.addListener(handleMessage);
