const mediaPathPattern = /^\/media\/(?:images|videos)\/[a-f0-9]{24}$/i;

export function normalizePublicMediaUrl(url: string): string {
    try {
        const parsedUrl = new URL(url);
        if (isLocalHost(parsedUrl.hostname) && mediaPathPattern.test(parsedUrl.pathname)) {
            return parsedUrl.pathname;
        }
    } catch {
        return url;
    }

    return url;
}

function isLocalHost(hostname: string): boolean {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}
