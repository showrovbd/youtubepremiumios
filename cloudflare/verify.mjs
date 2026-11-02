import { readFile } from "node:fs/promises";
import { createService, LicenseRegistry } from "./service.js";
import { runChecks } from "./checks.mjs";
import { runAppKeyChecks } from "./app-key-checks.mjs";

const read = path => readFile(new URL(path, import.meta.url), "utf8");
const results = await runChecks({
    createService, LicenseRegistry,
    configTemplate: await read("../youtube-test.conf"),
    requestScript: await read("./dist/request.js.txt"),
    responseScript: await read("./dist/response.js.txt"),
    adminPage: await read("./admin.html"),
    licenseText: await read("./vendor/LICENSE")
});
for (const result of results) console.log("PASS " + result);

for (const result of await runAppKeyChecks({createService,LicenseRegistry,configTemplate:await read("../youtube-test.conf"),requestScript:await read("./dist/request.js.txt"),responseScript:await read("./dist/response.js.txt"),adminPage:await read("./admin.html"),licenseText:await read("./vendor/LICENSE")})) console.log("PASS "+result);
