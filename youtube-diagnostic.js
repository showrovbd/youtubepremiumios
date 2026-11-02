(() => {
    const requestValue = typeof $request === "undefined" ? null : $request;
    const requestUrl = requestValue && typeof requestValue.url === "string"
        ? requestValue.url
        : "";
    if (requestUrl) {
        const requestPath = requestUrl
            .replace(/^https?:\/\/[^/]+/, "")
            .split(/[?#]/, 1)[0];
        console.log("[YT-DIAG-1] intercepted " + requestPath);
    } else {
        console.log("[YT-DIAG-1] no live request context");
    }
    $done({});
})();
