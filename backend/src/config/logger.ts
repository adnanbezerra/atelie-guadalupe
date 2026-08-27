type RequestForLog = {
    method?: string;
    url?: string;
    hostname?: string;
    ip?: string;
    headers?: { host?: string };
    socket?: { remoteAddress?: string; remotePort?: number };
};

export function stripQueryString(url: string | undefined) {
    if (!url) return url;
    const queryIndex = url.indexOf("?");
    return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

export function serializeRequestForLog(request: RequestForLog) {
    return {
        method: request.method,
        url: stripQueryString(request.url),
        host: request.hostname ?? request.headers?.host,
        remoteAddress: request.ip ?? request.socket?.remoteAddress,
        remotePort: request.socket?.remotePort
    };
}

export const loggerOptions = {
    serializers: {
        req: serializeRequestForLog
    },
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'req.headers["x-webhook-signature"]',
            "headers.authorization",
            "headers.cookie",
            'headers["x-webhook-signature"]'
        ],
        censor: "[REDACTED]"
    }
};
