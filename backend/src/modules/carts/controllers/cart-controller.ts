import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import { addCartItemSchema, cartItemUuidParamSchema, updateCartItemSchema } from "../schemas/cart-schema";
import { CartService } from "../services/cart-service";

export class CartController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly cartService: CartService
    ) {}

    public getMyCart = async (request: FastifyRequest, reply: FastifyReply) => {
        const result = await this.cartService.getMyCart(request.currentUser!.sub);
        return sendEither(reply, result);
    };

    public addItem = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(addCartItemSchema, request.body);
        const result = await this.cartService.addItem(request.currentUser!.sub, input);
        return sendEither(reply, result, 201);
    };

    public updateItem = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(cartItemUuidParamSchema, request.params);
        const input = this.fastify.validateSchema(updateCartItemSchema, request.body);
        const result = await this.cartService.updateItem(request.currentUser!.sub, params.uuid, input);
        return sendEither(reply, result);
    };

    public removeItem = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(cartItemUuidParamSchema, request.params);
        const result = await this.cartService.removeItem(request.currentUser!.sub, params.uuid);
        return sendEither(reply, result);
    };

    public clear = async (request: FastifyRequest, reply: FastifyReply) => {
        const result = await this.cartService.clear(request.currentUser!.sub);
        return sendEither(reply, result);
    };
}
