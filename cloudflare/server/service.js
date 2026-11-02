import { createService } from "../service.js";

export const MAX_BODY_BYTES = 2 * 1024 * 1024;
export const ALLOWED_ENDPOINTS = new Set(["browse", "next", "player", "search", "reel_watch_sequence", "guide", "get_setting", "get_watch"]);

function result(body, status, type = "application/json") {
    return new Response(type === "application/json" ? JSON.stringify(body) : body, {
        status,
        headers: {
            "Content-Type": type + (type === "application/json" ? "; charset=utf-8" : ""),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer"
        }
    });
}

async function boundedBytes(request, maximum) {
    const declared = request.headers.get("Content-Length");
    if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximum)) {
        throw new RangeError("Payload is too large.");
    }
    if (!request.body) return new Uint8Array();
    const reader = request.body.getReader();
    const chunks = [];
    let size = 0;
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > maximum) {
                await reader.cancel();
                throw new RangeError("Payload is too large.");
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return body;
}

export function createRemoteService(inputs) {
    const base = createService(inputs);
    const process = inputs.processYouTube;
    if (typeof process !== "function") throw new Error("A response processor is required.");
    return {
        async fetch(request, env) {
            const url = new URL(request.url);
            if (url.pathname !== "/process") return base.fetch(request, env);
            if (request.method !== "POST") return result({ error: "POST required." }, 405);
            // Authenticate before reading the response body or invoking the processor.
            const authenticated = await base.fetch(new Request(url.origin + "/validate", {
                method: "POST",
                headers: { Authorization: request.headers.get("Authorization") || "" }
            }), env);
            if (authenticated.status !== 200) return authenticated;
            const endpoint = request.headers.get("X-Showrov-Endpoint") || "";
            if (!ALLOWED_ENDPOINTS.has(endpoint)) return result({ error: "Unsupported endpoint." }, 400);
            if (request.headers.get("Content-Type")?.split(";")[0].trim() !== "application/octet-stream") {
                return result({ error: "Binary input required." }, 415);
            }
            let body;
            try {
                body = await boundedBytes(request, MAX_BODY_BYTES);
            } catch (error) {
                return result({ error: error instanceof RangeError ? "Payload limit exceeded." : "Invalid payload." }, error instanceof RangeError ? 413 : 400);
            }
            try {
                const processed = await process(endpoint, body);
                if (processed === null) return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
                if (!(processed instanceof Uint8Array) || processed.byteLength > MAX_BODY_BYTES) {
                    return result({ error: "Invalid processing result." }, 422);
                }
                return result(processed, 200, "application/octet-stream");
            } catch {
                return result({ error: "Response processing failed." }, 422);
            }
        }
    };
}
