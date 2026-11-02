(() => {
    const phase = __SHOWROV_PHASE__;
    const rules = __SHOWROV_RULES__;
    const originalArguments = __SHOWROV_ARGUMENTS__;
    const settings = globalThis.__SHOWROV_LICENSE__;
    let completed = false;
    function finish(result) {
        if (completed) return;
        completed = true;
        $done(result);
    }
    function skip(message) {
        console.log("[Showrov] " + message);
        finish({});
    }
    function runOriginal($done, $argument, $response) {
        __SHOWROV_UPSTREAM__();
    }
    if (typeof $request === "undefined" || !$request || typeof $request.url !== "string") {
        skip("No live request context.");
        return;
    }
    let action = null;
    if (phase === "request") {
        for (const rule of rules) {
            const pattern = new RegExp(rule.pattern);
            if (pattern.test($request.url)) {
                action = rule.status === 302
                    ? { status: 302, location: $request.url.replace(pattern, rule.replacement) }
                    : { status: rule.status };
                break;
            }
        }
        if (!action) {
            finish({});
            return;
        }
    } else if (typeof $response === "undefined" || !$response) {
        skip("No live response context.");
        return;
    }
    if (!settings || !/^https:\/\/[^/?#]+$/.test(settings.origin)
        || !/^sr_[A-Za-z0-9_-]{43}$/.test(settings.key)) {
        skip("A valid license configuration is required.");
        return;
    }
    let settled = false;
    const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        skip("Key validation timed out; enhancements skipped.");
    }, 5000);
    function validated(error, response, body) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        let verdict;
        try { verdict = JSON.parse(body); } catch {}
        if (error || Number(response && (response.status || response.statusCode)) !== 200 || verdict?.valid !== true) {
            skip("Key rejected or service unavailable; enhancements skipped.");
            return;
        }
        if (phase === "request") {
            const headers = { "Content-Type": "text/plain", "Cache-Control": "no-store" };
            if (action.location) headers.Location = action.location;
            finish({ response: { status: action.status, headers, body: "" } });
            return;
        }
        try {
            let bodyBytes = $response.body;
            if (bodyBytes instanceof ArrayBuffer) bodyBytes = new Uint8Array(bodyBytes);
            else if (ArrayBuffer.isView(bodyBytes) && !(bodyBytes instanceof Uint8Array)) {
                bodyBytes = new Uint8Array(bodyBytes.buffer, bodyBytes.byteOffset, bodyBytes.byteLength);
            }
            if (!(bodyBytes instanceof Uint8Array)) {
                skip("Binary response unavailable; check binary-body-mode.");
                return;
            }
            const responseValue = bodyBytes === $response.body ? $response : { ...$response, body: bodyBytes };
            runOriginal(finish, JSON.stringify(originalArguments), responseValue);
        } catch {
            skip("Response processing failed; original response retained.");
        }
    }
    try {
        $httpClient.post({
            url: settings.origin + "/validate",
            headers: { Authorization: "Bearer " + settings.key, "Content-Type": "application/json" },
            body: "{}",
            timeout: 5
        }, validated);
    } catch {
        validated(true, null, "");
    }
})();
