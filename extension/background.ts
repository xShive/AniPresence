// =====================================================================
// two funcs:
//   1. content scripts can't call http://127.0.0.1 directly without a
//      browser security popup, so they send the request here and this file
//      does the fetch and passes the result back
//   2. relays iframe video data over to content.js in the top page
// =====================================================================

// ========== Background fetches (to avoid local network popup) ==========
// do the actual fetch (hit the Python API) and send the result back
/**
 * Performs the HTTP request described by a FetchMessage
 * and replies to the original sender with the result.
 * 
 * Handles HTTP request fails
 * 
 * @param message - `FetchMessage` object
 * @param sendResponse - Chrome's `sendResponse` method
 */
async function doFetch(message: FetchMessage, sendResponse: (response: ResponseMessage) => void) {
    try {
        const resp = await fetch(message.url, {
            method: message.method,
            headers: message.headers,
            body: message.body ? JSON.stringify(message.body) : undefined,
        });
        if (resp.status !== 204) {
            const data = await resp.json().catch(() => null);
            sendResponse({ ok: false, error: (data?.error || `${resp.status} ${resp.statusText}`)});
            return;
        }
        sendResponse({ ok: true });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        sendResponse({ ok: false, error: msg });
    }
}


/**
 * Background listener that handles incoming messages.
 * 
 * - `FetchMessage`: hit Flask server
 * - `VideoData`: forward iFrame data to content script. handles errors from background -> content
 * 
 * @param message - object that is being sent
 * @param sender - Chrome metadata about the context that sent the message
 * @param sendResponse - automatically supplied by Chrome to hit callback
 */   
function handleMessage(message: FetchMessage | VideoData, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
    if (message.type === "fetch") {
        doFetch(message, sendResponse);
        return true;    // dont close msg yet (this executes before doFetch finishes)
    }
    if (message.type === "video_data") {
        chrome.tabs.sendMessage(sender.tab!.id!, message, {frameId: 0}   
        ).catch((error: unknown) => {
            console.error(error);
        });
    }
}

chrome.runtime.onMessage.addListener(handleMessage);
