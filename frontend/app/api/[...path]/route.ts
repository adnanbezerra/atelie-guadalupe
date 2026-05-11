import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { isExpiredAccessTokenError } from "@/lib/auth-session";
import { AUTH_TOKEN_KEYS } from "@/lib/constants";
import { env } from "@/lib/env";

export const runtime = "nodejs";

async function proxyRequest(request: NextRequest, path: string[]) {
    const url = new URL(request.url);
    const target = new URL(`${env.API_BASE_URL}/${path.join("/")}`);
    target.search = url.search;

    const cookieStore = await cookies();
    const token =
        request.headers.get("authorization") ??
        cookieStore.get(env.AUTH_COOKIE_NAME)?.value ??
        AUTH_TOKEN_KEYS.map((name) => cookieStore.get(name)?.value).find(
            Boolean,
        );
    const contentType = request.headers.get("content-type");
    const accept = request.headers.get("accept");

    const body =
        request.method === "GET" || request.method === "HEAD"
            ? undefined
            : await request.arrayBuffer();
    let response: Response;

    try {
        response = await fetch(target, {
            method: request.method,
            headers: {
                ...(accept ? { accept } : {}),
                ...(contentType ? { "content-type": contentType } : {}),
                ...(token
                    ? {
                          authorization: token.startsWith("Bearer ")
                              ? token
                              : `Bearer ${token}`,
                      }
                    : {}),
            },
            body,
            cache: "no-store",
        });
    } catch (error) {
        const cause =
            error instanceof Error && "cause" in error
                ? String(error.cause)
                : undefined;

        return NextResponse.json(
            {
                success: false,
                error: {
                    code: "API_UNREACHABLE",
                    message: `Nao foi possivel conectar ao backend em ${env.API_BASE_URL}. Verifique se a API esta rodando e se API_BASE_URL esta correta.`,
                    details: cause ? [{ message: cause }] : [],
                },
            },
            { status: 502 },
        );
    }

    const responseText = await response.text();

    const proxiedResponse = new NextResponse(responseText, {
        status: response.status,
        headers: {
            "content-type":
                response.headers.get("content-type") ?? "application/json",
        },
    });

    try {
        const payload = JSON.parse(responseText);

        if (isExpiredAccessTokenError(response.status, payload)) {
            for (const name of [env.AUTH_COOKIE_NAME, ...AUTH_TOKEN_KEYS]) {
                proxiedResponse.cookies.set(name, "", {
                    maxAge: 0,
                    path: "/",
                    sameSite: "lax",
                });
            }
        }
    } catch {
        // Backend returned non-JSON body. Leave response unchanged.
    }

    return proxiedResponse;
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ path: string[] }> },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}
