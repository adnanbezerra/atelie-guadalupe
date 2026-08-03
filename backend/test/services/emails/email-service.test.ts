import * as assert from "node:assert";
import { test } from "node:test";
import {
    EmailDeliveryStatus,
    EmailJobStatus,
    EmailJobType
} from "../../../src/generated/prisma/enums";
import { EmailService } from "../../../src/modules/emails/email-service";
import { escapeHtml, renderEmail } from "../../../src/modules/emails/email-templates";

function createJob() {
    return {
        id: 1,
        uuid: "0195f4aa-7f18-7db5-9f32-06f4a9a2b500",
        type: EmailJobType.WELCOME,
        recipient: "maria@example.com",
        payload: { customerName: "Maria" },
        deduplicationKey: "welcome:user-1",
        status: EmailJobStatus.PENDING as EmailJobStatus,
        attempts: 0,
        nextAttemptAt: new Date(),
        lockedAt: null,
        lastError: null,
        providerMessageId: null,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

test("email templates escape dynamic values and build the order link", () => {
    assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
    const rendered = renderEmail(
        EmailJobType.ORDER_SHIPPED,
        {
            customerName: "Maria <Admin>",
            orderUuid: "order-1",
            items: [{ name: "Sabonete", quantity: 1, totalInCents: 2500 }],
            subtotalInCents: 2500,
            shippingInCents: 1000,
            discountInCents: 0,
            totalInCents: 3500,
            trackingCode: "AA123BR"
        },
        "https://atelie.example"
    );

    assert.match(rendered.html, /Maria &lt;Admin&gt;/);
    assert.match(rendered.html, /AA123BR/);
    assert.match(rendered.html, /https:\/\/atelie\.example\/pedidos\/order-1/);
    assert.match(rendered.text, /AA123BR/);
});

test("email worker records acceptance and marks the job sent", async () => {
    const job = createJob();
    const logs: Array<Record<string, unknown>> = [];
    const prisma = {
        emailJob: {
            updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                if (data.status === EmailJobStatus.PROCESSING) {
                    job.status = EmailJobStatus.PROCESSING;
                    job.attempts += 1;
                    return { count: 1 };
                }
                return { count: 0 };
            },
            findMany: async () => [job],
            findUniqueOrThrow: async () => job,
            update: async ({ data }: { data: Partial<typeof job> }) => {
                Object.assign(job, data);
                return job;
            }
        },
        emailDeliveryLog: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
                const log = { id: 1, ...data, status: EmailDeliveryStatus.STARTED };
                logs.push(log);
                return log;
            },
            update: async ({ data }: { data: Record<string, unknown> }) => {
                Object.assign(logs[0], data);
                return logs[0];
            }
        },
        $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations)
    };
    const provider = {
        send: async () => ({ messageId: "resend-1" })
    };

    await new EmailService(prisma as never, provider).processDue();

    assert.equal(job.status, EmailJobStatus.SENT);
    assert.equal(job.attempts, 1);
    assert.equal(job.providerMessageId, "resend-1");
    assert.equal(logs[0].status, EmailDeliveryStatus.ACCEPTED);
    assert.equal(logs[0].attemptNumber, 1);
});

test("email worker stops after the initial call and three retries", async () => {
    const job = createJob();
    const logs: Array<Record<string, unknown>> = [];
    const prisma = {
        emailJob: {
            updateMany: async ({ data }: { data: Record<string, unknown> }) => {
                if (data.status === EmailJobStatus.PROCESSING) {
                    job.status = EmailJobStatus.PROCESSING;
                    job.attempts += 1;
                    return { count: 1 };
                }
                return { count: 0 };
            },
            findMany: async () => (job.status === EmailJobStatus.FAILED ? [] : [job]),
            findUniqueOrThrow: async () => job,
            update: async ({ data }: { data: Partial<typeof job> }) => {
                Object.assign(job, data);
                return job;
            }
        },
        emailDeliveryLog: {
            create: async ({ data }: { data: Record<string, unknown> }) => {
                const log = {
                    id: logs.length + 1,
                    ...data,
                    status: EmailDeliveryStatus.STARTED
                };
                logs.push(log);
                return log;
            },
            update: async ({
                where,
                data
            }: {
                where: { id: number };
                data: Record<string, unknown>;
            }) => {
                Object.assign(logs[where.id - 1], data);
                return logs[where.id - 1];
            }
        },
        $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations)
    };
    let providerCalls = 0;
    const provider = {
        send: async () => {
            providerCalls += 1;
            throw new Error("provider unavailable");
        }
    };
    const service = new EmailService(prisma as never, provider);

    for (let attempt = 0; attempt < 4; attempt += 1) {
        await service.processDue();
    }

    assert.equal(providerCalls, 4);
    assert.equal(job.attempts, 4);
    assert.equal(job.status, EmailJobStatus.FAILED);
    assert.equal(logs.length, 4);
    assert.ok(logs.every((log) => log.status === EmailDeliveryStatus.FAILED));
});
