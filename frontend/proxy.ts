import { NextRequest, NextResponse } from "next/server";
import { AUTH_TOKEN_KEYS } from "@/lib/constants";

const ADMIN_ROLES = new Set(["ADMIN", "SUBADMIN"]);

function decodeBase64Url(value: string) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        "=",
    );

    return atob(padded);
}

type TokenPayload = {
    exp?: unknown;
    role?: unknown;
};

function readPayloadFromToken(token: string) {
    const normalizedToken = token.startsWith("Bearer ")
        ? token.slice("Bearer ".length)
        : token;
    const payload = normalizedToken.split(".")[1];

    if (!payload) {
        return null;
    }

    try {
        return JSON.parse(decodeBase64Url(payload)) as TokenPayload;
    } catch {
        return null;
    }
}

function isExpired(payload: TokenPayload) {
    if (typeof payload.exp !== "number") {
        return false;
    }

    return payload.exp <= Math.floor(Date.now() / 1000);
}

function readToken(request: NextRequest) {
    for (const name of AUTH_TOKEN_KEYS) {
        const value = request.cookies.get(name)?.value;

        if (value) {
            return value;
        }
    }

    return null;
}

export function proxy(request: NextRequest) {
    const token = readToken(request);
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const isProfileRoute = request.nextUrl.pathname.startsWith("/perfil");
    const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

    if (!token) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", next);

        return NextResponse.redirect(loginUrl);
    }

    const payload = readPayloadFromToken(token);

    if (!payload || isExpired(payload)) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", next);

        return NextResponse.redirect(loginUrl);
    }

    if (isProfileRoute) {
        return NextResponse.next();
    }

    const role = typeof payload.role === "string" ? payload.role : null;

    if (isAdminRoute && (!role || !ADMIN_ROLES.has(role))) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/perfil/:path*"],
};
