import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { normalizeDocument } from "../../../core/utils/document";
import { createUuid } from "../../../core/utils/uuid";
import { UserRepository } from "../../users/repositories/user-repository";
import { presentAddress } from "../../users/services/user-presenter";
import { AddressRepository } from "../repositories/address-repository";

type AddressInput = {
    label?: string;
    recipient: string;
    document?: string;
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
    reference?: string;
    isDefault?: boolean;
};

type AddressUpdateInput = Partial<AddressInput>;

export class AddressService {
    public constructor(
        private readonly userRepository: UserRepository,
        private readonly addressRepository: AddressRepository
    ) {}

    public async listMyAddresses(
        userUuid: string
    ): Promise<Either<AppError, { addresses: Array<ReturnType<typeof presentAddress>> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const addresses = await this.addressRepository.listByUserId(user.id);
        return right({
            addresses: addresses.map((address: Parameters<typeof presentAddress>[0]) =>
                presentAddress(address)
            )
        });
    }

    public async createMyAddress(
        userUuid: string,
        input: AddressInput
    ): Promise<Either<AppError, { address: ReturnType<typeof presentAddress> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        if (input.isDefault) {
            await this.addressRepository.unsetDefaultAddresses(user.id);
        }

        const address = await this.addressRepository.create({
            uuid: createUuid(),
            userId: user.id,
            label: input.label,
            recipient: input.recipient.trim(),
            document: input.document ? normalizeDocument(input.document) : undefined,
            zipCode: input.zipCode.trim(),
            street: input.street.trim(),
            number: input.number.trim(),
            complement: input.complement?.trim(),
            neighborhood: input.neighborhood.trim(),
            city: input.city.trim(),
            state: input.state.trim(),
            country: input.country.trim(),
            reference: input.reference?.trim(),
            isDefault: input.isDefault ?? false
        });

        return right({
            address: presentAddress(address)
        });
    }

    public async updateMyAddress(
        userUuid: string,
        addressUuid: string,
        input: AddressUpdateInput
    ): Promise<Either<AppError, { address: ReturnType<typeof presentAddress> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const address = await this.addressRepository.findByUuid(addressUuid);
        if (!address || address.userId !== user.id) {
            return left(AppError.notFound("Endereco nao encontrado"));
        }

        if (input.isDefault) {
            await this.addressRepository.unsetDefaultAddresses(user.id);
        }

        const updatedAddress = await this.addressRepository.updateByUuid(addressUuid, {
            ...input,
            document: input.document ? normalizeDocument(input.document) : undefined
        });

        return right({
            address: presentAddress(updatedAddress)
        });
    }

    public async deleteMyAddress(
        userUuid: string,
        addressUuid: string
    ): Promise<Either<AppError, { deleted: true }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const address = await this.addressRepository.findByUuid(addressUuid);
        if (!address || address.userId !== user.id) {
            return left(AppError.notFound("Endereco nao encontrado"));
        }

        await this.addressRepository.deleteByUuid(addressUuid);

        return right({
            deleted: true as const
        });
    }
}
