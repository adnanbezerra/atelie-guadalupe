import { PrismaClient } from "../../../generated/prisma/client";
import { RoleName } from "../../../generated/prisma/enums";

type CreateUserInput = {
    uuid: string;
    name: string;
    email: string;
    document?: string | null;
    passwordHash: string;
    roleId: number;
};

type UpdateUserInput = {
    name?: string;
    email?: string;
    document?: string | null;
    phone?: string;
    birthDate?: Date;
    passwordHash?: string;
    isActive?: boolean;
    roleId?: number;
};

export class UserRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public findAll() {
        return this.prisma.user.findMany({
            include: {
                role: true,
                address: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    public findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: {
                email
            },
            include: {
                role: true
            }
        });
    }

    public findByDocument(document: string) {
        return this.prisma.user.findUnique({
            where: {
                document
            },
            include: {
                role: true
            }
        });
    }

    public findByUuid(uuid: string) {
        return this.prisma.user.findUnique({
            where: {
                uuid
            },
            include: {
                role: true,
                address: true
            }
        });
    }

    public create(input: CreateUserInput) {
        return this.prisma.user.create({
            data: input,
            include: {
                role: true
            }
        });
    }

    public updateByUuid(uuid: string, input: UpdateUserInput) {
        return this.prisma.user.update({
            where: {
                uuid
            },
            data: input,
            include: {
                role: true,
                address: true
            }
        });
    }

    public listAdminsAndSubadmins() {
        return this.prisma.user.findMany({
            where: {
                role: {
                    name: {
                        in: [RoleName.ADMIN, RoleName.SUBADMIN]
                    }
                }
            },
            include: {
                role: true
            }
        });
    }
}
