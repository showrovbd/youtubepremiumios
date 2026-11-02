import { readFile } from "node:fs/promises";
import { LicenseRegistry } from "../service.js";
import { createRemoteService, MAX_BODY_BYTES } from "./service.js";
import { processYouTube } from "./processor.js";
import { runServerChecks } from "./checks.mjs";

const root = new URL("../../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const result = await runServerChecks({
    createRemoteService, LicenseRegistry, processYouTube, MAX_BODY_BYTES,
    configTemplate: await read("youtube-test.conf"),
    requestScript: await read("cloudflare/dist/request.js.txt"),
    responseScript: await read("cloudflare/server/response.js.txt"),
    adminPage: await read("cloudflare/admin.html"),
    licenseText: await read("cloudflare/vendor/LICENSE")
});
for (const check of result.checks) console.log("PASS " + check);
console.log("Synthetic 64 KiB processor time: " + result.synthetic64KiBProcessingMs + " ms (Node.js, not a Cloudflare CPU limit check).");
