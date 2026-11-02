import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import JavaScriptObfuscator from "javascript-obfuscator";
import { clientSource, obfuscationOptions } from "./build-support.js";

const root = new URL("../", import.meta.url);
const config = await readFile(new URL("youtube-test.conf", root), "utf8");
const template = await readFile(new URL("cloudflare/client.js.tpl", root), "utf8");
const upstream = await readFile(new URL("cloudflare/vendor/youtube.response.js.txt", root), "utf8");
const expectedHash = "5762e310cd546084f172828d827e16b1db36d1677a692c5de4f1a476c3bd89e6";
if (createHash("sha256").update(upstream).digest("hex") !== expectedHash) {
    throw new Error("Review and update the pinned upstream hash before rebuilding.");
}
await mkdir(new URL("cloudflare/dist/", root), { recursive: true });
for (const phase of ["request", "response"]) {
    const source = clientSource(template, phase, config, upstream);
    const result = JavaScriptObfuscator.obfuscate(source, obfuscationOptions).getObfuscatedCode();
    await writeFile(new URL("cloudflare/dist/" + phase + ".js.txt", root), result + "\n");
    console.log("Built " + phase + " guard.");
}
