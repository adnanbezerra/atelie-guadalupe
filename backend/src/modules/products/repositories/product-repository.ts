import { PrismaClient } from "../../../generated/prisma/client";

type CreateProductInput = {
    uuid: string;
    slug: string;
    name: string;
    priceInCents: number;
    imageUrl: string;
    stock: number;
    shortDescription: string;
    longDescription: string;
};

type UpdateProductInput = Partial<CreateProductInput> & {
    isActive?: boolean;
};

type ProductListQuery = {
    page: number;
    pageSize: number;
    search?: string;
    minPriceInCents?: number;
    maxPriceInCents?: number;
    inStock?: boolean;
};

export class ProductRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public async listActive(query: ProductListQuery) {
        const where = {
            isActive: true,
            ...(query.search
                ? { name: { contains: query.search, mode: "insensitive" as const } }
                : {}),
            ...(typeof query.minPriceInCents === "number"
                ? { priceInCents: { gte: query.minPriceInCents } }
                : {}),
            ...(typeof query.maxPriceInCents === "number"
                ? {
                      priceInCents: {
                          ...(typeof query.minPriceInCents === "number"
                              ? { gte: query.minPriceInCents }
                              : {}),
                          lte: query.maxPriceInCents
                      }
                  }
                : {}),
            ...(query.inStock ? { stock: { gt: 0 } } : {})
        };

        const [items, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
                orderBy: {
                    createdAt: "desc"
                }
            }),
            this.prisma.product.count({
                where
            })
        ]);

        return {
            items,
            total
        };
    }

    public findByUuid(uuid: string) {
        return this.prisma.product.findUnique({
            where: {
                uuid
            }
        });
    }

    public findBySlug(slug: string) {
        return this.prisma.product.findUnique({
            where: {
                slug
            }
        });
    }

    public create(input: CreateProductInput) {
        return this.prisma.product.create({
            data: input
        });
    }

    public updateByUuid(uuid: string, input: UpdateProductInput) {
        return this.prisma.product.update({
            where: {
                uuid
            },
            data: input
        });
    }
}
