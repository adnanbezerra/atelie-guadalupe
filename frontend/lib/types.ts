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
export type ProductCategory = "SELFCARE" | "ARTISANAL";
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
    price70gInCents: number;
    price100gInCents: number;
    createdAt?: string;
    updatedAt?: string;
};

export type Promotion = {
    uuid: string;
    name: string;
    slug: string;
    scope: "ALL_PRODUCTS" | "CATEGORY" | string;
    category: ProductCategory | null;
    discountPercent: number;
    startsAt: string;
    endsAt: string | null;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type MarketingPromotion = Required<
    Pick<
        Promotion,
        | "uuid"
        | "name"
        | "slug"
        | "scope"
        | "category"
        | "discountPercent"
        | "startsAt"
        | "endsAt"
    >
> & {
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type MarketingCoupon = {
    uuid: string;
    code: string;
    discountPercent: number;
    validUntil: string | null;
    maxUses: number | null;
    usedCount: number;
    emails: string[];
    stackableWithPromotions: boolean;
    isActive: boolean;
    cancelledAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type MarketingPayload = {
    promotions: MarketingPromotion[];
    coupons: MarketingCoupon[];
};

export type CreateMarketingPromotionInput = {
    name: string;
    scope: "ALL_PRODUCTS" | "CATEGORY";
    category?: ProductCategory | null;
    discountPercent: number;
    startsAt: string;
    endsAt?: string | null;
    isActive: boolean;
};

export type UpdateMarketingPromotionInput =
    Partial<CreateMarketingPromotionInput>;

export type CreateMarketingCouponInput = {
    code: string;
    discountPercent: number;
    validUntil?: string | null;
    maxUses?: number | null;
    emails: string[];
    stackableWithPromotions: boolean;
    isActive: boolean;
};

export type UpdateMarketingCouponInput = Partial<CreateMarketingCouponInput>;

export type Product = {
    uuid: string;
    slug: string;
    name: string;
    category: ProductCategory;
    line: ProductLine;
    priceOptions: PriceOption[];
    activePromotion?: Promotion | null;
    promotionDiscountPercent?: number;
    imageUrl: string;
    stock: number | null;
    shippingWeightGrams: number | null;
    description?: string | null;
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
    category?: ProductCategory;
    productCategory?: ProductCategory;
    productSize: string;
    grams: number;
    quantity: number;
    unitPriceInCents: number;
    totalPriceInCents: number;
    activePromotion?: Promotion | null;
    promotionDiscountPercent?: number;
    imageUrl: string;
    isAvailable: boolean;
};

export type Cart = {
    uuid: string;
    items: CartItem[];
    coupon: {
        uuid: string;
        code: string;
        discountPercent: number;
        discountInCents: number;
    } | null;
    summary: {
        itemsCount: number;
        subtotalInCents: number;
        promotionDiscountInCents?: number;
        couponDiscountInCents: number;
        totalInCents: number;
    };
};

export type Address = {
    uuid: string;
    label?: string;
    recipient?: string;
    document?: string;
    zipCode: string;
    street: string;
    number: string;
    apartmentNumber?: string | null;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
    reference?: string | null;
    isDefault?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type User = {
    uuid: string;
    name: string;
    email: string;
    document: string;
    phone?: string | null;
    birthDate?: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: string;
    address?: Address | null;
    addresses?: Address[];
};

export type ShippingQuoteItemInput = {
    productUuid: string;
    productSize: string;
    quantity: number;
};

export type ShippingQuoteService = {
    serviceCode: number;
    serviceName: string;
    priceInCents: number;
    deliveryDays: number | null;
    deliveryRange: {
        min: number | null;
        max: number | null;
    };
};

export type ShippingQuotePayload = {
    quotedServices: ShippingQuoteService[];
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
    paymentMethod?: "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | string | null;
    subtotalInCents: number;
    shippingInCents: number;
    discountInCents: number;
    promotionDiscountInCents: number;
    couponDiscountInCents: number;
    couponCode: string | null;
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
    pagination?: Pagination;
};

export type ProfileAddressInput = {
    uuid?: string;
    zipCode?: string;
    street?: string;
    number?: string;
    apartmentNumber?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    country?: string;
};

export type UpdateCurrentUserInput = {
    name?: string;
    email?: string;
    document?: string;
    phone?: string;
    birthDate?: string;
    password?: string;
    address?: ProfileAddressInput;
};

export type ProductQuery = {
    page?: number;
    pageSize?: number;
    category?: string;
    search?: string;
    lineUuid?: string;
    size?: string;
    minPriceInCents?: number;
    maxPriceInCents?: number;
    inStock?: boolean;
};

export type TestimonialType = "TEXT" | "VIDEO";

export type Testimonial = {
    uuid: string;
    type: TestimonialType;
    title?: string | null;
    text: string | null;
    videoUrl: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type TestimonialsPayload = {
    testimonials: Testimonial[];
};

export type CreateTestimonialInput =
    | {
          type: "TEXT";
          title?: string;
          text: string;
          isActive: boolean;
      }
    | {
          type: "VIDEO";
          title?: string;
          video: File;
          isActive: boolean;
      };

export type UpdateTestimonialInput =
    | {
          uuid: string;
          type: "TEXT";
          title?: string;
          text: string;
          isActive: boolean;
      }
    | {
          uuid: string;
          type: "VIDEO";
          title?: string;
          video?: File;
          isActive: boolean;
      };

export type LegacyProductImageInput = {
    filename: string;
    contentType: "image/jpeg" | "image/png" | "image/webp";
    base64: string;
};

export type ProductImageInput = File | LegacyProductImageInput;

export type CreateProductInput = {
    name: string;
    category: ProductCategory;
    lineUuid: string;
    image: ProductImageInput;
    stock?: number;
    shippingWeightGrams?: number;
    description?: string;
    shortDescription: string;
    longDescription: string;
};

export type UpdateProductInput = Partial<
    Omit<CreateProductInput, "image"> & {
        image: ProductImageInput;
    }
>;
