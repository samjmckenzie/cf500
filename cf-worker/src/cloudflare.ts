export interface CheckResult {
    time: number;
    responseTime: number;

    serverHeader: boolean;   // server-deno: cloudflare
    // See https://support.cloudflare.com/hc/en-us/articles/200170156-Understanding-the-Cloudflare-Cookies
    duidCookie: boolean;                // __cfduid
    loadBalancerCookie: boolean;        // __cflb
    botManagementCookie: boolean;       // __cf_bm
    offlineBrowsingInfoCookie: boolean; // cf_ob_info
    useOfflineBrowsingCookie: boolean;  // cf_use_ob
}

export async function getLastCheck(hostname: string): Promise<CheckResult | null> {
    return cf500.get<CheckResult> (`hostname#${hostname}:previous-check`, "json");
}

export async function updateLastCheck(hostname: string, check: CheckResult) {
    cf500.put(`hostname#${hostname}:previous-check`, JSON.stringify(check));
}

// Wrapper for fetch with a timeout
function timeoutFetch(url: string, time: number): ReturnType<typeof fetch> {
    return new Promise<Response>(async(resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout after ${time}ms`));
        }, time);

        const fetchPromise = fetch(url, {
            headers: {
                "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "accept-encoding": "gzip, deflate, br",
                "accept-language": "en-GB,en-US;q=0.9,en;q=0.8,nl;q=0.7",
                "cache-control": "no-cache",
                "pragma": "no-cache",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "none",
                "sec-fetch-user": "?1",
                "upgrade-insecure-request": "1",
            },
        });
        try {
            const response = await fetchPromise;
            resolve(response);
        } catch(err) {
            reject(err);
        } finally {
            clearInterval(timeout);
        }
    });
}

export async function makeRequestAndCheck(url: string): Promise<CheckResult> {
    const startTime = Date.now();
    const response = await timeoutFetch(url, 10_000);
    const endTime = Date.now();
    const indicators: CheckResult = {
        time: Date.now(),
        responseTime: endTime - startTime,
        serverHeader: false,
        duidCookie: false,
        loadBalancerCookie: false,
        botManagementCookie: false,
        offlineBrowsingInfoCookie: false,
        useOfflineBrowsingCookie: false,
    };

    if(response.headers.get('server') === 'cloudflare') {
        indicators.serverHeader = true;
    }
    console.log(JSON.stringify(response));
    console.log(response);
    const setCookieHeader = response.headers.get('set-cookie');
    if(setCookieHeader !== null) {
        indicators.duidCookie = setCookieHeader.includes('__cfduid=');
        indicators.loadBalancerCookie = setCookieHeader.includes('__cflb=');
        indicators.botManagementCookie = setCookieHeader.includes('__cf_bm=');
        indicators.offlineBrowsingInfoCookie = setCookieHeader.includes('cf_ob_info=');
        indicators.useOfflineBrowsingCookie = setCookieHeader.includes('cf_use_ob=');
    }

    return indicators;
}
