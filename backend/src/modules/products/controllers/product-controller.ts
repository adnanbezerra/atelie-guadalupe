import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import {
    createProductLineSchema,
    createProductSchema,
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

    public listLines = async (_request: FastifyRequest, reply: FastifyReply) => {
        const result = await this.productService.listLines();
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
        const input = this.fastify.validateSchema(createProductSchema, request.body);
        const result = await this.productService.create(input);
        return sendEither(reply, result, 201);
    };

    public update = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(productUuidParamSchema, request.params);
        const input = this.fastify.validateSchema(updateProductSchema, request.body);
        const result = await this.productService.update(params.uuid, input);
        return sendEither(reply, result);
    };

    public delete = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(productUuidParamSchema, request.params);
        const result = await this.productService.delete(params.uuid);
        return sendEither(reply, result);
    };
}
