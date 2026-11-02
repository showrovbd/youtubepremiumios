const KEY_PATTERN = /^sr_[A-Za-z0-9_-]{43}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function reply(body, status = 200, type = "application/json", extra = {}) {
    const headers = {
        "Content-Type": type + "; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        ...extra
    };
    return new Response(type === "application/json" ? JSON.stringify(body) : body, { status, headers });
}

async function digest(value) {
    const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}

async function sameSecret(candidate, expected) {
    const first = await digest(candidate);
    const second = await digest(expected);
    let difference = 0;
    for (let index = 0; index < first.length; index++) {
        difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
    }
    return difference === 0;
}

async function adminAuthorized(request, password) {
    const header = request.headers.get("Authorization") || "";
    if (!header.startsWith("Basic ")) return false;
    try {
        const decoded = new TextDecoder().decode(
            Uint8Array.from(atob(header.slice(6)), character => character.charCodeAt(0))
        );
        const separator = decoded.indexOf(":");
        return decoded.slice(0, separator) === "Showrov"
            && await sameSecret(decoded.slice(separator + 1), password);
    } catch {
        return false;
    }
}

async function jsonBody(request) {
    if (!request.headers.get("Content-Type")?.startsWith("application/json")) {
        throw new Error("A JSON request is required.");
    }
    const text = await request.text();
    if (text.length > 4096) throw new Error("Request is too large.");
    return JSON.parse(text);
}

export class LicenseRegistry {
    constructor(context) {
        this.storage = context.storage;
    }

    async fetch(request) {
        const url = new URL(request.url);
        if (request.method === "GET" && url.pathname === "/list") {
            const records = await this.storage.list({ prefix: "license:" });
            return reply({ licenses: [...records.values()].sort((first, second) => second.createdAt - first.createdAt) });
        }
        if (request.method === "POST" && url.pathname === "/create") {
            const input = await request.json();
            const days = input.days;
            if (!Number.isInteger(days) || days < 1 || days > 3650) {
                return reply({ error: "Days must be between 1 and 3650." }, 400);
            }
            const label = typeof input.label === "string"
                ? input.label.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80)
                : "";
            if (!label) return reply({ error: "Enter a label for this key." }, 400);
            const random = crypto.getRandomValues(new Uint8Array(32));
            const key = "sr_" + btoa(String.fromCharCode(...random))
                .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            const identifier = await digest(key);
            const createdAt = Date.now();
            const record = {
                id: identifier, label, createdAt,
                expiresAt: createdAt + days * 86400000,
                revokedAt: null
            };
            await this.storage.put("license:" + identifier, record);
            return reply({ key, license: record }, 201);
        }
        if (request.method === "GET" && url.pathname === "/check") {
            const identifier = url.searchParams.get("hash") || "";
            if (!HASH_PATTERN.test(identifier)) return reply({ valid: false }, 403);
            const record = await this.storage.get("license:" + identifier);
            if (!record || record.revokedAt !== null || record.expiresAt <= Date.now()) {
                return reply({ valid: false }, 403);
            }
            return reply({ valid: true, license: record });
        }
        if (request.method === "POST" && url.pathname === "/revoke") {
            const { id } = await request.json();
            if (typeof id !== "string" || !HASH_PATTERN.test(id)) {
                return reply({ error: "Invalid key identifier." }, 400);
            }
            return this.storage.transaction(async transaction => {
                const record = await transaction.get("license:" + id);
                if (!record) return reply({ error: "Key not found." }, 404);
                record.revokedAt = record.revokedAt ?? Date.now();
                await transaction.put("license:" + id, record);
                return reply({ license: record });
            });
        }
        return reply({ error: "Not found." }, 404);
    }
}

function sectionsOf(template) {
    const sections = new Map();
    let current = null;
    for (const line of template.split(/\r?\n/)) {
        const match = line.trim().match(/^\[([^\]]+)\]$/);
        if (match) {
            current = match[1];
            sections.set(current, []);
        } else if (current && line.trim() && !line.trim().startsWith("#")) {
            sections.get(current).push(line);
        }
    }
    return sections;
}

export function createService({ configTemplate, requestScript, responseScript, adminPage, licenseText = "" }) {
    const sections = sectionsOf(configTemplate);
    const responseEntry = sections.get("Script")?.find(line => /^youtube\.response\s*=/.test(line));
    const responsePattern = responseEntry?.match(/pattern=(.*?),requires-body=/)?.[1];
    if (!responsePattern || !sections.get("Rule")?.length || !sections.get("MITM")?.length) {
        throw new Error("The YouTube template is incomplete.");
    }

    function protectedConfiguration(origin, key, license) {
        const requestPattern = "^https?://(?:[\\w-]+\\.googlevideo\\.com|(?:www|s)\\.youtube\\.com)/";
        const scriptBase = origin + "/scripts/";
        return [
            "#!name = Showrov YouTube",
            "#!author = Showrov",
            "#!desc = " + license.label + " | Expires " + new Date(license.expiresAt).toISOString(),
            "",
            "[Rule]",
            ...sections.get("Rule"),
            "",
            "[Script]",
            "youtube.request = type=http-request,pattern=" + requestPattern
                + ",requires-body=0,engine=jsc,timeout=15,script-path="
                + scriptBase + "request.js?key=" + encodeURIComponent(key),
            "youtube.response = type=http-response,pattern=" + responsePattern
                + ",requires-body=1,max-size=-1,binary-body-mode=1,engine=jsc,timeout=30,script-path="
                + scriptBase + "response.js?key=" + encodeURIComponent(key),
            "",
            "[MITM]",
            ...sections.get("MITM"),
            ""
        ].join("\n");
    }

    return {
        async fetch(request, env) {
            const url = new URL(request.url);
            if (url.pathname === "/licenses") return reply(licenseText, 200, "text/plain");
            const configured = typeof env.ADMIN_PASSWORD === "string"
                && env.ADMIN_PASSWORD.length >= 32 && !!env.LICENSES;
            if (url.pathname === "/health") return reply({ ready: configured }, configured ? 200 : 503);
            if (!configured) return reply({ error: "Set ADMIN_PASSWORD to at least 32 characters and configure LICENSES." }, 503);
            const registry = env.LICENSES.get(env.LICENSES.idFromName("showrov-youtube"));
            try {
                if (url.pathname === "/" || url.pathname.startsWith("/admin")) {
                    if (!await adminAuthorized(request, env.ADMIN_PASSWORD)) {
                        return reply("Sign in as Showrov.", 401, "text/plain", {
                            "WWW-Authenticate": 'Basic realm="Showrov keys", charset="UTF-8"'
                        });
                    }
                    if ((url.pathname === "/" || url.pathname === "/admin") && request.method === "GET") {
                        return reply(adminPage, 200, "text/html", {
                            "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
                        });
                    }
                    if (request.method === "GET" && url.pathname === "/admin/keys") {
                        return registry.fetch(new Request("https://registry/list"));
                    }
                    if (request.method === "POST" && ["/admin/keys", "/admin/revoke"].includes(url.pathname)) {
                        if (request.headers.get("Origin") !== url.origin
                            || request.headers.get("X-Showrov-Admin") !== "1") {
                            return reply({ error: "Use the admin page on this Worker." }, 403);
                        }
                        let input;
                        try { input = await jsonBody(request); }
                        catch { return reply({ error: "Invalid JSON request." }, 400); }
                        const route = url.pathname === "/admin/keys" ? "/create" : "/revoke";
                        const result = await registry.fetch(new Request("https://registry" + route, {
                            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input)
                        }));
                        const data = await result.json();
                        if (result.ok && data.key) {
                            data.downloadUrl = url.origin + "/youtube.conf?key=" + encodeURIComponent(data.key);
                        }
                        return reply(data, result.status);
                    }
                    return reply({ error: "Not found." }, 404);
                }

                const download = url.pathname === "/youtube.conf";
                const scriptDownload = ["/scripts/request.js", "/scripts/response.js"].includes(url.pathname);
                const validation = url.pathname === "/validate";
                if (!(download || scriptDownload || validation)) return reply({ error: "Not found." }, 404);
                if (validation ? request.method !== "POST" : !["GET", "HEAD"].includes(request.method)) {
                    return reply({ error: "Method not allowed." }, 405);
                }
                const authorization = request.headers.get("Authorization") || "";
                const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
                const key = validation ? bearer : (url.searchParams.get("key") || bearer);
                if (!KEY_PATTERN.test(key)) return reply({ valid: false, error: "An active key is required." }, 403);
                const checked = await registry.fetch(new Request("https://registry/check?hash=" + await digest(key)));
                const verdict = await checked.json();
                if (!checked.ok || verdict.valid !== true) {
                    return reply({ valid: false, error: "Key is invalid, expired, or revoked." }, 403);
                }
                if (validation) return reply({ valid: true, expiresAt: verdict.license.expiresAt });
                let response;
                if (download) {
                    response = reply(protectedConfiguration(url.origin, key, verdict.license), 200, "text/plain");
                } else {
                    const payload = url.pathname.endsWith("/request.js") ? requestScript : responseScript;
                    const settings = JSON.stringify({ origin: url.origin, key });
                    response = reply("globalThis.__SHOWROV_LICENSE__ = " + settings + ";\n" + payload, 200, "application/javascript", { Link: "<" + url.origin + "/licenses>; rel=\"license\"" });
                }
                return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
            } catch {
                return reply({ error: "Key service unavailable." }, 503);
            }
        }
    };
}
