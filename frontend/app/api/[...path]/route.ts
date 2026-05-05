import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
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
        cookieStore.get("auth_token")?.value ??
        cookieStore.get("auth-token")?.value ??
        cookieStore.get("atelie_token")?.value ??
        cookieStore.get("token")?.value ??
        cookieStore.get("jwt")?.value ??
        cookieStore.get("access_token")?.value;
    const contentType = request.headers.get("content-type");
    const accept = request.headers.get("accept");

    const bodyText =
        request.method === "GET" || request.method === "HEAD"
            ? undefined
            : await request.text();
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
            body: bodyText,
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

    return new NextResponse(responseText, {
        status: response.status,
        headers: {
            "content-type":
                response.headers.get("content-type") ?? "application/json",
        },
    });
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
