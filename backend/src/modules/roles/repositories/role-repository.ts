import { PrismaClient } from "../../../generated/prisma/client";
import { RoleName } from "../../../generated/prisma/enums";

export class RoleRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public findByName(name: RoleName) {
        return this.prisma.role.findUnique({
            where: {
                name
            }
        });
    }
}
