import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { hashPassword, verifyPassword } from "../../../core/security/password";
import { normalizeDocument } from "../../../core/utils/document";
import { normalizeEmail } from "../../../core/utils/email";
import { createUuid } from "../../../core/utils/uuid";
import { RoleName } from "../../../generated/prisma/enums";
import { AddressRepository } from "../../addresses/repositories/address-repository";
import { RoleRepository } from "../../roles/repositories/role-repository";
import { UserRepository } from "../repositories/user-repository";
import { presentAddress, presentUser } from "./user-presenter";

type AddressInput = {
    uuid?: string;
    label?: string;
    document?: string;
    zipCode?: string;
    street?: string;
    number?: string;
    apartmentNumber?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    country?: string;
    reference?: string;
};

type UpdateMeInput = {
    name?: string;
    email?: string;
    document?: string;
    phone?: string;
    birthDate?: string;
    address?: AddressInput;
};

type ChangeMyPasswordInput = {
    email: string;
    currentPassword: string;
    newPassword: string;
};

type CreateManagedUserInput = {
    name: string;
    email: string;
    document: string;
    password: string;
    role: RoleName;
};

type UpdateManagedUserInput = {
    name?: string;
    isActive?: boolean;
    role?: RoleName;
};

type AddressToUpsert = {
    uuid: string;
    userId: number | null;
};

const requiredAddressFields = [
    "zipCode",
    "street",
    "number",
    "neighborhood",
    "city",
    "state",
    "country"
] as const;

export class UserService {
    public constructor(
        private readonly userRepository: UserRepository,
        private readonly roleRepository: RoleRepository,
        private readonly addressRepository?: AddressRepository
    ) {}

    public async getMe(
        userUuid: string
    ): Promise<Either<AppError, { user: Record<string, unknown> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        return right({
            user: {
                ...presentUser(user),
                address: user.address ? presentAddress(user.address) : null,
                addresses: user.address ? [presentAddress(user.address)] : []
            }
        });
    }

    public async updateMe(
        userUuid: string,
        input: UpdateMeInput
    ): Promise<Either<AppError, { user: Record<string, unknown> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        let addressToUpsert: AddressToUpsert | null = null;
        if (input.address) {
            if (!this.addressRepository) {
                return left(AppError.business("Repositorio de enderecos nao configurado"));
            }

            addressToUpsert = input.address.uuid
                ? await this.addressRepository.findByUuid(input.address.uuid)
                : await this.addressRepository.findByUserId(user.id);

            if (input.address.uuid && (!addressToUpsert || addressToUpsert.userId !== user.id)) {
                return left(AppError.notFound("Endereco nao encontrado"));
            }
        }

        const data: {
            name?: string;
            email?: string;
            document?: string;
            phone?: string;
            birthDate?: Date;
        } = {};

        if (input.name) {
            data.name = input.name.trim();
        }

        if (input.email) {
            const email = normalizeEmail(input.email);
            const existingEmail = await this.userRepository.findByEmail(email);
            if (existingEmail && existingEmail.uuid !== userUuid) {
                return left(AppError.conflict("Email ja cadastrado"));
            }
            data.email = email;
        }

        if (input.document) {
            const document = normalizeDocument(input.document);
            const existingDocument = await this.userRepository.findByDocument(document);
            if (existingDocument && existingDocument.uuid !== userUuid) {
                return left(AppError.conflict("Documento ja cadastrado"));
            }
            data.document = document;
        }

        if (input.phone) {
            data.phone = input.phone.trim();
        }

        if (input.birthDate) {
            data.birthDate = new Date(`${input.birthDate}T00:00:00.000Z`);
        }

        if (Object.keys(data).length > 0) {
            await this.userRepository.updateByUuid(userUuid, data);
        }

        if (input.address) {
            const addressRepository = this.addressRepository!;
            const addressInput = input.address;

            if (!addressToUpsert) {
                const missingFields = requiredAddressFields.filter((field) => !addressInput[field]);
                if (missingFields.length > 0) {
                    return left(
                        AppError.validation(
                            "Endereco incompleto",
                            missingFields.map((field) => ({
                                path: `address.${field}`,
                                message: "Campo obrigatorio para criar endereco"
                            }))
                        )
                    );
                }
            }

            const addressData = {
                label: addressInput.label?.trim(),
                document: addressInput.document
                    ? normalizeDocument(addressInput.document)
                    : undefined,
                zipCode: addressInput.zipCode?.trim(),
                street: addressInput.street?.trim(),
                number: addressInput.number?.trim(),
                apartmentNumber: addressInput.apartmentNumber?.trim(),
                complement: addressInput.complement?.trim(),
                neighborhood: addressInput.neighborhood?.trim(),
                city: addressInput.city?.trim(),
                state: addressInput.state?.trim(),
                country: addressInput.country?.trim(),
                reference: addressInput.reference?.trim()
            };

            if (addressToUpsert) {
                await addressRepository.updateByUuid(addressToUpsert.uuid, addressData);
            } else {
                await addressRepository.create({
                    uuid: createUuid(),
                    userId: user.id,
                    label: addressData.label,
                    document: addressData.document,
                    zipCode: addressData.zipCode!,
                    street: addressData.street!,
                    number: addressData.number!,
                    apartmentNumber: addressData.apartmentNumber,
                    complement: addressData.complement,
                    neighborhood: addressData.neighborhood!,
                    city: addressData.city!,
                    state: addressData.state!,
                    country: addressData.country!,
                    reference: addressData.reference
                });
            }
        }

        const userWithAddresses = await this.userRepository.findByUuid(userUuid);
        if (!userWithAddresses) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        return right({
            user: {
                ...presentUser(userWithAddresses),
                address: userWithAddresses.address
                    ? presentAddress(userWithAddresses.address)
                    : null,
                addresses: userWithAddresses.address
                    ? [presentAddress(userWithAddresses.address)]
                    : []
            }
        });
    }

    public async changePassword(
        input: ChangeMyPasswordInput
    ): Promise<Either<AppError, { user: Record<string, unknown> }>> {
        const user = await this.userRepository.findByEmail(normalizeEmail(input.email));
        if (!user) {
            return left(AppError.unauthorized("Email ou senha invalidos"));
        }

        const passwordMatches = await verifyPassword(user.passwordHash, input.currentPassword);
        if (!passwordMatches) {
            return left(AppError.unauthorized("Email ou senha invalidos"));
        }

        const updatedUser = await this.userRepository.updateByUuid(user.uuid, {
            passwordHash: await hashPassword(input.newPassword)
        });

        return right({
            user: {
                ...presentUser(updatedUser),
                address: updatedUser.address ? presentAddress(updatedUser.address) : null,
                addresses: updatedUser.address ? [presentAddress(updatedUser.address)] : []
            }
        });
    }

    public async createManagedUser(
        input: CreateManagedUserInput
    ): Promise<Either<AppError, { user: ReturnType<typeof presentUser> }>> {
        const email = normalizeEmail(input.email);
        const document = normalizeDocument(input.document);

        const existingEmail = await this.userRepository.findByEmail(email);
        if (existingEmail) {
            return left(AppError.conflict("Email ja cadastrado"));
        }

        const existingDocument = await this.userRepository.findByDocument(document);
        if (existingDocument) {
            return left(AppError.conflict("Documento ja cadastrado"));
        }

        const role = await this.roleRepository.findByName(input.role);
        if (!role) {
            return left(AppError.notFound("Role nao encontrada"));
        }

        const passwordHash = await hashPassword(input.password);
        const createdUser = await this.userRepository.create({
            uuid: createUuid(),
            name: input.name.trim(),
            email,
            document,
            passwordHash,
            roleId: role.id
        });

        return right({
            user: presentUser(createdUser)
        });
    }

    public async updateManagedUser(
        userUuid: string,
        input: UpdateManagedUserInput
    ): Promise<Either<AppError, { user: ReturnType<typeof presentUser> }>> {
        const user = await this.userRepository.findByUuid(userUuid);
        if (!user) {
            return left(AppError.notFound("Usuario nao encontrado"));
        }

        const data: {
            name?: string;
            isActive?: boolean;
            roleId?: number;
        } = {};

        if (input.name) {
            data.name = input.name.trim();
        }

        if (typeof input.isActive === "boolean") {
            data.isActive = input.isActive;
        }

        if (input.role) {
            const role = await this.roleRepository.findByName(input.role);
            if (!role) {
                return left(AppError.notFound("Role nao encontrada"));
            }
            data.roleId = role.id;
        }

        const updatedUser = await this.userRepository.updateByUuid(userUuid, data);

        return right({
            user: presentUser(updatedUser)
        });
    }
}
