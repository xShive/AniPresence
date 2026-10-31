let localToken: string | null = null;

async function localFetch(path: string, options: RequestInit = {}): Promise<Response> {
    if (localToken === null) {
        localToken = await getLocalToken();
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${localToken}`);
    options.headers = headers;

    return fetch(`${LOCAL_URL}${path}`, options).catch(() => {
        throw new Error("Couldn't reach the AniPresence app. Make sure it's running.");
    });
}

async function getLocalToken(): Promise<string> {
    const response = await chrome.runtime.sendNativeMessage(
        "anipresence_native_host",
        { action: "get_token" }
    );
    if (response?.error) {
        throw new Error(response.error);
    }

    if (typeof response?.token !== "string" || !response.token) {
        throw new Error("The AniPresence helper did not return a token.");
    }

    return response.token;
}