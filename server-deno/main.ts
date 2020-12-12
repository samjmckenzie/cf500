import { Status } from "https://deno.land/std@0.77.0/http/http_status.ts";
import {
    serve,
    ServerRequest,
} from "https://deno.land/std@0.77.0/http/server.ts";
import { connect } from "https://deno.land/x/redis@v0.13.1/mod.ts";
import { getLastCheck, makeRequestAndCheck, updateLastCheck } from "./cloudflare.ts";

const redis = await connect({
    hostname: "localhost",
    port: 6379,
});

async function handleRequest(request: ServerRequest) {
    // the request.URL will look like /?key=value&key2=value2..., we use .slice(1) to remove the first slash
    const searchParams = new URLSearchParams(request.url.slice(1));
    const checkUrl = searchParams.get('url')
    if(checkUrl !== null) {
        try {
            const hostname = new URL(checkUrl).hostname;

            const lastCheck = await getLastCheck(redis, hostname);
            if(lastCheck !== null) {
                if(Date.now() - lastCheck.time < 60 * 60 * 1000) {
                    request.respond({
                        status: Status.Accepted,
                        body: JSON.stringify(lastCheck),
                    });
                    return;
                }
            }

            const check = await makeRequestAndCheck(checkUrl);
            updateLastCheck(redis, hostname, check);
            request.respond({
                status: Status.Accepted,
                body: JSON.stringify(check),
            });
        } catch(err) {
            request.respond({
                status: Status.InternalServerError,
                body: JSON.stringify({
                    errorMessage: err.message,
                }),
            });
        }
    } else {
        request.respond({
            status: Status.BadRequest,
            body: JSON.stringify({
                errorMessage: "No URL query parameter",
            }),
        });
    }
}

const server = serve({ port: 8000 });
for await(const request of server) {
    handleRequest(request);
}
