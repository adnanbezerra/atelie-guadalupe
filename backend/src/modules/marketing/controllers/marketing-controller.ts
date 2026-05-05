import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import {
    couponUuidParamSchema,
    createCouponSchema,
    createPromotionSchema,
    promotionUuidParamSchema,
    updateCouponSchema,
    updatePromotionSchema
} from "../schemas/marketing-schema";
import { MarketingService } from "../services/marketing-service";

export class MarketingController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly marketingService: MarketingService
    ) {}

    public listCoupons = async (_request: FastifyRequest, reply: FastifyReply) => {
        return sendEither(reply, await this.marketingService.listCoupons());
    };

    public createCoupon = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(createCouponSchema, request.body);
        return sendEither(reply, await this.marketingService.createCoupon(input), 201);
    };

    public updateCoupon = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(couponUuidParamSchema, request.params);
        const input = this.fastify.validateSchema(updateCouponSchema, request.body);
        return sendEither(reply, await this.marketingService.updateCoupon(params.uuid, input));
    };

    public cancelCoupon = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(couponUuidParamSchema, request.params);
        return sendEither(reply, await this.marketingService.cancelCoupon(params.uuid));
    };

    public listPromotions = async (_request: FastifyRequest, reply: FastifyReply) => {
        return sendEither(reply, await this.marketingService.listPromotions());
    };

    public createPromotion = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(createPromotionSchema, request.body);
        return sendEither(reply, await this.marketingService.createPromotion(input), 201);
    };

    public updatePromotion = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(promotionUuidParamSchema, request.params);
        const input = this.fastify.validateSchema(updatePromotionSchema, request.body);
        return sendEither(reply, await this.marketingService.updatePromotion(params.uuid, input));
    };
}
