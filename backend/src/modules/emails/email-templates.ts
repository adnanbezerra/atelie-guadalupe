import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { EmailJobType } from "../../generated/prisma/enums";

export type RenderedEmail = {
    subject: string;
    html: string;
    text: string;
};

type Payload = Record<string, unknown>;
type TemplateValues = Record<string, string>;

const templateDirectory = resolve(__dirname, "../../../src/modules/emails/templates");
const templates = {
    welcome: readFileSync(resolve(templateDirectory, "welcome.html"), "utf8"),
    orderCreated: readFileSync(resolve(templateDirectory, "order-created.html"), "utf8"),
    paymentConfirmed: readFileSync(resolve(templateDirectory, "payment-confirmed.html"), "utf8"),
    orderShipped: readFileSync(resolve(templateDirectory, "order-shipped.html"), "utf8"),
    orderDelivered: readFileSync(resolve(templateDirectory, "order-delivered.html"), "utf8")
};

function record(value: unknown): Payload {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Payload de email invalido");
    }
    return value as Payload;
}

function stringValue(payload: Payload, key: string) {
    const value = payload[key];
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`Campo de email invalido: ${key}`);
    }
    return value;
}

function numberValue(payload: Payload, key: string) {
    const value = payload[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Campo de email invalido: ${key}`);
    }
    return value;
}

export function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function currency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(value / 100);
}

function replaceValues(template: string, values: TemplateValues) {
    return template.replace(/{{([a-zA-Z][a-zA-Z0-9]*)}}/g, (_match, key: string) => {
        const value = values[key];
        if (value === undefined) throw new Error(`Variavel de template ausente: ${key}`);
        return escapeHtml(value);
    });
}

function renderTemplate(template: string, values: TemplateValues, items: TemplateValues[] = []) {
    const withItems = template.replace(
        /{{#each items}}([\s\S]*?){{\/each}}/g,
        (_match, itemTemplate: string) =>
            items.map((item) => replaceValues(itemTemplate, item)).join("")
    );
    return replaceValues(withItems, values);
}

function orderData(payloadValue: unknown) {
    const payload = record(payloadValue);
    const rawItems = payload.items;
    if (!Array.isArray(rawItems)) throw new Error("Itens do email invalidos");

    return {
        customerName: stringValue(payload, "customerName"),
        orderUuid: stringValue(payload, "orderUuid"),
        subtotalInCents: numberValue(payload, "subtotalInCents"),
        shippingInCents: numberValue(payload, "shippingInCents"),
        discountInCents: numberValue(payload, "discountInCents"),
        totalInCents: numberValue(payload, "totalInCents"),
        trackingCode: typeof payload.trackingCode === "string" ? payload.trackingCode : undefined,
        items: rawItems.map((item) => {
            const itemRecord = record(item);
            return {
                name: stringValue(itemRecord, "name"),
                quantity: numberValue(itemRecord, "quantity"),
                totalInCents: numberValue(itemRecord, "totalInCents")
            };
        })
    };
}

function orderText(data: ReturnType<typeof orderData>) {
    const items = data.items
        .map((item) => `- ${item.name} x ${item.quantity}: ${currency(item.totalInCents)}`)
        .join("\n");
    return `Pedido #${data.orderUuid}\n${items}\nSubtotal: ${currency(data.subtotalInCents)}\nFrete: ${data.shippingInCents > 0 ? currency(data.shippingInCents) : "a confirmar"}\nDesconto: ${currency(data.discountInCents)}\nTotal atual: ${currency(data.totalInCents)}`;
}

export function renderEmail(
    type: EmailJobType,
    payloadValue: unknown,
    frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000"
): RenderedEmail {
    if (type === EmailJobType.WELCOME) {
        const payload = record(payloadValue);
        const name = stringValue(payload, "customerName");
        const subject = "Boas-vindas ao Atelie Guadalupe";
        const message =
            "Sua conta foi criada com sucesso. Esperamos que voce aproveite nossos produtos.";
        return {
            subject,
            html: renderTemplate(templates.welcome, {
                customerName: name,
                frontendUrl: frontendUrl.replace(/\/$/, "")
            }),
            text: `Ola, ${name}!\n\n${message}`
        };
    }

    const data = orderData(payloadValue);
    const orderUrl = `${frontendUrl.replace(/\/$/, "")}/pedidos/${encodeURIComponent(data.orderUuid)}`;
    const greeting = `Ola, ${data.customerName}!`;
    const baseText = orderText(data);
    const templateValues = {
        customerName: data.customerName,
        orderUuid: data.orderUuid,
        subtotal: currency(data.subtotalInCents),
        shipping: data.shippingInCents > 0 ? currency(data.shippingInCents) : "a confirmar",
        discount: currency(data.discountInCents),
        total: currency(data.totalInCents),
        orderUrl
    };
    const templateItems = data.items.map((item) => ({
        name: item.name,
        quantity: String(item.quantity),
        total: currency(item.totalInCents)
    }));

    if (type === EmailJobType.ORDER_CREATED) {
        const subject = "Recebemos seu pedido";
        const message = "O frete e o total final serao confirmados antes da criacao do pagamento.";
        return {
            subject,
            html: renderTemplate(templates.orderCreated, templateValues, templateItems),
            text: `${greeting}\n\n${message}\n\n${baseText}\n\n${orderUrl}`
        };
    }

    if (type === EmailJobType.PAYMENT_CONFIRMED) {
        const subject = "Pagamento confirmado";
        const message = "Recebemos seu pagamento e seu pedido agora esta em preparacao.";
        return {
            subject,
            html: renderTemplate(templates.paymentConfirmed, templateValues, templateItems),
            text: `${greeting}\n\n${message}\n\n${baseText}\n\n${orderUrl}`
        };
    }

    if (type === EmailJobType.ORDER_SHIPPED) {
        const subject = "Seu pedido foi enviado";
        const tracking = data.trackingCode ?? "consulte os detalhes do pedido";
        const message = `Codigo de rastreamento: ${tracking}`;
        return {
            subject,
            html: renderTemplate(templates.orderShipped, {
                ...templateValues,
                trackingCode: tracking
            }),
            text: `${greeting}\n\nSeu pedido esta a caminho.\n${message}\n\n${orderUrl}`
        };
    }

    if (type === EmailJobType.ORDER_DELIVERED) {
        const subject = "Seu pedido foi entregue";
        const message = "A entrega foi confirmada. Esperamos que voce aproveite sua compra.";
        return {
            subject,
            html: renderTemplate(templates.orderDelivered, templateValues),
            text: `${greeting}\n\n${message}\n\n${orderUrl}`
        };
    }

    throw new Error(`Tipo de email nao suportado: ${type}`);
}
