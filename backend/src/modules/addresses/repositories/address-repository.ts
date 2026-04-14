import { PrismaClient } from "../../../generated/prisma/client";

type CreateAddressInput = {
    uuid: string;
    userId?: number | null;
    platformId?: number | null;
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

type UpdateAddressInput = Omit<Partial<CreateAddressInput>, "uuid" | "userId" | "platformId">;

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

    public findByPlatformId(platformId: number) {
        return this.prisma.address.findUnique({
            where: {
                platformId
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
            data: {
                uuid: input.uuid,
                ...(typeof input.userId === "number" ? { userId: input.userId } : {}),
                ...(typeof input.platformId === "number" ? { platformId: input.platformId } : {}),
                label: input.label,
                recipient: input.recipient,
                document: input.document,
                zipCode: input.zipCode,
                street: input.street,
                number: input.number,
                complement: input.complement,
                neighborhood: input.neighborhood,
                city: input.city,
                state: input.state,
                country: input.country,
                reference: input.reference,
                isDefault: input.isDefault
            }
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
