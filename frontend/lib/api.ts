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
    Testimonial,
    TestimonialsPayload,
    CreateTestimonialInput,
    UpdateProductInput,
    UpdateTestimonialInput,
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
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    token?: string | null;
    query?: Record<string, string | number | boolean | undefined>;
};

type UploadProgressOptions = {
    onUploadProgress?: (progress: number) => void;
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

function buildTestimonialFormData(
    body: Extract<
        CreateTestimonialInput | UpdateTestimonialInput,
        { type: "VIDEO" }
    >,
) {
    const formData = new FormData();

    if ("uuid" in body) {
        formData.append("uuid", body.uuid);
    }

    formData.append("type", body.type);
    formData.append("isActive", String(body.isActive));

    if (body.title) {
        formData.append("title", body.title);
    }

    if (body.video) {
        formData.append("video", body.video);
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
    let body: BodyInit | undefined;

    if (options.body instanceof FormData) {
        body = options.body;
    } else if (options.body !== undefined) {
        body = JSON.stringify(options.body);
    }

    const isFormData = body instanceof FormData;
    const hasJsonBody = body !== undefined && !isFormData;

    const response = await fetch(buildUrl(path, options.query), {
        method: options.method ?? "GET",
        headers: {
            ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
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

function requestWithUploadProgress<T>(
    path: string,
    options: RequestOptions & UploadProgressOptions,
) {
    return new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open(options.method ?? "GET", buildUrl(path, options.query));

        if (options.token) {
            xhr.setRequestHeader("Authorization", `Bearer ${options.token}`);
        }

        xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable || !options.onUploadProgress) {
                return;
            }

            const progress = Math.round((event.loaded / event.total) * 100);
            options.onUploadProgress(Math.min(99, progress));
        };

        xhr.onload = () => {
            let payload: ApiEnvelope<T>;

            try {
                payload = JSON.parse(xhr.responseText) as ApiEnvelope<T>;
            } catch {
                reject(new ApiError("Resposta inválida da API.", xhr.status));
                return;
            }

            if (xhr.status < 200 || xhr.status >= 300 || !payload.success) {
                if (isExpiredAccessTokenError(xhr.status, payload)) {
                    clearAuthSession();
                }

                reject(
                    new ApiError(
                        payload.error?.message ?? "Falha ao acessar a API.",
                        xhr.status,
                        payload.error?.code,
                    ),
                );
                return;
            }

            options.onUploadProgress?.(100);
            resolve(payload.data);
        };

        xhr.onerror = () => {
            reject(new ApiError("Falha ao acessar a API.", xhr.status));
        };

        xhr.send(options.body instanceof FormData ? options.body : undefined);
    });
}

export function getProducts(query?: ProductQuery) {
    return request<ProductListResponse>("/products", { query });
}

export function getProductBySlug(slug: string) {
    return request<{ product: Product }>(
        `/products/slug/${encodeURIComponent(slug)}`,
    );
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

export function getTestimonials(token?: string | null) {
    return request<TestimonialsPayload>("/testimonials", { token });
}

export function upsertTestimonial(
    token: string,
    body: CreateTestimonialInput | UpdateTestimonialInput,
    options: UploadProgressOptions = {},
) {
    if (body.type === "VIDEO") {
        return requestWithUploadProgress<{ testimonial: Testimonial }>(
            "/testimonials",
            {
                method: "PUT",
                token,
                body: buildTestimonialFormData(body),
                onUploadProgress: options.onUploadProgress,
            },
        );
    }

    return request<{ testimonial: Testimonial }>("/testimonials", {
        method: "PUT",
        token,
        body,
    });
}

export function deactivateTestimonial(token: string, testimonialUuid: string) {
    return request<{ testimonial: Testimonial }>(
        `/testimonials/${testimonialUuid}/deactivate`,
        {
            method: "PATCH",
            token,
        },
    );
}

export function deleteTestimonial(token: string, testimonialUuid: string) {
    return request<{ deleted: boolean }>(`/testimonials/${testimonialUuid}`, {
        method: "DELETE",
        token,
    });
}
