export type ApiEnvelope<T> = {
    success: boolean;
    data: T;
    error?: {
        code: string;
        message: string;
        details?: Array<{
            path?: string;
            message: string;
            code?: string;
        }>;
    };
};

export type PriceOption = {
    size: "GRAMS_70" | "GRAMS_100" | string;
    grams: number;
    priceInCents: number;
};

export type ProductSize = PriceOption["size"];
export type OrderStatus =
    | "PENDING"
    | "AWAITING_PAYMENT"
    | "PAID"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | string;

export type ProductLine = {
    uuid: string;
    slug: string;
    name: string;
    pricePerGramInCents: number;
    createdAt?: string;
    updatedAt?: string;
};

export type Product = {
    uuid: string;
    slug: string;
    name: string;
    line: ProductLine;
    priceOptions: PriceOption[];
    imageUrl: string;
    stock: number;
    shortDescription: string;
    longDescription: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type ProductListResponse = {
    items: Product[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
};

export type Pagination = ProductListResponse["pagination"];
export type ProductsPayload = ProductListResponse;
export type PublicProductsPayload = ProductListResponse;
export type ApiResponse<T> = ApiEnvelope<T>;

export type CollectionKey = "beauty" | "crafts";

export type UserRole = "ADMIN" | "SUBADMIN" | "USER" | string;

export type CartItem = {
    uuid: string;
    productUuid: string;
    name: string;
    productSize: string;
    grams: number;
    quantity: number;
    unitPriceInCents: number;
    totalPriceInCents: number;
    imageUrl: string;
    isAvailable: boolean;
};

export type Cart = {
    uuid: string;
    items: CartItem[];
    summary: {
        itemsCount: number;
        subtotalInCents: number;
    };
};

export type Address = {
    uuid: string;
    label?: string;
    recipient: string;
    zipCode: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
    reference?: string | null;
};

export type User = {
    uuid: string;
    name: string;
    email: string;
    document: string;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    addresses?: Address[];
};

export type OrderItem = {
    uuid: string;
    productSize: string;
    grams: number;
    productNameSnapshot: string;
    imageUrlSnapshot: string;
    quantity: number;
    unitPriceInCents: number;
    totalPriceInCents: number;
};

export type Order = {
    uuid: string;
    status: string;
    subtotalInCents: number;
    shippingInCents: number;
    discountInCents: number;
    totalInCents: number;
    notes?: string | null;
    placedAt: string;
    createdAt: string;
    updatedAt: string;
    address: Address | null;
    items: OrderItem[];
};

export type OrdersResponse = {
    orders: Order[];
};

export type ProductQuery = {
    page?: number;
    pageSize?: number;
    search?: string;
    lineUuid?: string;
    size?: string;
    minPriceInCents?: number;
    maxPriceInCents?: number;
    inStock?: boolean;
};
