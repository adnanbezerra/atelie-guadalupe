import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { sendEither } from "../../../core/http/send-either";
import {
    addressUuidParamSchema,
    createAddressSchema,
    updateAddressSchema
} from "../schemas/address-schema";
import { AddressService } from "../services/address-service";

export class AddressController {
    public constructor(
        private readonly fastify: FastifyInstance,
        private readonly addressService: AddressService
    ) {}

    public listMyAddresses = async (request: FastifyRequest, reply: FastifyReply) => {
        const result = await this.addressService.listMyAddresses(request.currentUser!.sub);
        return sendEither(reply, result);
    };

    public createMyAddress = async (request: FastifyRequest, reply: FastifyReply) => {
        const input = this.fastify.validateSchema(createAddressSchema, request.body);
        const result = await this.addressService.createMyAddress(request.currentUser!.sub, input);
        return sendEither(reply, result, 201);
    };

    public updateMyAddress = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(addressUuidParamSchema, request.params);
        const input = this.fastify.validateSchema(updateAddressSchema, request.body);
        const result = await this.addressService.updateMyAddress(
            request.currentUser!.sub,
            params.uuid,
            input
        );
        return sendEither(reply, result);
    };

    public deleteMyAddress = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = this.fastify.validateSchema(addressUuidParamSchema, request.params);
        const result = await this.addressService.deleteMyAddress(
            request.currentUser!.sub,
            params.uuid
        );
        return sendEither(reply, result);
    };
}
