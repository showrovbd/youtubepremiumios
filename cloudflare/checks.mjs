import assert from "node:assert/strict";
import vm from "node:vm";

class MemoryStorage {
    constructor() { this.records = new Map(); }
    async get(key) { return structuredClone(this.records.get(key)); }
    async put(key, value) { this.records.set(key, structuredClone(value)); }
    async list({ prefix }) {
        return new Map([...this.records].filter(([key]) => key.startsWith(prefix))
            .map(([key, value]) => [key, structuredClone(value)]));
    }
    async transaction(callback) { return callback(this); }
}

function fieldsOf(bytes) {
    let offset = 0;
    function readVarint() {
        let value = 0;
        let shift = 0;
        while (offset < bytes.length) {
            const byte = bytes[offset++];
            value += (byte & 127) * 2 ** shift;
            if (!(byte & 128)) return value;
            shift += 7;
        }
        throw new Error("Truncated varint");
    }
    const fields = [];
    while (offset < bytes.length) {
        const tag = readVarint();
        const wire = tag % 8;
        const field = Math.floor(tag / 8);
        if (wire === 0) fields.push({ field, value: readVarint() });
        else if (wire === 2) {
            const length = readVarint();
            fields.push({ field, value: bytes.slice(offset, offset + length) });
            offset += length;
        } else throw new Error("Unexpected wire type in test fixture");
    }
    return fields;
}

export async function runChecks({ createService, LicenseRegistry, configTemplate, requestScript, responseScript, adminPage, licenseText }) {
    const storage = new MemoryStorage();
    const registry = new LicenseRegistry({ storage });
    const env = {
        ADMIN_PASSWORD: "fake-admin-password-for-tests-000000000000",
        LICENSES: { idFromName: name => name, get: () => registry }
    };
    const service = createService({ configTemplate, requestScript, responseScript, adminPage, licenseText });
    const origin = "https://showrov-test.workers.dev";
    const basic = "Basic " + btoa("Showrov:" + env.ADMIN_PASSWORD);
    const adminHeaders = {
        Authorization: basic,
        "Content-Type": "application/json",
        Origin: origin,
        "X-Showrov-Admin": "1"
    };
    const request = (path, options = {}) => service.fetch(new Request(origin + path, options), env);
    async function createKey(label) {
        const response = await request("/admin/keys", {
            method: "POST", headers: adminHeaders, body: JSON.stringify({ label, days: 30 })
        });
        assert.equal(response.status, 201);
        return response.json();
    }
    assert.equal((await service.fetch(new Request(origin + "/health"), {})).status, 503);
    assert.equal((await request("/health")).status, 200);
    assert.equal((await request("/admin")).status, 401);
    assert.equal((await request("/admin", { headers: { Authorization: basic } })).status, 200);
    assert.equal((await request("/admin/keys", {
        method: "POST", headers: { ...adminHeaders, Origin: "https://other.example" },
        body: JSON.stringify({ label: "Wrong origin", days: 1 })
    })).status, 403);
    assert.equal((await request("/admin/keys", {
        method: "POST", headers: adminHeaders, body: JSON.stringify({ label: "Bad expiry", days: 0 })
    })).status, 400);

    const created = await createKey("Test user");
    assert.match(created.key, /^sr_[A-Za-z0-9_-]{43}$/);
    assert.ok(!JSON.stringify([...storage.records.values()]).includes(created.key));
    const configResponse = await request("/youtube.conf?key=" + created.key);
    assert.equal(configResponse.status, 200);
    assert.match(configResponse.headers.get("Cache-Control"), /no-store/);
    const protectedConfig = await configResponse.text();
    assert.ok(protectedConfig.includes("#!author = Showrov"));
    assert.ok(!protectedConfig.includes("[Url Rewrite]"));
    assert.ok(!protectedConfig.includes("[Map Local]"));
    assert.ok(!protectedConfig.includes("duyvinh09"));
    assert.equal(protectedConfig.split("\n").filter(line => /^youtube\.(request|response)\s*=/.test(line)).length, 2);
    const requestDownload = await request("/scripts/request.js?key=" + created.key);
    const responseDownload = await request("/scripts/response.js?key=" + created.key);
    assert.equal(requestDownload.status, 200);
    assert.equal(responseDownload.status, 200);
    assert.ok(responseDownload.headers.get("Link").includes("/licenses"));
    const cachedRequest = await requestDownload.text();
    const cachedResponse = await responseDownload.text();
    for (const path of ["/youtube.conf", "/scripts/request.js", "/scripts/response.js"]) {
        assert.equal((await request(path)).status, 403);
        assert.equal((await request(path + "?key=sr_" + "A".repeat(43))).status, 403);
    }
    assert.equal((await request("/youtube.conf?key=" + created.key, { method: "HEAD" })).status, 200);
    assert.equal((await request("/validate", {
        method: "POST", headers: { Authorization: "Bearer " + created.key }
    })).status, 200);

    async function runClient(source, url, responseBody, mode = "normal") {
        const calls = [];
        const completions = [];
        const timers = [];
        const logs = [];
        let callback;
        let resolveDone;
        const done = new Promise(resolve => { resolveDone = resolve; });
        const context = {
            console: { log: value => logs.push(String(value)) },
            Uint8Array, ArrayBuffer, DataView, TextEncoder, TextDecoder,
            atob, btoa,
            setTimeout: handler => { timers.push(handler); return timers.length; },
            clearTimeout: () => {},
            $request: { url, headers: {} },
            $persistentStore: { read: () => null, write: () => true },
            $notification: { post: () => {} },
            $done: result => { completions.push(result); resolveDone(result); },
            $httpClient: {
                post(options, handler) {
                    calls.push(options);
                    callback = handler;
                    if (mode === "timeout") return;
                    if (mode === "error") { handler("unavailable", null, ""); return; }
                    service.fetch(new Request(options.url, {
                        method: "POST", headers: options.headers, body: options.body
                    }), env).then(async response => handler(null, { status: response.status }, await response.text()))
                        .catch(error => handler(String(error), null, ""));
                }
            }
        };
        if (responseBody !== undefined) context.$response = { body: responseBody, headers: {} };
        vm.runInNewContext(source, context, { timeout: 10000 });
        if (mode === "timeout") {
            assert.equal(timers.length, 1);
            timers[0]();
            callback(null, { status: 200 }, '{"valid":true}');
        }
        let timeout;
        const result = await Promise.race([
            done,
            new Promise((resolve, reject) => { timeout = setTimeout(() => reject(new Error("Client did not finish")), 4000); })
        ]).finally(() => clearTimeout(timeout));
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(completions.length, 1);
        for (const call of calls) {
            assert.equal(call.url, origin + "/validate");
            assert.equal(call.body, "{}");
            assert.deepEqual(Object.keys(call.headers).sort(), ["Authorization", "Content-Type"]);
            assert.ok(!JSON.stringify(call).includes("do-not-forward"));
        }
        return { result, calls, logs };
    }

    const adUrl = "https://www.youtube.com/api/stats/ads?secret=do-not-forward";
    const active = await runClient(cachedRequest, adUrl);
    assert.equal(active.calls.length, 1);
    assert.equal(active.result.response.status, 200);
    assert.equal(active.result.response.body, "");
    const normal = await runClient(cachedRequest, "https://r1.googlevideo.com/videoplayback?id=normal");
    assert.equal(normal.calls.length, 0);
    assert.equal(Object.keys(normal.result).length, 0);
    const redirect = await runClient(cachedRequest,
        "https://r1.googlevideo.com/videoplayback?foo=1&ctier=L&bar=2,ctier,last");
    assert.equal(redirect.result.response.status, 302);
    assert.equal(redirect.result.response.headers.Location,
        "https://r1.googlevideo.com/videoplayback?foo=1&bar=2last");
    for (const mode of ["error", "timeout"]) {
        const failed = await runClient(cachedRequest, adUrl, undefined, mode);
        assert.equal(Object.keys(failed.result).length, 0);
    }

    const fixture = new Uint8Array([0x3a, 0x00, 0xa2, 0x04, 0x00, 0x12, 0x00]);
    const processed = await runClient(cachedResponse,
        "https://youtubei.googleapis.com/youtubei/v1/player?secret=do-not-forward", fixture);
    assert.equal(processed.calls.length, 1);
    assert.ok(processed.result.body instanceof Uint8Array);
    const fields = fieldsOf(processed.result.body);
    assert.ok(!fields.some(field => field.field === 7 || field.field === 68));
    assert.ok(fields.find(field => field.field === 2)?.value.length > 0);
    const arrayBuffer = await runClient(cachedResponse,
        "https://youtubei.googleapis.com/youtubei/v1/player", fixture.buffer);
    assert.ok(arrayBuffer.result.body instanceof Uint8Array);

    const revoked = await request("/admin/revoke", {
        method: "POST", headers: adminHeaders, body: JSON.stringify({ id: created.license.id })
    });
    assert.equal(revoked.status, 200);
    for (const path of ["/youtube.conf", "/scripts/request.js", "/scripts/response.js"]) {
        assert.equal((await request(path + "?key=" + created.key)).status, 403);
    }
    const cachedAfterRevocation = await runClient(cachedRequest, adUrl);
    assert.equal(cachedAfterRevocation.calls.length, 1);
    assert.equal(Object.keys(cachedAfterRevocation.result).length, 0);
    const responseAfterRevocation = await runClient(cachedResponse,
        "https://youtubei.googleapis.com/youtubei/v1/player", fixture);
    assert.equal(Object.keys(responseAfterRevocation.result).length, 0);
    assert.deepEqual([...fixture], [0x3a, 0x00, 0xa2, 0x04, 0x00, 0x12, 0x00]);

    const expired = await createKey("Expired fixture");
    const record = storage.records.get("license:" + expired.license.id);
    record.expiresAt = Date.now() - 1;
    await storage.put("license:" + expired.license.id, record);
    assert.equal((await request("/youtube.conf?key=" + expired.key)).status, 403);
    assert.equal((await request("/validate", {
        method: "POST", headers: { Authorization: "Bearer " + expired.key }
    })).status, 403);
    const list = await (await request("/admin/keys", { headers: { Authorization: basic } })).json();
    assert.equal(list.licenses.length, 2);
    assert.ok(list.licenses.every(license => !("key" in license)));
    return [
        "Admin authentication and origin checks",
        "Key creation, expiry, revocation, and hash-only storage",
        "Protected configuration and script downloads",
        "Runtime checks on already-downloaded scripts",
        "Network failure, timeout, and pass-through behavior",
        "URL blocking and redirect equivalence",
        "Synthetic protobuf ad removal and background-play change",
        "ArrayBuffer response normalization"
    ];
}
