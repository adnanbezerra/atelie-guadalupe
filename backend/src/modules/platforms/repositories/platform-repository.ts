import { PrismaClient } from "../../../generated/prisma/client";

type CreatePlatformInput = {
    uuid: string;
    name: string;
    slug: string;
    email?: string;
    phone?: string;
    document?: string;
    websiteUrl?: string;
    isActive: boolean;
    isDefault: boolean;
    address: {
        uuid: string;
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
    };
};

type UpdatePlatformInput = {
    name?: string;
    slug?: string;
    email?: string | null;
    phone?: string | null;
    document?: string | null;
    websiteUrl?: string | null;
    isActive?: boolean;
    isDefault?: boolean;
    address?: {
        label?: string;
        recipient?: string;
        document?: string | null;
        zipCode?: string;
        street?: string;
        number?: string;
        complement?: string | null;
        neighborhood?: string;
        city?: string;
        state?: string;
        country?: string;
        reference?: string | null;
    };
};

const includePlatformAddress = {
    address: true
} as const;

export class PlatformRepository {
    public constructor(private readonly prisma: PrismaClient) {}

    public list() {
        return this.prisma.platform.findMany({
            include: includePlatformAddress,
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
        return this.prisma.platform.findUnique({
            where: {
                uuid
            },
            include: includePlatformAddress
        });
    }

    public findBySlug(slug: string) {
        return this.prisma.platform.findUnique({
            where: {
                slug
            },
            include: includePlatformAddress
        });
    }

    public findDefaultActive() {
        return this.prisma.platform.findFirst({
            where: {
                isDefault: true,
                isActive: true
            },
            include: includePlatformAddress
        });
    }

    public async unsetDefaultPlatforms() {
        await this.prisma.platform.updateMany({
            where: {
                isDefault: true
            },
            data: {
                isDefault: false
            }
        });
    }

    public create(input: CreatePlatformInput) {
        return this.prisma.platform.create({
            data: {
                uuid: input.uuid,
                name: input.name,
                slug: input.slug,
                email: input.email,
                phone: input.phone,
                document: input.document,
                websiteUrl: input.websiteUrl,
                isActive: input.isActive,
                isDefault: input.isDefault,
                address: {
                    create: {
                        ...input.address,
                        userId: null
                    }
                }
            },
            include: includePlatformAddress
        });
    }

    public updateByUuid(uuid: string, input: UpdatePlatformInput) {
        return this.prisma.platform.update({
            where: {
                uuid
            },
            data: {
                ...(typeof input.name === "string" ? { name: input.name } : {}),
                ...(typeof input.slug === "string" ? { slug: input.slug } : {}),
                ...(typeof input.email !== "undefined" ? { email: input.email } : {}),
                ...(typeof input.phone !== "undefined" ? { phone: input.phone } : {}),
                ...(typeof input.document !== "undefined" ? { document: input.document } : {}),
                ...(typeof input.websiteUrl !== "undefined"
                    ? { websiteUrl: input.websiteUrl }
                    : {}),
                ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
                ...(typeof input.isDefault === "boolean" ? { isDefault: input.isDefault } : {}),
                ...(input.address
                    ? {
                          address: {
                              update: input.address
                          }
                      }
                    : {})
            },
            include: includePlatformAddress
        });
    }

    public deleteByUuid(uuid: string) {
        return this.prisma.platform.delete({
            where: {
                uuid
            }
        });
    }
}
