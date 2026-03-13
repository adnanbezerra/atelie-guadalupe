import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { hashPassword } from "../../../core/security/password";
import { normalizeDocument } from "../../../core/utils/document";
import { normalizeEmail } from "../../../core/utils/email";
import { createUuid } from "../../../core/utils/uuid";
import { RoleName } from "../../../generated/prisma/enums";
import { RoleRepository } from "../../roles/repositories/role-repository";
import { UserRepository } from "../repositories/user-repository";
import { presentAddress, presentUser } from "./user-presenter";

type UpdateMeInput = {
    name?: string;
    password?: string;
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

export class UserService {
    public constructor(
        private readonly userRepository: UserRepository,
        private readonly roleRepository: RoleRepository
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
                addresses: user.addresses.map((address: Parameters<typeof presentAddress>[0]) =>
                    presentAddress(address)
                )
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

        const data: {
            name?: string;
            passwordHash?: string;
        } = {};

        if (input.name) {
            data.name = input.name.trim();
        }

        if (input.password) {
            data.passwordHash = await hashPassword(input.password);
        }

        const updatedUser = await this.userRepository.updateByUuid(userUuid, data);

        return right({
            user: {
                ...presentUser(updatedUser),
                addresses: updatedUser.addresses.map(
                    (address: Parameters<typeof presentAddress>[0]) => presentAddress(address)
                )
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
