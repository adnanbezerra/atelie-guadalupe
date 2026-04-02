import { Prisma, PrismaClient, Product, ProductLine } from "../../../generated/prisma/client";
import { ProductSize } from "../../../generated/prisma/enums";
import { calculateProductPriceInCents } from "../services/product-pricing";
import { ProductCategory } from "../services/product-stock";

type CreateProductLineInput = {
    uuid: string;
    name: string;
    slug: string;
    pricePerGramInCents: number;
};

type UpdateProductLineInput = Partial<CreateProductLineInput>;

type CreateProductInput = {
    uuid: string;
    lineId: number;
    category: ProductCategory;
    slug: string;
    name: string;
    imageUrl: string;
    stock: number | null;
    shortDescription: string;
    longDescription: string;
};

type UpdateProductInput = Prisma.ProductUncheckedUpdateInput & {
    isActive?: boolean;
};

type ProductListQuery = {
    page: number;
    pageSize: number;
    search?: string;
    lineUuid?: string;
    size?: ProductSize;
    minPriceInCents?: number;
    maxPriceInCents?: number;
    inStock?: boolean;
};

const productWithLineInclude = {
    line: true
} as const;

type ProductWithLine = Product & {
    line: ProductLine;
};

export class ProductRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public async listLines() {
        return this.prisma.productLine.findMany({
            orderBy: {
                name: "asc"
            }
        });
    }

    public findLineByUuid(uuid: string) {
        return this.prisma.productLine.findUnique({
            where: {
                uuid
            }
        });
    }

    public findLineBySlug(slug: string) {
        return this.prisma.productLine.findUnique({
            where: {
                slug
            }
        });
    }

    public createLine(input: CreateProductLineInput) {
        return this.prisma.productLine.create({
            data: input
        });
    }

    public updateLineByUuid(uuid: string, input: UpdateProductLineInput) {
        return this.prisma.productLine.update({
            where: {
                uuid
            },
            data: input
        });
    }

    public async listActive(query: ProductListQuery) {
        const where = {
            isActive: true,
            ...(query.search
                ? { name: { contains: query.search, mode: "insensitive" as const } }
                : {}),
            ...(query.lineUuid
                ? {
                      line: {
                          is: {
                              uuid: query.lineUuid
                          }
                      }
                  }
                : {}),
            ...(query.inStock
                ? {
                      OR: [
                          {
                              category: "SELFCARE" as const
                          },
                          {
                              category: "ARTISANAL" as const,
                              stock: {
                                  gt: 0
                              }
                          }
                      ]
                  }
                : {})
        };

        const items = (await this.prisma.product.findMany({
            where,
            include: productWithLineInclude,
            orderBy: {
                createdAt: "desc"
            }
        })) as ProductWithLine[];

        const filteredItems = items.filter((item) => {
            if (!query.size) {
                return true;
            }

            const priceInCents = calculateProductPriceInCents(
                item.line.pricePerGramInCents,
                query.size
            );

            if (typeof query.minPriceInCents === "number" && priceInCents < query.minPriceInCents) {
                return false;
            }

            if (typeof query.maxPriceInCents === "number" && priceInCents > query.maxPriceInCents) {
                return false;
            }

            return true;
        });

        const start = (query.page - 1) * query.pageSize;
        const end = start + query.pageSize;

        return {
            items: filteredItems.slice(start, end),
            total: filteredItems.length
        };
    }

    public findByUuid(uuid: string) {
        return this.prisma.product.findUnique({
            where: {
                uuid
            },
            include: productWithLineInclude
        }) as Promise<ProductWithLine | null>;
    }

    public findBySlug(slug: string) {
        return this.prisma.product.findUnique({
            where: {
                slug
            },
            include: productWithLineInclude
        }) as Promise<ProductWithLine | null>;
    }

    public create(input: CreateProductInput) {
        return this.prisma.product.create({
            data: input,
            include: productWithLineInclude
        }) as Promise<ProductWithLine>;
    }

    public updateByUuid(uuid: string, input: UpdateProductInput) {
        return this.prisma.product.update({
            where: {
                uuid
            },
            data: input,
            include: productWithLineInclude
        }) as Promise<ProductWithLine>;
    }
}
