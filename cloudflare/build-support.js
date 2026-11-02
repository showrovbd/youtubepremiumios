export function sourceInputs(config) {
    const sections = new Map();
    let current = null;
    for (const line of config.split(/\r?\n/)) {
        const match = line.trim().match(/^\[([^\]]+)\]$/);
        if (match) {
            current = match[1];
            sections.set(current, []);
        } else if (current && line.trim() && !line.trim().startsWith("#")) {
            sections.get(current).push(line.trim());
        }
    }
    const rules = [];
    for (const line of sections.get("Url Rewrite") || []) {
        const match = line.match(/^(\S+)\s+(\S+)\s+(reject-200|302)$/);
        if (!match) throw new Error("Unsupported URL rewrite: " + line);
        rules.push({ pattern: match[1], replacement: match[2], status: match[3] === "302" ? 302 : 200 });
    }
    for (const line of sections.get("Map Local") || []) {
        const match = line.match(/^(\S+)\s+data-type=text\s+data=""\s+status-code=(\d+)$/);
        if (!match) throw new Error("Unsupported local mapping: " + line);
        rules.push({ pattern: match[1], status: Number(match[2]) });
    }
    const response = sections.get("Script")?.find(line => line.startsWith("youtube.response"));
    let argument = response?.match(/,argument=(.*)$/)?.[1] || "{}";
    if (argument.startsWith('"') && argument.endsWith('"')) argument = argument.slice(1, -1);
    const originalArguments = JSON.parse(argument);
    for (const rule of rules) new RegExp(rule.pattern);
    return { rules, originalArguments };
}

export function clientSource(template, phase, config, upstream) {
    const { rules, originalArguments } = sourceInputs(config);
    return template
        .replace("__SHOWROV_PHASE__", () => JSON.stringify(phase))
        .replace("__SHOWROV_RULES__", () => JSON.stringify(rules))
        .replace("__SHOWROV_ARGUMENTS__", () => JSON.stringify(originalArguments))
        .replace("__SHOWROV_UPSTREAM__();", () => phase === "response" ? upstream : "");
}

export const obfuscationOptions = {
    compact: true,
    target: "browser-no-eval",
    seed: 7331,
    identifierNamesGenerator: "hexadecimal",
    renameGlobals: false,
    stringArray: true,
    stringArrayThreshold: 0.5,
    stringArrayEncoding: ["base64"],
    controlFlowFlattening: false,
    deadCodeInjection: false,
    selfDefending: false,
    debugProtection: false,
    disableConsoleOutput: false,
    log: false
};
