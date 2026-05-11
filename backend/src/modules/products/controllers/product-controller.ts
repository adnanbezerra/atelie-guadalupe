import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../../core/errors/app-error";
import { sendEither } from "../../../core/http/send-either";
import { UploadImageInput } from "../../../core/storage/image-storage";
import {
    createProductLineSchema,
    createProductSchema,
    listProductLinesQuerySchema,
    listProductsQuerySchema,
    productLineUuidParamSchema,
    productUuidParamSchema,
    updateProductLineSchema,
    updateProductSchema
} from "../schemas/product-schema";
import { ProductService } from "../services/product-service";

export class ProductController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly productService: ProductService
    ) {}

    public list = async (request: FastifyRequest, reply: FastifyReply) => {
        const query = this.fastify.validateSchema(listProductsQuerySchema, request.query);
        const result = await this.productService.list(query);
        return sendEither(reply, result);
    };

    public listLines = async (request: FastifyRequest, reply: FastifyReply) => {
        const query = this.fastify.validateSchema(listProductLinesQuerySchema, request.query);
        const result = await this.productService.listLines(query);
        return sendEither(reply, result);
    };

    public detail = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(productUuidParamSchema, request.params);
        const result = await this.productService.detail(params.uuid);
        return sendEither(reply, result);
    };

    public createLine = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(createProductLineSchema, request.body);
        const result = await this.productService.createLine(input);
        return sendEither(reply, result, 201);
    };

    public updateLine = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(productLineUuidParamSchema, request.params);
        const input = this.fastify.validateSchema(updateProductLineSchema, request.body);
        const result = await this.productService.updateLine(params.uuid, input);
        return sendEither(reply, result);
    };

    public create = async (request: FastifyRequest, reply: FastifyReply) => {
        const body = await this.parseProductMultipartRequest(request, true);
        const input = this.fastify.validateSchema(createProductSchema, body);
        const result = await this.productService.create(input);
        return sendEither(reply, result, 201);
    };

    public update = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(productUuidParamSchema, request.params);
        const body = await this.parseProductMultipartRequest(request, false);
        const input = this.fastify.validateSchema(updateProductSchema, body);
        const result = await this.productService.update(params.uuid, input);
        return sendEither(reply, result);
    };

    public delete = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(productUuidParamSchema, request.params);
        const result = await this.productService.delete(params.uuid);
        return sendEither(reply, result);
    };

    private async parseProductMultipartRequest(request: FastifyRequest, imageRequired: boolean) {
        if (!request.isMultipart()) {
            throw AppError.validation("Envie os dados como multipart/form-data");
        }

        const body: Record<string, unknown> = {};
        let image: UploadImageInput | undefined;

        for await (const part of request.parts()) {
            if (part.type === "file") {
                if (part.fieldname !== "image") {
                    throw AppError.validation("Campo de arquivo invalido");
                }

                if (image) {
                    throw AppError.validation("Envie apenas uma imagem");
                }

                image = {
                    filename: part.filename,
                    contentType: part.mimetype,
                    buffer: await part.toBuffer()
                };
                continue;
            }

            body[part.fieldname] = part.value;
        }

        this.coerceOptionalInteger(body, "stock");
        this.coerceOptionalInteger(body, "shippingWeightGrams");

        if (image) {
            body.image = image;
        } else if (imageRequired) {
            throw AppError.validation("Imagem do produto obrigatoria");
        }

        return body;
    }

    private coerceOptionalInteger(body: Record<string, unknown>, field: string): void {
        if (typeof body[field] !== "string") {
            return;
        }

        const value = body[field].trim();
        body[field] = value.length > 0 ? Number(value) : undefined;
    }
}
