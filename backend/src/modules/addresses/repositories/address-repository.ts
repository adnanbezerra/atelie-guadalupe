import { PrismaClient } from "../../../generated/prisma/client";

type CreateAddressInput = {
    uuid: string;
    userId: number;
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

type UpdateAddressInput = Omit<Partial<CreateAddressInput>, "uuid" | "userId">;

export class AddressRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public listByUserId(userId: number) {
        return this.prisma.address.findMany({
            where: {
                userId
            },
            orderBy: [
                {
                    isDefault: "desc"
                },
                {
                    createdAt: "desc"
                }
            ]
        });
    }

    public findByUuid(uuid: string) {
        return this.prisma.address.findUnique({
            where: {
                uuid
            }
        });
    }

    public async unsetDefaultAddresses(userId: number) {
        await this.prisma.address.updateMany({
            where: {
                userId,
                isDefault: true
            },
            data: {
                isDefault: false
            }
        });
    }

    public create(input: CreateAddressInput) {
        return this.prisma.address.create({
            data: input
        });
    }

    public updateByUuid(uuid: string, input: UpdateAddressInput) {
        return this.prisma.address.update({
            where: {
                uuid
            },
            data: input
        });
    }

    public deleteByUuid(uuid: string) {
        return this.prisma.address.delete({
            where: {
                uuid
            }
        });
    }
}
