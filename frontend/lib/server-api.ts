import { env } from "@/lib/env";
import { getAuthTokenFromCookies } from "@/lib/auth";
import {
    ApiResponse,
    Cart,
    Order,
    ProductLine,
    Product,
    ProductsPayload,
    TestimonialsPayload,
    User,
} from "@/lib/types";
import { buildQuery } from "@/lib/utils";

type RequestOptions = {
    method?: string;
    body?: BodyInit | null;
    headers?: Record<string, string>;
};

async function readServerToken() {
    return getAuthTokenFromCookies();
}

function buildServerApiUrl(path: string) {
    return new URL(path, `${env.API_BASE_URL}/`).toString();
}

async function serverApi<T>(path: string, options: RequestOptions = {}) {
    const token = await readServerToken();
    const response = await fetch(buildServerApiUrl(path), {
        method: options.method ?? "GET",
        body: options.body,
        headers: {
            ...(options.headers ?? {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
    });

    const payload = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !payload.success) {
        const message = payload.error?.message ?? "Falha ao consultar a API.";
        throw new Error(message);
    }

    return payload.data;
}

export async function fetchProductLines(params?: { category?: string }) {
    const query = buildQuery(params ?? {});
    const suffix = query ? `?${query}` : "";
    return serverApi<{ lines: ProductLine[] }>(`/products/lines${suffix}`);
}

export async function fetchProducts(params: {
    page?: number;
    pageSize?: number;
    category?: string;
    search?: string;
    lineUuid?: string;
    size?: string;
    minPriceInCents?: number;
    maxPriceInCents?: number;
    inStock?: boolean;
}) {
    const query = buildQuery(params);
    const suffix = query ? `?${query}` : "";
    return serverApi<ProductsPayload>(`/products${suffix}`);
}

export async function fetchProductBySlug(slug: string) {
    return serverApi<{ product: Product }>(
        `/products/slug/${encodeURIComponent(slug)}`,
    );
}

export async function fetchCart() {
    return serverApi<{ cart: Cart }>("/cart").then((payload) => payload.cart);
}

export async function fetchOrders() {
    return serverApi<{ orders: Order[] }>("/orders");
}

export async function fetchUsers() {
    return serverApi<{ users: User[] }>("/users");
}

export async function fetchMyOrders(params?: {
    page?: number;
    pageSize?: number;
}) {
    const query = buildQuery(params ?? {});
    const suffix = query ? `?${query}` : "";
    return serverApi<{ orders: Order[] }>(`/users/me/orders${suffix}`);
}

export async function fetchCurrentUser() {
    return serverApi<{ user: User }>("/users/me");
}

export async function fetchTestimonials() {
    return serverApi<TestimonialsPayload>("/testimonials");
}

export async function fetchActiveTestimonials() {
    return serverApi<TestimonialsPayload>("/testimonials/active");
}
