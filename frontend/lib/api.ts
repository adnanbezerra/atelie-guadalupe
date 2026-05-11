import type {
    ApiEnvelope,
    Cart,
    CreateProductInput,
    LegacyProductImageInput,
    OrdersResponse,
    Order,
    Product,
    ProductLine,
    ProductListResponse,
    ProductQuery,
    UpdateProductInput,
    UpdateCurrentUserInput,
    User,
} from "@/lib/types";
import {
    clearAuthSession,
    isExpiredAccessTokenError,
} from "@/lib/auth-session";

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

function isLegacyProductImageInput(
    value: unknown,
): value is LegacyProductImageInput {
    return Boolean(
        value &&
        typeof value === "object" &&
        "base64" in value &&
        "filename" in value &&
        "contentType" in value,
    );
}

function legacyImageToFile(image: LegacyProductImageInput) {
    const bytes = Uint8Array.from(atob(image.base64), (char) =>
        char.charCodeAt(0),
    );

    return new File([bytes], image.filename, { type: image.contentType });
}

function appendProductField(formData: FormData, key: string, value: unknown) {
    if (value === undefined || value === null) return;

    if (key === "image") {
        const image =
            typeof File !== "undefined" && value instanceof File
                ? value
                : isLegacyProductImageInput(value)
                  ? legacyImageToFile(value)
                  : null;

        if (image) {
            formData.append("image", image);
        }

        return;
    }

    formData.append(key, String(value));
}

function buildProductFormData(body: CreateProductInput | UpdateProductInput) {
    const formData = new FormData();

    for (const [key, value] of Object.entries(body)) {
        appendProductField(formData, key, value);
    }

    return formData;
}

function buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const clientPath = normalizedPath.startsWith("/api/")
        ? normalizedPath
        : `/api${normalizedPath}`;
    const url = new URL(clientPath, "http://local");

    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== "") {
                url.searchParams.set(key, String(value));
            }
        }
    }

    return `${url.pathname}${url.search}`;
}

async function request<T>(path: string, options: RequestOptions = {}) {
    const isFormData = options.body instanceof FormData;
    const body = options.body
        ? isFormData
            ? options.body
            : JSON.stringify(options.body)
        : undefined;

    const response = await fetch(buildUrl(path, options.query), {
        method: options.method ?? "GET",
        headers: {
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            ...(options.token
                ? { Authorization: `Bearer ${options.token}` }
                : {}),
        },
        body,
        cache: "no-store",
    });

    const payload = (await response.json()) as ApiEnvelope<T>;

    if (!response.ok || !payload.success) {
        if (isExpiredAccessTokenError(response.status, payload)) {
            clearAuthSession();
        }

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

export function getProductLines(query?: { category?: string }) {
    return request<{ lines: ProductLine[] }>("/products/lines", { query });
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

export function applyCartCoupon(token: string, code: string) {
    return request<{ cart: Cart }>("/cart/coupon", {
        method: "POST",
        token,
        body: { code },
    });
}

export function removeCartCoupon(token: string) {
    return request<{ cart: Cart }>("/cart/coupon", {
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

export function getMyOrders(
    token: string,
    query: { page?: number; pageSize?: number } = {},
) {
    return request<OrdersResponse>("/users/me/orders", { token, query });
}

export function getCurrentUser(token: string) {
    return request<{ user: User }>("/users/me", { token });
}

export function updateCurrentUser(token: string, body: UpdateCurrentUserInput) {
    return request<{ user: User }>("/users/me", {
        method: "PATCH",
        token,
        body,
    });
}

export function createAdminUser(
    token: string,
    body: {
        name: string;
        email: string;
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

export function createOrder(
    token: string,
    body: {
        addressUuid?: string;
        notes?: string;
        paymentMethod?: "PIX" | "CREDIT_CARD" | "DEBIT_CARD";
    },
) {
    return request<{ order: Order }>("/orders", {
        method: "POST",
        token,
        body,
    });
}

export function createProduct(token: string, body: CreateProductInput) {
    return request<{ product: Product }>("/products", {
        method: "POST",
        token,
        body: buildProductFormData(body),
    });
}

export function updateProduct(
    token: string,
    productUuid: string,
    body: UpdateProductInput,
) {
    return request<{ product: Product }>(`/products/${productUuid}`, {
        method: "PATCH",
        token,
        body: buildProductFormData(body),
    });
}

export function deleteProduct(token: string, productUuid: string) {
    return request<{ deleted: boolean }>(`/products/${productUuid}`, {
        method: "DELETE",
        token,
    });
}
