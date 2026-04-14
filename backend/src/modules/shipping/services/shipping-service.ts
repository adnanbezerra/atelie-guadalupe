import { Prisma } from "../../../generated/prisma/client";
import { ProductCategory, RoleName, ShippingStatus } from "../../../generated/prisma/enums";
import { Either, left, right } from "../../../core/either/either";
import { AppError } from "../../../core/errors/app-error";
import { slugify } from "../../../core/utils/slug";
import { createUuid } from "../../../core/utils/uuid";
import { PlatformRepository } from "../../platforms/repositories/platform-repository";
import { ShippingRepository } from "../repositories/shipping-repository";
import { presentShipment, presentShippingBox } from "./shipping-presenter";
import { buildPackagingPlan } from "./shipping-packaging";
import {
    normalizeSuperFreteRecipient,
    SuperFreteCalculatorPayload,
    SuperFreteClient
} from "./superfrete-client";

type CurrentUser = {
    sub: string;
    role: RoleName;
};

type CreateShippingBoxInput = {
    name: string;
    category: ProductCategory;
    outerHeightCm: number;
    outerWidthCm: number;
    outerLengthCm: number;
    emptyWeightGrams?: number;
    maxItems: number;
    isActive?: boolean;
};

type UpdateShippingBoxInput = Partial<CreateShippingBoxInput>;

type QuoteOrderInput = {
    serviceCode?: number;
    ownHand?: boolean;
    receipt?: boolean;
    useInsuranceValue?: boolean;
    insuranceValueInCents?: number;
    refresh?: boolean;
};

type ShippingOrder = NonNullable<Awaited<ReturnType<ShippingRepository["findOrderForShipping"]>>>;
type ShippingPlatform = NonNullable<Awaited<ReturnType<PlatformRepository["findDefaultActive"]>>>;

type QuotedService = {
    serviceCode: number;
    serviceName: string;
    priceInCents: number;
    deliveryDays: number | null;
    deliveryRange: {
        min: number | null;
        max: number | null;
    };
    raw: Record<string, unknown>;
};

type SuperFreteOrderInfo = {
    orderId: string;
    protocol: string | null;
    status: string | null;
    trackingCode: string | null;
    labelUrl: string | null;
    raw: unknown;
};

type QuoteFingerprintInput = {
    ownHand: boolean;
    receipt: boolean;
    useInsuranceValue: boolean;
    insuranceValueInCents: number;
    services: string;
};

type SenderSnapshot = {
    platform: {
        uuid: string;
        name: string;
        slug: string;
        email: string | null;
        phone: string | null;
        document: string | null;
        websiteUrl: string | null;
    };
    address: {
        recipient: string;
        document: string | null;
        postalCode: string;
        street: string;
        number: string;
        complement: string | null;
        neighborhood: string;
        city: string;
        state: string;
        country: string;
    };
};

function ensureArray(value: unknown) {
    if (Array.isArray(value)) {
        return value;
    }

    if (value && typeof value === "object") {
        const objectValue = value as Record<string, unknown>;

        if (Array.isArray(objectValue.data)) {
            return objectValue.data;
        }

        if (Array.isArray(objectValue.results)) {
            return objectValue.results;
        }

        if (Array.isArray(objectValue.response)) {
            return objectValue.response;
        }
    }

    return [];
}

function getRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return value as Record<string, unknown>;
}

function getNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string") {
        const normalized = Number(value.replace(",", "."));
        if (Number.isFinite(normalized)) {
            return normalized;
        }
    }

    return null;
}

function getString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

function priceToCents(value: unknown) {
    const numberValue = getNumber(value);
    if (numberValue === null) {
        return null;
    }

    return Math.round(numberValue * 100);
}

function ensureHumanName(value: string, prefix: string) {
    return value.includes(" ") ? value : `${prefix} ${value}`;
}

function extractQuotedServices(payload: unknown): QuotedService[] {
    return ensureArray(payload)
        .map((item) => {
            const record = getRecord(item);
            if (!record) {
                return null;
            }

            const company = getRecord(record.company);

            const serviceCode =
                getNumber(record.id) ??
                getNumber(record.service) ??
                getNumber(record.service_id) ??
                getNumber(company?.id);
            const priceInCents =
                priceToCents(record.price) ??
                priceToCents(record.custom_price) ??
                priceToCents(record.total_price);

            if (serviceCode === null || priceInCents === null) {
                return null;
            }

            return {
                serviceCode,
                serviceName:
                    getString(record.name) ??
                    getString(record.service_name) ??
                    getString(company?.name) ??
                    `Servico ${serviceCode}`,
                priceInCents,
                deliveryDays:
                    getNumber(record.delivery_time) ??
                    getNumber(record.delivery) ??
                    getNumber(record.delivery_days),
                deliveryRange: {
                    min: getNumber(record.delivery_min),
                    max: getNumber(record.delivery_max)
                },
                raw: record
            };
        })
        .filter((item): item is QuotedService => Boolean(item));
}

function extractCreatedSuperFreteOrderId(payload: unknown): string | null {
    const record = getRecord(payload);
    if (!record) {
        return null;
    }

    return (
        getString(record.id) ??
        getString(record.order_id) ??
        getString(getRecord(record.order)?.id) ??
        getString(getRecord(record.data)?.id)
    );
}

function extractSuperFreteOrderInfo(payload: unknown, fallbackId: string): SuperFreteOrderInfo {
    const record = getRecord(payload);
    if (!record) {
        return {
            orderId: fallbackId,
            protocol: null,
            status: null,
            trackingCode: null,
            labelUrl: null,
            raw: payload
        };
    }

    const print = getRecord(record.print);

    return {
        orderId: getString(record.id) ?? fallbackId,
        protocol: getString(record.protocol),
        status: getString(record.status),
        trackingCode: getString(record.tracking),
        labelUrl: getString(print?.url),
        raw: payload
    };
}

export class ShippingService {
    public constructor(
        private readonly shippingRepository: ShippingRepository,
        private readonly platformRepository: PlatformRepository,
        private readonly superFreteClient: SuperFreteClient
    ) {}

    public async listBoxes(): Promise<
        Either<AppError, { boxes: Array<ReturnType<typeof presentShippingBox>> }>
    > {
        const boxes = await this.shippingRepository.listBoxes();

        return right({
            boxes: boxes.map((box) => presentShippingBox(box))
        });
    }

    public async createBox(
        input: CreateShippingBoxInput
    ): Promise<Either<AppError, { box: ReturnType<typeof presentShippingBox> }>> {
        const slug = slugify(input.name);
        const existing = await this.shippingRepository.findBoxBySlug(slug);
        if (existing) {
            return left(AppError.conflict("Ja existe uma caixa com este nome"));
        }

        const box = await this.shippingRepository.createBox({
            uuid: createUuid(),
            name: input.name.trim(),
            slug,
            category: input.category,
            outerHeightCm: input.outerHeightCm.toFixed(2),
            outerWidthCm: input.outerWidthCm.toFixed(2),
            outerLengthCm: input.outerLengthCm.toFixed(2),
            emptyWeightGrams: input.emptyWeightGrams ?? 0,
            maxItems: input.maxItems,
            isActive: input.isActive ?? true
        });

        return right({
            box: presentShippingBox(box)
        });
    }

    public async updateBox(
        boxUuid: string,
        input: UpdateShippingBoxInput
    ): Promise<Either<AppError, { box: ReturnType<typeof presentShippingBox> }>> {
        const existing = await this.shippingRepository.findBoxByUuid(boxUuid);
        if (!existing) {
            return left(AppError.notFound("Caixa nao encontrada"));
        }

        const slug = input.name ? slugify(input.name) : undefined;
        if (slug && slug !== existing.slug) {
            const conflict = await this.shippingRepository.findBoxBySlug(slug);
            if (conflict && conflict.uuid !== existing.uuid) {
                return left(AppError.conflict("Ja existe uma caixa com este nome"));
            }
        }

        const box = await this.shippingRepository.updateBoxByUuid(boxUuid, {
            ...(input.name ? { name: input.name.trim(), slug } : {}),
            ...(input.category ? { category: input.category } : {}),
            ...(typeof input.outerHeightCm === "number"
                ? { outerHeightCm: input.outerHeightCm.toFixed(2) }
                : {}),
            ...(typeof input.outerWidthCm === "number"
                ? { outerWidthCm: input.outerWidthCm.toFixed(2) }
                : {}),
            ...(typeof input.outerLengthCm === "number"
                ? { outerLengthCm: input.outerLengthCm.toFixed(2) }
                : {}),
            ...(typeof input.emptyWeightGrams === "number"
                ? { emptyWeightGrams: input.emptyWeightGrams }
                : {}),
            ...(typeof input.maxItems === "number" ? { maxItems: input.maxItems } : {}),
            ...(typeof input.isActive === "boolean" ? { isActive: input.isActive } : {})
        });

        return right({
            box: presentShippingBox(box)
        });
    }

    public async deleteBox(boxUuid: string): Promise<Either<AppError, { deleted: true }>> {
        const existing = await this.shippingRepository.findBoxByUuid(boxUuid);
        if (!existing) {
            return left(AppError.notFound("Caixa nao encontrada"));
        }

        await this.shippingRepository.deleteBoxByUuid(boxUuid);

        return right({
            deleted: true as const
        });
    }

    public async detailOrderShipment(
        currentUser: CurrentUser,
        orderUuid: string
    ): Promise<Either<AppError, Record<string, unknown>>> {
        const order = await this.loadOrder(currentUser, orderUuid);
        if (!order.success) {
            return order;
        }

        return right(this.presentOrderShipment(order.value));
    }

    public async quoteOrder(
        currentUser: CurrentUser,
        orderUuid: string,
        input: QuoteOrderInput
    ): Promise<Either<AppError, Record<string, unknown>>> {
        const orderResult = await this.loadOrder(currentUser, orderUuid);
        if (!orderResult.success) {
            return orderResult;
        }

        const order = orderResult.value;
        if (!order.address) {
            return left(AppError.business("Pedido precisa ter endereco para calcular o frete"));
        }
        const platformResult = await this.loadPlatform();
        if (!platformResult.success) {
            return platformResult;
        }
        const platform = platformResult.value;

        const shipmentLock = this.getShipmentLockState(order.shipment, input.serviceCode);
        if (shipmentLock === "return-stored") {
            return right(this.presentOrderShipment(order));
        }

        if (shipmentLock === "reject-change") {
            return left(
                AppError.business(
                    "O frete deste pedido ja foi confirmado e nao pode trocar de servico"
                )
            );
        }

        const boxes = await this.shippingRepository.listActiveBoxes();
        const packaging = buildPackagingPlan(order.items, boxes);
        const fingerprintInput = this.buildQuoteFingerprintInput(order, input);
        const fingerprint = JSON.stringify({
            addressUuid: order.address.uuid,
            items: order.items.map((item) => ({
                uuid: item.uuid,
                productId: item.productId,
                quantity: item.quantity,
                productSize: item.productSize,
                updatedAt: item.updatedAt.toISOString()
            })),
            boxes: boxes.map((box) => `${box.uuid}:${box.updatedAt.toISOString()}`),
            quote: fingerprintInput
        });

        let quotedServices = this.readStoredQuotedServices(order.shipment?.quotedServices);

        if (
            !input.refresh &&
            order.shipment?.quoteFingerprint === fingerprint &&
            quotedServices.length > 0
        ) {
            if (order.shipment.status === "CONFIRMED" && input.serviceCode) {
                return right(this.presentOrderShipment(order));
            }
        } else {
            const senderSnapshot = this.buildSenderSnapshot(platform);
            const calculatorPayload = this.buildCalculatorPayload(
                order,
                packaging,
                input,
                senderSnapshot
            );
            const calculatorResponse =
                await this.superFreteClient.calculateQuote(calculatorPayload);
            quotedServices = extractQuotedServices(calculatorResponse);

            if (quotedServices.length === 0) {
                return left(
                    AppError.business("Nenhuma opcao de frete foi retornada pelo SuperFrete")
                );
            }

            await this.shippingRepository.saveQuoteSnapshot(
                order.id,
                {
                    uuid: createUuid(),
                    orderId: order.id,
                    status: ShippingStatus.QUOTED,
                    quoteFingerprint: fingerprint,
                    senderSnapshot: senderSnapshot as Prisma.InputJsonValue,
                    calculatorPayload: calculatorPayload as Prisma.InputJsonValue,
                    calculatorResponse: calculatorResponse as Prisma.InputJsonValue,
                    quotedServices: quotedServices as Prisma.InputJsonValue,
                    packagingSnapshot: packaging as Prisma.InputJsonValue,
                    quotedAt: new Date()
                },
                {
                    status: ShippingStatus.QUOTED,
                    quoteFingerprint: fingerprint,
                    senderSnapshot: senderSnapshot as Prisma.InputJsonValue,
                    calculatorPayload: calculatorPayload as Prisma.InputJsonValue,
                    calculatorResponse: calculatorResponse as Prisma.InputJsonValue,
                    quotedServices: quotedServices as Prisma.InputJsonValue,
                    packagingSnapshot: packaging as Prisma.InputJsonValue,
                    quotedAt: new Date()
                }
            );
        }

        if (!input.serviceCode) {
            const refreshed = await this.shippingRepository.findOrderForShipping(order.uuid);
            return right(this.presentOrderShipment(refreshed ?? order));
        }

        const selectedService = quotedServices.find(
            (service) => service.serviceCode === input.serviceCode
        );

        if (!selectedService) {
            return left(AppError.business("Servico de frete nao encontrado na cotacao"));
        }

        const shipment = await this.shippingRepository.confirmSelectedService(
            order.id,
            selectedService.priceInCents,
            order.subtotalInCents + selectedService.priceInCents - order.discountInCents,
            {
                uuid: createUuid(),
                orderId: order.id,
                status: ShippingStatus.CONFIRMED,
                quoteFingerprint: fingerprint,
                senderSnapshot: this.buildSenderSnapshot(platform) as Prisma.InputJsonValue,
                selectedServiceCode: selectedService.serviceCode,
                selectedServiceName: selectedService.serviceName,
                shippingPriceInCents: selectedService.priceInCents,
                quotedServices: quotedServices as Prisma.InputJsonValue,
                packagingSnapshot: packaging as Prisma.InputJsonValue,
                confirmedAt: new Date(),
                quotedAt: new Date()
            },
            {
                status: ShippingStatus.CONFIRMED,
                quoteFingerprint: fingerprint,
                senderSnapshot: this.buildSenderSnapshot(platform) as Prisma.InputJsonValue,
                selectedServiceCode: selectedService.serviceCode,
                selectedServiceName: selectedService.serviceName,
                shippingPriceInCents: selectedService.priceInCents,
                quotedServices: quotedServices as Prisma.InputJsonValue,
                packagingSnapshot: packaging as Prisma.InputJsonValue,
                confirmedAt: new Date()
            }
        );

        return right({
            ...this.presentOrderShipment({
                ...order,
                shipment
            }),
            orderTotals: {
                subtotalInCents: order.subtotalInCents,
                shippingInCents: selectedService.priceInCents,
                discountInCents: order.discountInCents,
                totalInCents:
                    order.subtotalInCents + selectedService.priceInCents - order.discountInCents
            }
        });
    }

    public async checkoutOrder(
        currentUser: CurrentUser,
        orderUuid: string
    ): Promise<Either<AppError, Record<string, unknown>>> {
        const orderResult = await this.loadOrder(currentUser, orderUuid);
        if (!orderResult.success) {
            return orderResult;
        }

        const order = orderResult.value;
        if (!order.address) {
            return left(AppError.business("Pedido precisa ter endereco para gerar a etiqueta"));
        }

        if (
            !order.shipment ||
            !order.shipment.selectedServiceCode ||
            !order.shipment.packagingSnapshot
        ) {
            return left(
                AppError.business("Confirme uma cotacao de frete antes de gerar a etiqueta")
            );
        }

        if (order.shipment.status === "LABEL_PURCHASED") {
            return right(this.presentOrderShipment(order));
        }

        let superfreteOrderId = order.shipment.superfreteOrderId;
        if (!superfreteOrderId) {
            const senderSnapshot =
                this.readSenderSnapshot(order.shipment.senderSnapshot) ??
                this.buildSenderSnapshotRecordFromPlatform(await this.requirePlatformForOrder());
            const cartPayload = this.buildCartPayload(order, senderSnapshot);
            const cartResponse = await this.superFreteClient.createCart(cartPayload);
            superfreteOrderId = extractCreatedSuperFreteOrderId(cartResponse);

            if (!superfreteOrderId) {
                return left(
                    AppError.serviceUnavailable("SuperFrete nao retornou o id da etiqueta")
                );
            }

            await this.shippingRepository.updateShipmentStatusByOrderId(
                order.id,
                ShippingStatus.CHECKOUT_REQUESTED,
                {
                    superfreteOrderId,
                    senderSnapshot: senderSnapshot as Prisma.InputJsonValue,
                    cartPayload: cartPayload as Prisma.InputJsonValue,
                    cartResponse: cartResponse as Prisma.InputJsonValue,
                    checkoutRequestedAt: new Date()
                }
            );
        }

        const checkoutResponse = await this.superFreteClient.checkout([superfreteOrderId]);
        const orderInfo = extractSuperFreteOrderInfo(
            await this.superFreteClient.getOrderInfo(superfreteOrderId),
            superfreteOrderId
        );

        await this.shippingRepository.updateShipmentStatusByOrderId(
            order.id,
            ShippingStatus.LABEL_PURCHASED,
            {
                checkoutResponse: checkoutResponse as Prisma.InputJsonValue,
                purchasedAt: new Date(),
                superfreteProtocol: orderInfo.protocol,
                trackingCode: orderInfo.trackingCode,
                labelUrl: orderInfo.labelUrl
            }
        );

        const refreshed = await this.shippingRepository.findOrderForShipping(order.uuid);
        return right(this.presentOrderShipment(refreshed ?? order));
    }

    public async cancelShipment(
        currentUser: CurrentUser,
        orderUuid: string
    ): Promise<Either<AppError, Record<string, unknown>>> {
        const orderResult = await this.loadOrder(currentUser, orderUuid);
        if (!orderResult.success) {
            return orderResult;
        }

        const order = orderResult.value;
        if (!order.shipment?.superfreteOrderId) {
            return left(AppError.business("Este pedido ainda nao possui etiqueta no SuperFrete"));
        }

        const cancellationResponse = await this.superFreteClient.cancelOrder(
            order.shipment.superfreteOrderId
        );

        await this.shippingRepository.updateShipmentStatusByOrderId(
            order.id,
            ShippingStatus.CANCELLED,
            {
                cancellationResponse: cancellationResponse as Prisma.InputJsonValue,
                cancelledAt: new Date()
            }
        );

        const refreshed = await this.shippingRepository.findOrderForShipping(order.uuid);
        return right(this.presentOrderShipment(refreshed ?? order));
    }

    private async loadOrder(currentUser: CurrentUser, orderUuid: string) {
        const order = await this.shippingRepository.findOrderForShipping(orderUuid);
        if (!order) {
            return left(AppError.notFound("Pedido nao encontrado"));
        }

        if (currentUser.role === RoleName.USER && order.user.uuid !== currentUser.sub) {
            return left(AppError.forbidden("Usuario sem permissao para acessar este frete"));
        }

        return right(order);
    }

    private async loadPlatform() {
        const platform = await this.platformRepository.findDefaultActive();
        if (!platform || !platform.address) {
            return left(
                AppError.serviceUnavailable(
                    "Nenhuma plataforma padrao com endereco foi configurada"
                )
            );
        }

        return right(platform);
    }

    private async requirePlatformForOrder() {
        const result = await this.loadPlatform();
        if (!result.success) {
            throw result.value;
        }

        return result.value;
    }

    private readStoredQuotedServices(payload: unknown) {
        const values = ensureArray(payload);
        return values
            .map((value) => {
                const record = getRecord(value);
                if (!record) {
                    return null;
                }

                const serviceCode = getNumber(record.serviceCode);
                const priceInCents = getNumber(record.priceInCents);

                if (serviceCode === null || priceInCents === null) {
                    return null;
                }

                const deliveryRange = getRecord(record.deliveryRange);

                return {
                    serviceCode,
                    serviceName: getString(record.serviceName) ?? `Servico ${serviceCode}`,
                    priceInCents,
                    deliveryDays: getNumber(record.deliveryDays),
                    deliveryRange: {
                        min: getNumber(deliveryRange?.min),
                        max: getNumber(deliveryRange?.max)
                    },
                    raw: getRecord(record.raw) ?? {}
                };
            })
            .filter((item): item is QuotedService => Boolean(item));
    }

    private getShipmentLockState(
        shipment: ShippingOrder["shipment"],
        requestedServiceCode?: number
    ): "unlocked" | "return-stored" | "reject-change" {
        if (!shipment) {
            return "unlocked";
        }

        const lockedStatuses: ShippingStatus[] = [
            ShippingStatus.CONFIRMED,
            ShippingStatus.CHECKOUT_REQUESTED,
            ShippingStatus.LABEL_PURCHASED
        ];

        if (!lockedStatuses.includes(shipment.status)) {
            return "unlocked";
        }

        if (!requestedServiceCode) {
            return "return-stored";
        }

        return shipment.selectedServiceCode === requestedServiceCode
            ? "return-stored"
            : "reject-change";
    }

    private buildQuoteFingerprintInput(
        order: ShippingOrder,
        input: QuoteOrderInput
    ): QuoteFingerprintInput {
        return {
            ownHand: input.ownHand ?? false,
            receipt: input.receipt ?? false,
            useInsuranceValue: input.useInsuranceValue ?? false,
            insuranceValueInCents:
                (input.useInsuranceValue ?? false)
                    ? (input.insuranceValueInCents ?? order.subtotalInCents)
                    : 0,
            services: process.env.SUPERFRETE_SERVICE_CODES ?? "1,2,17"
        };
    }

    private buildCalculatorPayload(
        order: ShippingOrder,
        packaging: ReturnType<typeof buildPackagingPlan>,
        input: QuoteOrderInput,
        senderSnapshot: SenderSnapshot
    ): SuperFreteCalculatorPayload {
        return {
            from: {
                postal_code: String(senderSnapshot.address.postalCode).replace(/\D/g, "")
            },
            to: {
                postal_code: order.address!.zipCode.replace(/\D/g, "")
            },
            services: process.env.SUPERFRETE_SERVICE_CODES ?? "1,2,17",
            options: {
                own_hand: input.ownHand ?? false,
                receipt: input.receipt ?? false,
                insurance_value: (input.insuranceValueInCents ?? order.subtotalInCents) / 100,
                use_insurance_value: input.useInsuranceValue ?? false
            },
            package: {
                height: packaging.consolidatedPackage.heightCm,
                width: packaging.consolidatedPackage.widthCm,
                length: packaging.consolidatedPackage.lengthCm,
                weight: packaging.consolidatedPackage.weightKg
            }
        };
    }

    private buildSenderSnapshot(platform: ShippingPlatform) {
        return this.buildSenderSnapshotRecordFromPlatform(platform);
    }

    private buildSenderSnapshotRecordFromPlatform(platform: ShippingPlatform): SenderSnapshot {
        return {
            platform: {
                uuid: platform.uuid,
                name: platform.name,
                slug: platform.slug,
                email: platform.email,
                phone: platform.phone,
                document: platform.document,
                websiteUrl: platform.websiteUrl
            },
            address: {
                recipient: platform.address!.recipient,
                document: platform.address!.document,
                postalCode: platform.address!.zipCode,
                street: platform.address!.street,
                number: platform.address!.number,
                complement: platform.address!.complement,
                neighborhood: platform.address!.neighborhood,
                city: platform.address!.city,
                state: platform.address!.state,
                country: platform.address!.country
            }
        };
    }

    private readSenderSnapshot(value: unknown): SenderSnapshot | null {
        const record = getRecord(value);
        const platform = getRecord(record?.platform);
        const address = getRecord(record?.address);

        if (!platform || !address) {
            return null;
        }

        const platformUuid = getString(platform.uuid);
        const platformName = getString(platform.name);
        const platformSlug = getString(platform.slug);
        const postalCode = getString(address.postalCode);
        const street = getString(address.street);
        const number = getString(address.number);
        const neighborhood = getString(address.neighborhood);
        const city = getString(address.city);
        const state = getString(address.state);
        const country = getString(address.country);
        const recipient = getString(address.recipient);

        if (
            !platformUuid ||
            !platformName ||
            !platformSlug ||
            !postalCode ||
            !street ||
            !number ||
            !neighborhood ||
            !city ||
            !state ||
            !country ||
            !recipient
        ) {
            return null;
        }

        return {
            platform: {
                uuid: platformUuid,
                name: platformName,
                slug: platformSlug,
                email: getString(platform.email),
                phone: getString(platform.phone),
                document: getString(platform.document),
                websiteUrl: getString(platform.websiteUrl)
            },
            address: {
                recipient,
                document: getString(address.document),
                postalCode,
                street,
                number,
                complement: getString(address.complement),
                neighborhood,
                city,
                state,
                country
            }
        };
    }

    private buildCartPayload(order: ShippingOrder, senderSnapshot: SenderSnapshot) {
        const shipment = order.shipment!;
        const packaging = getRecord(shipment.packagingSnapshot);
        const consolidatedPackage = getRecord(packaging?.consolidatedPackage);

        return {
            from: {
                name: ensureHumanName(senderSnapshot.platform.name, "Loja"),
                address: senderSnapshot.address.street,
                number: senderSnapshot.address.number,
                complement: senderSnapshot.address.complement ?? undefined,
                district: senderSnapshot.address.neighborhood || "NA",
                city: senderSnapshot.address.city,
                state_abbr: senderSnapshot.address.state.toUpperCase(),
                postal_code: String(senderSnapshot.address.postalCode).replace(/\D/g, ""),
                document:
                    senderSnapshot.address.document ?? senderSnapshot.platform.document ?? undefined
            },
            to: normalizeSuperFreteRecipient({
                name: ensureHumanName(order.address!.recipient, "Cliente"),
                address: order.address!.street,
                number: order.address!.number,
                complement: order.address!.complement,
                district: order.address!.neighborhood,
                city: order.address!.city,
                stateAbbr: order.address!.state,
                postalCode: order.address!.zipCode,
                document: order.address!.document ?? order.user.document,
                email: order.user.email
            }),
            service: shipment.selectedServiceCode!,
            products: order.items.map((item) => ({
                name: item.productNameSnapshot,
                quantity: item.quantity,
                unitary_value: Number((item.unitPriceInCents / 100).toFixed(2))
            })),
            volumes: {
                height: getNumber(consolidatedPackage?.heightCm) ?? 0,
                width: getNumber(consolidatedPackage?.widthCm) ?? 0,
                length: getNumber(consolidatedPackage?.lengthCm) ?? 0,
                weight: getNumber(consolidatedPackage?.weightKg) ?? 0
            },
            options: {
                insurance_value:
                    shipment.shippingPriceInCents !== null ? order.subtotalInCents / 100 : null,
                receipt: false,
                own_hand: false,
                non_commercial: true
            },
            platform: senderSnapshot.platform.name,
            url: senderSnapshot.platform.websiteUrl ?? undefined,
            tag: order.uuid
        };
    }

    private presentOrderShipment(order: ShippingOrder) {
        return {
            order: {
                uuid: order.uuid,
                status: order.status,
                subtotalInCents: order.subtotalInCents,
                shippingInCents: order.shippingInCents,
                discountInCents: order.discountInCents,
                totalInCents: order.totalInCents
            },
            shipment: order.shipment ? presentShipment(order.shipment) : null
        };
    }
}
