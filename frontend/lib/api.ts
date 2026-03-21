import type {
    ApiEnvelope,
    Cart,
    OrdersResponse,
    Product,
    ProductLine,
    ProductListResponse,
    ProductQuery,
    User,
} from "@/lib/types";

const API_BASE_URL = "/api";

export class ApiError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

type RequestOptions = {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    token?: string | null;
    query?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
) {
    const url = new URL(path, API_BASE_URL);
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== "") {
                url.searchParams.set(key, String(value));
            }
        }
    }
    return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}) {
    const response = await fetch(buildUrl(path, options.query), {
        method: options.method ?? "GET",
        headers: {
            "Content-Type": "application/json",
            ...(options.token
                ? { Authorization: `Bearer ${options.token}` }
                : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        cache: "no-store",
    });

    const payload = (await response.json()) as ApiEnvelope<T>;

    if (!response.ok || !payload.success) {
        throw new ApiError(
            payload.error?.message ?? "Falha ao acessar a API.",
            response.status,
            payload.error?.code,
        );
    }

    return payload.data;
}

export function getProducts(query?: ProductQuery) {
    return request<ProductListResponse>("/products", { query });
}

export function getProductLines() {
    return request<{ lines: ProductLine[] }>("/products/lines");
}

export function getCart(token: string) {
    return request<{ cart: Cart }>("/cart", { token });
}

export function updateCartItem(
    token: string,
    itemUuid: string,
    body: { quantity?: number; productSize?: string },
) {
    return request<{ cart: Cart }>(`/cart/items/${itemUuid}`, {
        method: "PATCH",
        token,
        body,
    });
}

export function removeCartItem(token: string, itemUuid: string) {
    return request<{ cart: Cart }>(`/cart/items/${itemUuid}`, {
        method: "DELETE",
        token,
    });
}

export function clearCart(token: string) {
    return request<{ cart: Cart }>("/cart/items", {
        method: "DELETE",
        token,
    });
}

export function createCartItem(
    token: string,
    body: { productUuid: string; productSize: string; quantity: number },
) {
    return request<{ cart: Cart }>("/cart/items", {
        method: "POST",
        token,
        body,
    });
}

export function getOrders(token: string) {
    return request<OrdersResponse>("/orders", { token });
}

export function getCurrentUser(token: string) {
    return request<{ user: User }>("/users/me", { token });
}

export function createAdminUser(
    token: string,
    body: {
        name: string;
        email: string;
        document: string;
        password: string;
        role: string;
    },
) {
    return request<{ user: User }>("/users", {
        method: "POST",
        token,
        body,
    });
}

export function createProduct(token: string, body: unknown) {
    return request<{ product: Product }>("/products", {
        method: "POST",
        token,
        body,
    });
}

export function updateProduct(
    token: string,
    productUuid: string,
    body: unknown,
) {
    return request<{ product: Product }>(`/products/${productUuid}`, {
        method: "PATCH",
        token,
        body,
    });
}

export function deleteProduct(token: string, productUuid: string) {
    return request<{ product: Product }>(`/products/${productUuid}`, {
        method: "DELETE",
        token,
    });
}
