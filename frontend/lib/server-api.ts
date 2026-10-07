import { env } from "@/lib/env";
import { getAuthTokenFromCookies } from "@/lib/auth";
import {
    ApiResponse,
    Cart,
    MarketingCoupon,
    MarketingPayload,
    MarketingPromotion,
    PaymentLinksPayload,
    PaymentLinkPreview,
    AdminDashboardPayload,
    ProductLine,
    Product,
    ProductsPayload,
    TestimonialsPayload,
    User,
    UsersPayload,
    OrdersResponse,
} from "@/lib/types";
import { buildQuery } from "@/lib/utils";
import { ApiError } from "@/lib/api-error";

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
        throw new ApiError(message, response.status, payload.error?.code);
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
    status?: "ACTIVE" | "INACTIVE" | "ALL";
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

export async function fetchProductByUuid(productUuid: string) {
    return serverApi<{ product: Product }>(
        `/products/${encodeURIComponent(productUuid)}`,
    );
}

export async function fetchCart() {
    return serverApi<{ cart: Cart }>("/cart").then((payload) => payload.cart);
}

export async function fetchOrders(
    params: {
        page?: number;
        pageSize?: number;
        status?: string;
        paymentStatus?: string;
        shipmentStatus?: string;
        fulfillmentStatus?: string;
        search?: string;
        sort?: string;
    } = {},
) {
    const query = buildQuery(params);
    const suffix = query ? `?${query}` : "";
    return serverApi<OrdersResponse>(`/orders${suffix}`);
}

export async function fetchPaymentLinks(params?: {
    page?: number;
    pageSize?: number;
}) {
    const query = buildQuery(params ?? {});
    const suffix = query ? `?${query}` : "";
    return serverApi<PaymentLinksPayload>(`/payment-links${suffix}`);
}

export async function fetchUsers(
    params: {
        page?: number;
        pageSize?: number;
        search?: string;
        role?: string;
        isActive?: boolean;
        sort?: string;
    } = {},
) {
    const query = buildQuery(params);
    const suffix = query ? `?${query}` : "";
    return serverApi<UsersPayload>(`/users${suffix}`);
}

export async function fetchMyOrders(params?: {
    page?: number;
    pageSize?: number;
}) {
    const query = buildQuery(params ?? {});
    const suffix = query ? `?${query}` : "";
    return serverApi<OrdersResponse>(`/users/me/orders${suffix}`);
}

export async function fetchCurrentUser() {
    return serverApi<{ user: User }>("/users/me");
}

export async function fetchTestimonials(
    params: {
        page?: number;
        pageSize?: number;
        type?: string;
        isActive?: boolean;
        sort?: string;
    } = {},
) {
    const query = buildQuery(params);
    const suffix = query ? `?${query}` : "";
    return serverApi<TestimonialsPayload>(`/testimonials${suffix}`);
}

export async function fetchPaymentLinkPreview(paymentLinkUuid: string) {
    return serverApi<{ paymentLink: PaymentLinkPreview }>(
        `/payment-links/${encodeURIComponent(paymentLinkUuid)}`,
    );
}

export async function fetchAdminDashboard(params: {
    from: string;
    to: string;
}) {
    const query = buildQuery(params);
    return serverApi<AdminDashboardPayload>(`/admin/dashboard?${query}`);
}

export async function fetchActiveTestimonials() {
    return serverApi<TestimonialsPayload>("/testimonials/active");
}

export async function fetchMarketing() {
    const [promotionsResponse, couponsResponse] = await Promise.all([
        serverApi<{ promotions: MarketingPromotion[] }>(
            "/marketing/promotions",
        ),
        serverApi<{ coupons: MarketingCoupon[] }>("/marketing/coupons"),
    ]);

    return {
        promotions: promotionsResponse.promotions,
        coupons: couponsResponse.coupons,
    } satisfies MarketingPayload;
}
