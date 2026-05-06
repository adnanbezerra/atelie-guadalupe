import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const TOKEN_COOKIE_NAMES = [
    AUTH_COOKIE_NAME,
    "atelie_token",
    "auth-token",
    "token",
    "jwt",
    "access_token",
];

const ADMIN_ROLES = new Set(["ADMIN", "SUBADMIN"]);

function decodeBase64Url(value: string) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        "=",
    );

    return atob(padded);
}

function readRoleFromToken(token: string) {
    const normalizedToken = token.startsWith("Bearer ")
        ? token.slice("Bearer ".length)
        : token;
    const payload = normalizedToken.split(".")[1];

    if (!payload) {
        return null;
    }

    try {
        const parsed = JSON.parse(decodeBase64Url(payload)) as {
            role?: unknown;
        };

        return typeof parsed.role === "string" ? parsed.role : null;
    } catch {
        return null;
    }
}

function readToken(request: NextRequest) {
    for (const name of TOKEN_COOKIE_NAMES) {
        const value = request.cookies.get(name)?.value;

        if (value) {
            return value;
        }
    }

    return null;
}

export function proxy(request: NextRequest) {
    const token = readToken(request);

    if (!token) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set(
            "next",
            `${request.nextUrl.pathname}${request.nextUrl.search}`,
        );

        return NextResponse.redirect(loginUrl);
    }

    const role = readRoleFromToken(token);

    if (!role) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set(
            "next",
            `${request.nextUrl.pathname}${request.nextUrl.search}`,
        );

        return NextResponse.redirect(loginUrl);
    }

    if (!ADMIN_ROLES.has(role)) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*"],
};
