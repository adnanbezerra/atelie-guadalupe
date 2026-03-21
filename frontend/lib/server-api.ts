import { API_BASE_URL } from "@/lib/constants";
import { getAuthTokenFromCookies } from "@/lib/auth";
import {
    Address,
    ApiResponse,
    Cart,
    Order,
    ProductLine,
    ProductsPayload,
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

async function serverApi<T>(path: string, options: RequestOptions = {}) {
    const token = await readServerToken();
    const response = await fetch(`${API_BASE_URL}${path}`, {
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

export async function fetchProductLines() {
    return serverApi<{ lines: ProductLine[] }>("/products/lines");
}

export async function fetchProducts(params: {
    page?: number;
    pageSize?: number;
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

export async function fetchCart() {
    return serverApi<{ cart: Cart }>("/cart").then((payload) => payload.cart);
}

export async function fetchOrders() {
    return serverApi<{ orders: Order[] }>("/orders");
}

export async function fetchCurrentUser() {
    return serverApi<{ user: User }>("/users/me");
}

export async function fetchAddresses() {
    return serverApi<{ addresses: Address[] }>("/users/me/addresses");
}
