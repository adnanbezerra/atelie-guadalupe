import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { hashPassword, verifyPassword } from "../../../core/security/password";
import { normalizeDocument } from "../../../core/utils/document";
import { normalizeEmail } from "../../../core/utils/email";
import { createUuid } from "../../../core/utils/uuid";
import { RoleName } from "../../../generated/prisma/enums";
import { RoleRepository } from "../../roles/repositories/role-repository";
import { UserRepository } from "../../users/repositories/user-repository";
import { presentUser } from "../../users/services/user-presenter";

type RegisterInput = {
    name: string;
    email: string;
    document: string;
    password: string;
};

type LoginInput = {
    email: string;
    password: string;
};

export class RegisterUserService {
    public constructor(
        private readonly roleRepository: RoleRepository,
        private readonly userRepository: UserRepository
    ) {}

    public async execute(
        input: RegisterInput
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

        const userRole = await this.roleRepository.findByName(RoleName.USER);
        if (!userRole) {
            return left(AppError.notFound("Role USER nao encontrada"));
        }

        const passwordHash = await hashPassword(input.password);

        const user = await this.userRepository.create({
            uuid: createUuid(),
            name: input.name.trim(),
            email,
            document,
            passwordHash,
            roleId: userRole.id
        });

        return right({
            user: presentUser(user)
        });
    }
}

export class LoginService {
    public constructor(private readonly userRepository: UserRepository) {}

    public async execute(
        input: LoginInput
    ): Promise<Either<AppError, { user: ReturnType<typeof presentUser> }>> {
        const email = normalizeEmail(input.email);
        const user = await this.userRepository.findByEmail(email);

        if (!user) {
            return left(AppError.unauthorized("Credenciais invalidas"));
        }

        if (!user.isActive) {
            return left(AppError.forbidden("Usuario inativo"));
        }

        const passwordMatches = await verifyPassword(user.passwordHash, input.password);
        if (!passwordMatches) {
            return left(AppError.unauthorized("Credenciais invalidas"));
        }

        return right({
            user: presentUser(user)
        });
    }
}
