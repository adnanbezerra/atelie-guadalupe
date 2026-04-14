import { presentAddress } from "../../users/services/user-presenter";

type PlatformEntity = {
    uuid: string;
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    document: string | null;
    websiteUrl: string | null;
    isActive: boolean;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
    address: Parameters<typeof presentAddress>[0] | null;
};

export function presentPlatform(platform: PlatformEntity) {
    return {
        uuid: platform.uuid,
        name: platform.name,
        slug: platform.slug,
        email: platform.email,
        phone: platform.phone,
        document: platform.document,
        websiteUrl: platform.websiteUrl,
        isActive: platform.isActive,
        isDefault: platform.isDefault,
        address: platform.address ? presentAddress(platform.address) : null,
        createdAt: platform.createdAt,
        updatedAt: platform.updatedAt
    };
}
