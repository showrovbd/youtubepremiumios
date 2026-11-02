import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const upstream = await read("cloudflare/vendor/youtube.response.js.txt");
const hash = createHash("sha256").update(upstream).digest("hex");
if (hash !== "5762e310cd546084f172828d827e16b1db36d1677a692c5de4f1a476c3bd89e6") {
    throw new Error("The pinned upstream processor changed; review it before rebuilding.");
}
const source = await read("cloudflare/server/processor-prefix.txt") + upstream + await read("cloudflare/server/processor-suffix.txt");
await writeFile(new URL("cloudflare/server/processor.js", root), source);
console.log("Built the static server processor.");
