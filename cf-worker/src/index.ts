import { getLastCheck, makeRequestAndCheck, updateLastCheck } from './cloudflare'

async function handleRequest(request: Request): Promise<Response> {
    const checkUrl = new URL(request.url).searchParams.get('url');
    if(checkUrl !== null) {
        try {
            const hostname = new URL(checkUrl).hostname;

            // const lastCheck = await getLastCheck(hostname);
            // if(lastCheck !== null) {
            //     if(Date.now() - lastCheck.time < 60 * 60 * 1000) {
            //         return new Response(JSON.stringify(lastCheck), { status: 200 });
            //     }
            // }

            const check = await makeRequestAndCheck(checkUrl);
            updateLastCheck(hostname, check);
            return new Response(JSON.stringify(check), { status: 201 });
        } catch(err) {
            return new Response(JSON.stringify({ errorMessage: err.message }), { status: 201 });
        }
    }
    return new Response(JSON.stringify({ errorMessage: "No URL parameter" }), { status: 400 });
}

addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event.request));
})
