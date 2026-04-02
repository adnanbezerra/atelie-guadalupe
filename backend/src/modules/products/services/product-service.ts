import { ProductSize } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { ImageStorage, UploadImageInput } from "../../../core/storage/image-storage";
import { slugify } from "../../../core/utils/slug";
import { createUuid } from "../../../core/utils/uuid";
import { ProductRepository } from "../repositories/product-repository";
import { presentProductLine } from "./product-line-presenter";
import { presentProduct } from "./product-presenter";
import { ProductCategory } from "./product-stock";

type CreateProductLineInput = {
    name: string;
    pricePerGramInCents: number;
};

type UpdateProductLineInput = Partial<CreateProductLineInput>;

type CreateProductInput = {
    name: string;
    category: ProductCategory;
    lineUuid: string;
    image: UploadImageInput;
    stock?: number;
    description?: string;
    shortDescription: string;
    longDescription: string;
};

type UpdateProductInput = Partial<CreateProductInput>;

type ListProductsInput = {
    page: number;
    pageSize: number;
    search?: string;
    lineUuid?: string;
    size?: ProductSize;
    minPriceInCents?: number;
    maxPriceInCents?: number;
    inStock?: boolean;
};

export class ProductService {
    public constructor(
        private readonly productRepository: ProductRepository,
        private readonly imageStorage: ImageStorage
    ) {}

    public async listLines(): Promise<
        Either<AppError, { lines: Array<ReturnType<typeof presentProductLine>> }>
    > {
        const lines = await this.productRepository.listLines();

        return right({
            lines: lines.map((line) => presentProductLine(line))
        });
    }

    public async createLine(
        input: CreateProductLineInput
    ): Promise<Either<AppError, { line: ReturnType<typeof presentProductLine> }>> {
        const slug = slugify(input.name);
        const existingLine = await this.productRepository.findLineBySlug(slug);
        if (existingLine) {
            return left(AppError.conflict("Ja existe uma linha com este nome"));
        }

        const line = await this.productRepository.createLine({
            uuid: createUuid(),
            name: input.name.trim(),
            slug,
            pricePerGramInCents: input.pricePerGramInCents
        });

        return right({
            line: presentProductLine(line)
        });
    }

    public async updateLine(
        lineUuid: string,
        input: UpdateProductLineInput
    ): Promise<Either<AppError, { line: ReturnType<typeof presentProductLine> }>> {
        const existingLine = await this.productRepository.findLineByUuid(lineUuid);
        if (!existingLine) {
            return left(AppError.notFound("Linha nao encontrada"));
        }

        const data = {
            ...input,
            ...(input.name ? { name: input.name.trim(), slug: slugify(input.name) } : {})
        };

        if (data.slug && data.slug !== existingLine.slug) {
            const slugConflict = await this.productRepository.findLineBySlug(data.slug);
            if (slugConflict && slugConflict.uuid !== existingLine.uuid) {
                return left(AppError.conflict("Ja existe uma linha com este nome"));
            }
        }

        const line = await this.productRepository.updateLineByUuid(lineUuid, data);

        return right({
            line: presentProductLine(line)
        });
    }

    public async list(
        query: ListProductsInput
    ): Promise<Either<AppError, Record<string, unknown>>> {
        const result = await this.productRepository.listActive(query);

        return right({
            items: result.items.map((item: Parameters<typeof presentProduct>[0]) =>
                presentProduct(item)
            ),
            pagination: {
                page: query.page,
                pageSize: query.pageSize,
                total: result.total,
                totalPages: Math.ceil(result.total / query.pageSize) || 1
            }
        });
    }

    public async detail(
        productUuid: string
    ): Promise<Either<AppError, { product: ReturnType<typeof presentProduct> }>> {
        const product = await this.productRepository.findByUuid(productUuid);
        if (!product || !product.isActive) {
            return left(AppError.notFound("Produto nao encontrado"));
        }

        return right({
            product: presentProduct(product)
        });
    }

    public async create(
        input: CreateProductInput
    ): Promise<Either<AppError, { product: ReturnType<typeof presentProduct> }>> {
        const slug = slugify(input.name);
        const [existingProduct, line] = await Promise.all([
            this.productRepository.findBySlug(slug),
            this.productRepository.findLineByUuid(input.lineUuid)
        ]);

        if (existingProduct) {
            return left(AppError.conflict("Ja existe um produto com este nome"));
        }

        if (!line) {
            return left(AppError.notFound("Linha nao encontrada"));
        }

        const imageUrl = await this.imageStorage.uploadProductImage(input.image);

        const product = await this.productRepository.create({
            uuid: createUuid(),
            lineId: line.id,
            category: input.category,
            slug,
            name: input.name.trim(),
            imageUrl,
            stock: input.category === "ARTISANAL" ? (input.stock ?? 0) : null,
            description: input.description?.trim(),
            shortDescription: input.shortDescription.trim(),
            longDescription: input.longDescription.trim()
        });

        return right({
            product: presentProduct(product)
        });
    }

    public async update(
        productUuid: string,
        input: UpdateProductInput
    ): Promise<Either<AppError, { product: ReturnType<typeof presentProduct> }>> {
        const existingProduct = await this.productRepository.findByUuid(productUuid);
        if (!existingProduct) {
            return left(AppError.notFound("Produto nao encontrado"));
        }

        const { image, lineUuid, ...restInput } = input;
        const nextCategory = input.category ?? existingProduct.category;
        const data: {
            name?: string;
            slug?: string;
            category?: ProductCategory;
            lineId?: number;
            stock?: number | null;
            description?: string | null;
            shortDescription?: string;
            longDescription?: string;
        } = {
            ...restInput,
            ...(input.name ? { name: input.name.trim(), slug: slugify(input.name) } : {}),
            ...(typeof input.description === "string"
                ? { description: input.description.trim() }
                : {}),
            ...(input.shortDescription ? { shortDescription: input.shortDescription.trim() } : {}),
            ...(input.longDescription ? { longDescription: input.longDescription.trim() } : {})
        };

        if (
            nextCategory === "ARTISANAL" &&
            existingProduct.category === "SELFCARE" &&
            typeof input.stock !== "number" &&
            typeof existingProduct.stock !== "number"
        ) {
            return left(AppError.business("Informe o estoque ao mudar um produto para ARTISANAL"));
        }

        if (nextCategory === "SELFCARE" && typeof input.stock === "number") {
            return left(AppError.business("Produtos SELFCARE nao devem receber estoque"));
        }

        if (nextCategory === "SELFCARE") {
            data.stock = null;
        }

        if (data.slug && data.slug !== existingProduct.slug) {
            const slugConflict = await this.productRepository.findBySlug(data.slug);
            if (slugConflict && slugConflict.uuid !== existingProduct.uuid) {
                return left(AppError.conflict("Ja existe um produto com este nome"));
            }
        }

        if (lineUuid) {
            const line = await this.productRepository.findLineByUuid(lineUuid);
            if (!line) {
                return left(AppError.notFound("Linha nao encontrada"));
            }

            data.lineId = line.id;
        }

        if (nextCategory === "ARTISANAL" && typeof input.stock === "number") {
            data.stock = input.stock;
        }

        let imageUrl: string | undefined;
        if (image) {
            imageUrl = await this.imageStorage.uploadProductImage(image);
            await this.imageStorage.deleteProductImageByUrl(existingProduct.imageUrl);
        }

        const product = await this.productRepository.updateByUuid(productUuid, {
            ...data,
            ...(imageUrl ? { imageUrl } : {})
        });

        return right({
            product: presentProduct(product)
        });
    }

    public async delete(productUuid: string): Promise<Either<AppError, { deleted: true }>> {
        const existingProduct = await this.productRepository.findByUuid(productUuid);
        if (!existingProduct) {
            return left(AppError.notFound("Produto nao encontrado"));
        }

        await this.imageStorage.deleteProductImageByUrl(existingProduct.imageUrl);
        await this.productRepository.updateByUuid(productUuid, {
            isActive: false
        });

        return right({
            deleted: true as const
        });
    }
}
