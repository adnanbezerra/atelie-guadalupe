import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { slugify } from "../../../core/utils/slug";
import { createUuid } from "../../../core/utils/uuid";
import { ProductRepository } from "../repositories/product-repository";
import { presentProduct } from "./product-presenter";

type CreateProductInput = {
    name: string;
    priceInCents: number;
    imageUrl: string;
    stock: number;
    shortDescription: string;
    longDescription: string;
};

type UpdateProductInput = Partial<CreateProductInput>;

type ListProductsInput = {
    page: number;
    pageSize: number;
    search?: string;
    minPriceInCents?: number;
    maxPriceInCents?: number;
    inStock?: boolean;
};

export class ProductService {
    public constructor(private readonly productRepository: ProductRepository) {}

    public async list(query: ListProductsInput): Promise<Either<AppError, Record<string, unknown>>> {
        const result = await this.productRepository.listActive(query);

        return right({
            items: result.items.map((item: Parameters<typeof presentProduct>[0]) => presentProduct(item)),
            pagination: {
                page: query.page,
                pageSize: query.pageSize,
                total: result.total,
                totalPages: Math.ceil(result.total / query.pageSize) || 1
            }
        });
    }

    public async detail(productUuid: string): Promise<Either<AppError, { product: ReturnType<typeof presentProduct> }>> {
        const product = await this.productRepository.findByUuid(productUuid);
        if (!product || !product.isActive) {
            return left(AppError.notFound("Produto nao encontrado"));
        }

        return right({
            product: presentProduct(product)
        });
    }

    public async create(input: CreateProductInput): Promise<Either<AppError, { product: ReturnType<typeof presentProduct> }>> {
        const slug = slugify(input.name);
        const existingProduct = await this.productRepository.findBySlug(slug);
        if (existingProduct) {
            return left(AppError.conflict("Ja existe um produto com este nome"));
        }

        const product = await this.productRepository.create({
            uuid: createUuid(),
            slug,
            name: input.name.trim(),
            priceInCents: input.priceInCents,
            imageUrl: input.imageUrl,
            stock: input.stock,
            shortDescription: input.shortDescription.trim(),
            longDescription: input.longDescription.trim()
        });

        return right({
            product: presentProduct(product)
        });
    }

    public async update(productUuid: string, input: UpdateProductInput): Promise<Either<AppError, { product: ReturnType<typeof presentProduct> }>> {
        const existingProduct = await this.productRepository.findByUuid(productUuid);
        if (!existingProduct) {
            return left(AppError.notFound("Produto nao encontrado"));
        }

        const data = {
            ...input,
            ...(input.name ? { slug: slugify(input.name) } : {})
        };

        if (data.slug && data.slug !== existingProduct.slug) {
            const slugConflict = await this.productRepository.findBySlug(data.slug);
            if (slugConflict && slugConflict.uuid !== existingProduct.uuid) {
                return left(AppError.conflict("Ja existe um produto com este nome"));
            }
        }

        const product = await this.productRepository.updateByUuid(productUuid, data);

        return right({
            product: presentProduct(product)
        });
    }

    public async delete(productUuid: string): Promise<Either<AppError, { deleted: true }>> {
        const existingProduct = await this.productRepository.findByUuid(productUuid);
        if (!existingProduct) {
            return left(AppError.notFound("Produto nao encontrado"));
        }

        await this.productRepository.updateByUuid(productUuid, {
            isActive: false
        });

        return right({
            deleted: true as const
        });
    }
}
