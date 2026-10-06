import { Prisma, PrismaClient } from "../../../generated/prisma/client";
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

type ListUsersInput = {
    page: number;
    pageSize: number;
    search?: string;
    role?: RoleName;
    isActive?: boolean;
    sort: "CREATED_AT_DESC" | "CREATED_AT_ASC" | "NAME_ASC" | "NAME_DESC";
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

    public async listPaginated(query: ListUsersInput) {
        const where: Prisma.UserWhereInput = {
            ...(query.search
                ? {
                      OR: [
                          { name: { contains: query.search, mode: "insensitive" } },
                          { email: { contains: query.search, mode: "insensitive" } },
                          { document: { contains: query.search } }
                      ]
                  }
                : {}),
            ...(query.role ? { role: { is: { name: query.role } } } : {}),
            ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {})
        };
        const orderBy =
            query.sort === "NAME_ASC"
                ? { name: "asc" as const }
                : query.sort === "NAME_DESC"
                  ? { name: "desc" as const }
                  : {
                        createdAt:
                            query.sort === "CREATED_AT_ASC" ? ("asc" as const) : ("desc" as const)
                    };
        const [users, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where,
                include: { role: true, address: true },
                orderBy,
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize
            }),
            this.prisma.user.count({ where })
        ]);
        return { users, total };
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

    public create(input: CreateUserInput, emailJob?: Prisma.EmailJobCreateInput) {
        if (!emailJob) {
            return this.prisma.user.create({
                data: input,
                include: {
                    role: true
                }
            });
        }

        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: input,
                include: {
                    role: true
                }
            });
            await tx.emailJob.create({ data: emailJob });
            return user;
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
