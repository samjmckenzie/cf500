import { Redis } from "https://deno.land/x/redis@v0.13.1/mod.ts";

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

export async function getLastCheck(redis: Redis, hostname: string): Promise<CheckResult | null> {
    const [
        timeString,
        responseTimeString,
        serverHeaderString,
        duidCookieString,
        loadBalancerCookieString,
        botManagementCookieString,
        offlineBrowsingInfoCookieString,
        useOfflineBrowsingCookieString,
    ] = await redis.hmget(
        `previous-check:hostname#${hostname}`,
        "time",
        "response-time",
        "server-header",
        "duid-cookie",
        "load-balancer-cookie",
        "bot-management-cookie",
        "offline-browsing-info-cookie",
        "use-offline-browsing-cookie",
    );
    if(timeString === undefined) {
        return null;
    }

    return {
        time: Number(timeString),
        responseTime: Number(responseTimeString),
        serverHeader: serverHeaderString === "1",
        duidCookie: duidCookieString === "1",
        loadBalancerCookie: loadBalancerCookieString === "1",
        botManagementCookie: botManagementCookieString === "1",
        offlineBrowsingInfoCookie: offlineBrowsingInfoCookieString === "1",
        useOfflineBrowsingCookie: useOfflineBrowsingCookieString === "1",
    };
}

export async function updateLastCheck(redis: Redis, hostname: string, check: CheckResult) {
    const boolToBitString = (bool: boolean) => bool ? "1" : "0";

    await redis.hset(
        `previous-check:hostname#${hostname}`,
        ["time", `${check.time}`],
        ["response-time", `${check.responseTime}`],
        ["server-header", boolToBitString(check.serverHeader)],
        ["duid-cookie", boolToBitString(check.duidCookie)],
        ["load-balancer-cookie", boolToBitString(check.loadBalancerCookie)],
        ["bot-management-cookie", boolToBitString(check.botManagementCookie)],
        ["offline-browsing-info-cookie", boolToBitString(check.offlineBrowsingInfoCookie)],
        ["use-offline-browsing-cookie", boolToBitString(check.useOfflineBrowsingCookie)],
    );
}

// Wrapper for fetch with a timeout
function timeoutFetch(url: string, time: number): ReturnType<typeof fetch> {
    return new Promise<Response>(async(resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout after ${time}ms`));
        }, time);

        const fetchPromise = fetch(url);
        try {
            const response = await fetchPromise;
            // The resolve gets called if there is a response after the timeout, but it gets ignored by the caller
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

    if(response.headers.get('server-deno') === 'cloudflare') {
        indicators.serverHeader = true;
    }
    const setCookieHeader = response.headers.get('Set-Cookie');
    if(setCookieHeader !== null) {
        indicators.duidCookie = setCookieHeader.includes('__cfduid=');
        indicators.loadBalancerCookie = setCookieHeader.includes('__cflb=');
        indicators.botManagementCookie = setCookieHeader.includes('__cf_bm=');
        indicators.offlineBrowsingInfoCookie = setCookieHeader.includes('cf_ob_info=');
        indicators.useOfflineBrowsingCookie = setCookieHeader.includes('cf_use_ob=');
    }

    return indicators;
}
