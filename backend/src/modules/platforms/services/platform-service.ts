import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { normalizeDocument } from "../../../core/utils/document";
import { slugify } from "../../../core/utils/slug";
import { createUuid } from "../../../core/utils/uuid";
import { PlatformRepository } from "../repositories/platform-repository";
import { presentPlatform } from "./platform-presenter";

type PlatformAddressInput = {
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

type CreatePlatformInput = {
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    websiteUrl?: string;
    isActive?: boolean;
    isDefault?: boolean;
    address: PlatformAddressInput;
};

type UpdatePlatformInput = {
    name?: string;
    email?: string | null;
    phone?: string | null;
    document?: string | null;
    websiteUrl?: string | null;
    isActive?: boolean;
    isDefault?: boolean;
    address?: Partial<PlatformAddressInput>;
};

export class PlatformService {
    public constructor(private readonly platformRepository: PlatformRepository) {}

    public async list(): Promise<
        Either<AppError, { platforms: Array<ReturnType<typeof presentPlatform>> }>
    > {
        const platforms = await this.platformRepository.list();

        return right({
            platforms: platforms.map((platform: Parameters<typeof presentPlatform>[0]) =>
                presentPlatform(platform)
            )
        });
    }

    public async detail(
        uuid: string
    ): Promise<Either<AppError, { platform: ReturnType<typeof presentPlatform> }>> {
        const platform = await this.platformRepository.findByUuid(uuid);
        if (!platform) {
            return left(AppError.notFound("Plataforma nao encontrada"));
        }

        return right({
            platform: presentPlatform(platform)
        });
    }

    public async create(
        input: CreatePlatformInput
    ): Promise<Either<AppError, { platform: ReturnType<typeof presentPlatform> }>> {
        const slug = slugify(input.name);
        const existing = await this.platformRepository.findBySlug(slug);
        if (existing) {
            return left(AppError.conflict("Ja existe uma plataforma com este nome"));
        }

        if (input.isDefault ?? true) {
            await this.platformRepository.unsetDefaultPlatforms();
        }

        const platform = await this.platformRepository.create({
            uuid: createUuid(),
            name: input.name.trim(),
            slug,
            email: input.email?.trim(),
            phone: input.phone?.trim(),
            document: input.document ? normalizeDocument(input.document) : undefined,
            websiteUrl: input.websiteUrl?.trim(),
            isActive: input.isActive ?? true,
            isDefault: input.isDefault ?? true,
            address: {
                uuid: createUuid(),
                label: input.address.label?.trim(),
                recipient: input.address.recipient.trim(),
                document: input.address.document
                    ? normalizeDocument(input.address.document)
                    : undefined,
                zipCode: input.address.zipCode.trim(),
                street: input.address.street.trim(),
                number: input.address.number.trim(),
                complement: input.address.complement?.trim(),
                neighborhood: input.address.neighborhood.trim(),
                city: input.address.city.trim(),
                state: input.address.state.trim(),
                country: input.address.country.trim(),
                reference: input.address.reference?.trim()
            }
        });

        return right({
            platform: presentPlatform(platform)
        });
    }

    public async update(
        uuid: string,
        input: UpdatePlatformInput
    ): Promise<Either<AppError, { platform: ReturnType<typeof presentPlatform> }>> {
        const existing = await this.platformRepository.findByUuid(uuid);
        if (!existing) {
            return left(AppError.notFound("Plataforma nao encontrada"));
        }

        const slug = input.name ? slugify(input.name) : undefined;
        if (slug && slug !== existing.slug) {
            const conflict = await this.platformRepository.findBySlug(slug);
            if (conflict && conflict.uuid !== existing.uuid) {
                return left(AppError.conflict("Ja existe uma plataforma com este nome"));
            }
        }

        if (input.isDefault) {
            await this.platformRepository.unsetDefaultPlatforms();
        }

        const platform = await this.platformRepository.updateByUuid(uuid, {
            ...(input.name ? { name: input.name.trim(), slug } : {}),
            ...(typeof input.email !== "undefined" ? { email: input.email?.trim() ?? null } : {}),
            ...(typeof input.phone !== "undefined" ? { phone: input.phone?.trim() ?? null } : {}),
            ...(typeof input.document !== "undefined"
                ? {
                      document: input.document ? normalizeDocument(input.document) : null
                  }
                : {}),
            ...(typeof input.websiteUrl !== "undefined"
                ? { websiteUrl: input.websiteUrl?.trim() ?? null }
                : {}),
            ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {}),
            ...(typeof input.isDefault === "boolean" ? { isDefault: input.isDefault } : {}),
            ...(input.address
                ? {
                      address: {
                          ...(typeof input.address.label !== "undefined"
                              ? { label: input.address.label?.trim() }
                              : {}),
                          ...(typeof input.address.recipient === "string"
                              ? { recipient: input.address.recipient.trim() }
                              : {}),
                          ...(typeof input.address.document !== "undefined"
                              ? {
                                    document: input.address.document
                                        ? normalizeDocument(input.address.document)
                                        : null
                                }
                              : {}),
                          ...(typeof input.address.zipCode === "string"
                              ? { zipCode: input.address.zipCode.trim() }
                              : {}),
                          ...(typeof input.address.street === "string"
                              ? { street: input.address.street.trim() }
                              : {}),
                          ...(typeof input.address.number === "string"
                              ? { number: input.address.number.trim() }
                              : {}),
                          ...(typeof input.address.complement !== "undefined"
                              ? { complement: input.address.complement?.trim() ?? null }
                              : {}),
                          ...(typeof input.address.neighborhood === "string"
                              ? { neighborhood: input.address.neighborhood.trim() }
                              : {}),
                          ...(typeof input.address.city === "string"
                              ? { city: input.address.city.trim() }
                              : {}),
                          ...(typeof input.address.state === "string"
                              ? { state: input.address.state.trim() }
                              : {}),
                          ...(typeof input.address.country === "string"
                              ? { country: input.address.country.trim() }
                              : {}),
                          ...(typeof input.address.reference !== "undefined"
                              ? { reference: input.address.reference?.trim() ?? null }
                              : {})
                      }
                  }
                : {})
        });

        return right({
            platform: presentPlatform(platform)
        });
    }

    public async delete(uuid: string): Promise<Either<AppError, { deleted: true }>> {
        const existing = await this.platformRepository.findByUuid(uuid);
        if (!existing) {
            return left(AppError.notFound("Plataforma nao encontrada"));
        }

        await this.platformRepository.deleteByUuid(uuid);

        return right({
            deleted: true as const
        });
    }
}
