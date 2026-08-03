import { Prisma } from "../../generated/prisma/client";
import { EmailJobType } from "../../generated/prisma/enums";
import { createUuid } from "../../core/utils/uuid";

export type EmailJobInput = {
    type: EmailJobType;
    recipient: string;
    deduplicationKey: string;
    payload: Prisma.InputJsonValue;
};

export function createEmailJob(input: EmailJobInput): Prisma.EmailJobCreateInput {
    return {
        uuid: createUuid(),
        type: input.type,
        recipient: input.recipient,
        deduplicationKey: input.deduplicationKey,
        payload: input.payload
    };
}

export type OrderEmailPayload = {
    customerName: string;
    orderUuid: string;
    items: Array<{
        name: string;
        quantity: number;
        totalInCents: number;
    }>;
    subtotalInCents: number;
    shippingInCents: number;
    discountInCents: number;
    totalInCents: number;
    trackingCode?: string;
};

export function orderEmailPayload(input: OrderEmailPayload): Prisma.InputJsonValue {
    return input as unknown as Prisma.InputJsonValue;
}
