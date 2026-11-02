import assert from "node:assert/strict";
import vm from "node:vm";
import { performance } from "node:perf_hooks";

class TestStorage {
    records = new Map();
    async get(key) { return structuredClone(this.records.get(key)); }
    async put(key, value) { this.records.set(key, structuredClone(value)); }
    async list({ prefix }) {
        return new Map([...this.records].filter(([key]) => key.startsWith(prefix))
            .map(([key, value]) => [key, structuredClone(value)]));
    }
    async transaction(callback) { return callback(this); }
}

function protobufFields(bytes) {
    let position = 0;
    const varint = () => {
        let result = 0, shift = 0;
        while (position < bytes.length) {
            const value = bytes[position++];
            result += (value & 127) * 2 ** shift;
            if (!(value & 128)) return result;
            shift += 7;
        }
        throw new Error("Truncated fixture");
    };
    const fields = [];
    while (position < bytes.length) {
        const tag = varint(), wire = tag % 8, number = Math.floor(tag / 8);
        if (wire === 0) fields.push({ number, value: varint() });
        else if (wire === 2) {
            const length = varint();
            fields.push({ number, value: bytes.slice(position, position + length) });
            position += length;
        } else throw new Error("Unexpected fixture wire type");
    }
    return fields;
}

function varintBytes(value) {
    const result = [];
    do {
        const byte = value % 128;
        value = Math.floor(value / 128);
        result.push(byte | (value ? 128 : 0));
    } while (value);
    return result;
}

export async function runServerChecks({ createRemoteService, LicenseRegistry, processYouTube, MAX_BODY_BYTES, configTemplate, requestScript, responseScript, adminPage, licenseText }) {
    const storage = new TestStorage();
    const registry = new LicenseRegistry({ storage });
    const env = {
        ADMIN_PASSWORD: "server-test-password-000000000000000000000",
        LICENSES: { idFromName: name => name, get: () => registry }
    };
    let processingCalls = 0;
    const inputs = {
        configTemplate, requestScript, responseScript, adminPage, licenseText,
        processYouTube: async (...arguments_) => { processingCalls++; return processYouTube(...arguments_); }
    };
    const service = createRemoteService(inputs);
    const origin = "https://showrov-server-test.workers.dev";
    const basic = "Basic " + btoa("Showrov:" + env.ADMIN_PASSWORD);
    const adminHeaders = { Authorization: basic, Origin: origin, "Content-Type": "application/json", "X-Showrov-Admin": "1" };
    async function createKey(label) {
        const response = await service.fetch(new Request(origin + "/admin/keys", {
            method: "POST", headers: adminHeaders, body: JSON.stringify({ label, days: 1 })
        }), env);
        assert.equal(response.status, 201);
        return response.json();
    }
    const active = await createKey("Server tests");
    const fixture = new Uint8Array([0x3a, 0x00, 0xa2, 0x04, 0x00, 0x12, 0x00]);
    const processHeaders = key => ({
        Authorization: "Bearer " + key,
        "Content-Type": "application/octet-stream",
        "X-Showrov-Endpoint": "player"
    });
    const call = (key, bytes = fixture, headers = {}) => service.fetch(new Request(origin + "/process", {
        method: "POST", headers: { ...processHeaders(key), ...headers }, body: bytes
    }), env);

    const success = await call(active.key);
    assert.equal(success.status, 200);
    assert.match(success.headers.get("Cache-Control"), /no-store/);
    const modified = new Uint8Array(await success.arrayBuffer());
    const fields = protobufFields(modified);
    assert.ok(!fields.some(field => field.number === 7 || field.number === 68));
    assert.ok(fields.find(field => field.number === 2)?.value.length > 0);
    assert.deepEqual([...fixture], [0x3a, 0, 0xa2, 4, 0, 0x12, 0]);
    assert.equal(processingCalls, 1);
    assert.equal((await service.fetch(new Request(origin + "/process"), env)).status, 405);
    assert.equal((await call(active.key, fixture, { "X-Showrov-Endpoint": "https://untrusted.example/" })).status, 400);
    assert.equal((await call(active.key, fixture, { "Content-Type": "application/json" })).status, 415);
    assert.equal((await call(active.key, fixture, { "Content-Length": String(MAX_BODY_BYTES + 1) })).status, 413);
    assert.equal((await call(active.key, new Uint8Array(MAX_BODY_BYTES + 1))).status, 413);
    assert.equal(processingCalls, 1);
    assert.equal((await call(active.key, new Uint8Array([255]))).status, 204);
    const nullService = createRemoteService({ ...inputs, processYouTube: async () => null });
    assert.equal((await nullService.fetch(new Request(origin + "/process", {
        method: "POST", headers: processHeaders(active.key), body: fixture
    }), env)).status, 204);

    const download = await service.fetch(new Request(origin + "/scripts/response.js?key=" + active.key), env);
    assert.equal(download.status, 200);
    const cachedClient = await download.text();
    assert.ok(cachedClient.includes('settings.origin + "/process"'));
    assert.ok(!cachedClient.includes("youtube.response.watch.Watch"));
    assert.ok(!cachedClient.includes("function qr"));
    assert.equal((await service.fetch(new Request(origin + "/server/processor.js"), env)).status, 404);
    const config = await (await service.fetch(new Request(origin + "/youtube.conf?key=" + active.key), env)).text();
    assert.ok(config.includes("#!author = Showrov"));
    assert.ok(!config.includes("[Url Rewrite]"));
    assert.ok(!config.includes("[Map Local]"));

    async function client(mode = "normal", body = fixture) {
        let resolveDone, rejectDone, pendingCallback;
        const done = new Promise((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
        const completions = [], calls = [], timers = [];
        const context = {
            Uint8Array, ArrayBuffer, DataView, TextEncoder, TextDecoder, Set, URL,
            console: { log: () => {} },
            setTimeout: callback => { timers.push(callback); return timers.length; },
            clearTimeout: () => {},
            $request: {
                url: "https://youtubei.googleapis.com/youtubei/v1/player?private=do-not-forward",
                headers: { Authorization: "YouTube-private-header-do-not-forward", Cookie: "do-not-forward" }
            },
            $response: { body, headers: { "X-Private": "do-not-forward" } },
            $done: result => { completions.push(result); resolveDone(result); },
            $httpClient: {
                post(options, callback) {
                    calls.push(options);
                    pendingCallback = callback;
                    if (mode === "timeout") return;
                    if (mode === "throw") throw new Error("Network unavailable");
                    if (mode === "error") { callback("unavailable", null, null); return; }
                    if (mode === "bad-output") { callback(null, { status: 200 }, "not binary"); return; }
                    if (mode === "server-error") { callback(null, { status: 503 }, new Uint8Array()); return; }
                    service.fetch(new Request(options.url, { method: "POST", headers: options.headers, body: options.body }), env)
                        .then(async response => callback(null, { status: response.status }, await response.arrayBuffer()))
                        .catch(rejectDone);
                }
            }
        };
        vm.runInNewContext(cachedClient, context, { timeout: 10000 });
        if (mode === "timeout") {
            assert.equal(timers.length, 1);
            timers[0]();
            pendingCallback(null, { status: 200 }, fixture);
        }
        let watchdog;
        const output = await Promise.race([
            done,
            new Promise((resolve, reject) => { watchdog = setTimeout(() => reject(new Error("Client did not finish")), 5000); })
        ]).finally(() => clearTimeout(watchdog));
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(completions.length, 1);
        assert.equal(calls.length, 1);
        const request = calls[0];
        assert.equal(request.url, origin + "/process");
        assert.equal(request.headers["X-Showrov-Endpoint"], "player");
        assert.equal(request["binary-mode"], true);
        assert.ok(request.body instanceof Uint8Array);
        assert.deepEqual(Object.keys(request.headers).sort(), ["Authorization", "Content-Type", "X-Showrov-Endpoint"]);
        assert.ok(!JSON.stringify(request.headers).includes("do-not-forward"));
        assert.ok(!request.url.includes("do-not-forward"));
        return output;
    }

    const clientResult = await client();
    assert.ok(clientResult.body instanceof Uint8Array);
    assert.deepEqual([...clientResult.body], [...modified]);
    assert.ok((await client("normal", fixture.buffer)).body instanceof Uint8Array);
    for (const mode of ["timeout", "throw", "error", "bad-output", "server-error"]) {
        assert.equal(Object.keys(await client(mode)).length, 0);
    }
    const beforeDenials = processingCalls;
    class UnreadRequest extends Request {
        get body() { throw new Error("Denied requests must not read the response body."); }
    }
    for (const key of ["sr_" + "A".repeat(43), "bad-key"]) {
        const denied = await service.fetch(new UnreadRequest(origin + "/process", {
            method: "POST", headers: processHeaders(key)
        }), env);
        assert.equal(denied.status, 403);
    }
    const expired = await createKey("Expired server tests");
    const expiredRecord = storage.records.get("license:" + expired.license.id);
    expiredRecord.expiresAt = Date.now() - 1;
    await storage.put("license:" + expired.license.id, expiredRecord);
    assert.equal((await service.fetch(new UnreadRequest(origin + "/process", {
        method: "POST", headers: processHeaders(expired.key)
    }), env)).status, 403);
    assert.equal(processingCalls, beforeDenials);

    const revoked = await service.fetch(new Request(origin + "/admin/revoke", {
        method: "POST", headers: adminHeaders, body: JSON.stringify({ id: active.license.id })
    }), env);
    assert.equal(revoked.status, 200);
    assert.equal((await call(active.key)).status, 403);
    assert.equal(Object.keys(await client()).length, 0);
    assert.equal(processingCalls, beforeDenials);
    assert.equal((await service.fetch(new Request(origin + "/scripts/response.js?key=" + active.key), env)).status, 403);
    assert.equal((await service.fetch(new Request(origin + "/youtube.conf?key=" + active.key), env)).status, 403);
    assert.equal((await service.fetch(new UnreadRequest(origin + "/process", {
        method: "POST", headers: processHeaders(active.key)
    }), {})).status, 503);
    assert.deepEqual([...storage.records.keys()].sort(), ["license:" + active.license.id, "license:" + expired.license.id].sort());
    for (const record of storage.records.values()) assert.deepEqual(Object.keys(record).sort(), ["id", "label", "app", "createdAt", "expiresAt", "revokedAt"].sort());

    // Independently verify that unknown protobuf fields survive processing.
    const padding = new Uint8Array(64 * 1024).fill(65);
    const unknownField = new Uint8Array([...varintBytes((100 << 3) | 2), ...varintBytes(padding.length), ...padding]);
    const padded = new Uint8Array(fixture.length + unknownField.length);
    padded.set(fixture); padded.set(unknownField, fixture.length);
    const started = performance.now();
    const output = await processYouTube("player", padded);
    const elapsedMs = performance.now() - started;
    const preserved = protobufFields(output).find(field => field.number === 100);
    assert.deepEqual([...preserved.value], [...padding]);
    assert.equal((await processYouTube("player", new Uint8Array([255]))), null);
    return {
        checks: [
            "Server protobuf ad removal and background-play changes",
            "Expired/revoked keys denied before body reading or processing",
            "Thin client uses binary input/output without forwarding YouTube URLs or headers",
            "Already-downloaded clients stop processing after revocation",
            "Payload limits, malformed input, timeouts, and network failures",
            "No response data in license storage and unknown-field preservation"
        ],
        synthetic64KiBProcessingMs: Number(elapsedMs.toFixed(3))
    };
}
