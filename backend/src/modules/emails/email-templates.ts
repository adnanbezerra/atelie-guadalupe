import { EmailJobType } from "../../generated/prisma/enums";

export type RenderedEmail = {
    subject: string;
    html: string;
    text: string;
};

type Payload = Record<string, unknown>;

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

function layout(
    title: string,
    greeting: string,
    content: string,
    cta?: { label: string; url: string }
) {
    return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;background:#f7f3ed;font-family:Arial,sans-serif;color:#3b3028">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:600px;background:#fff;border-radius:12px" cellspacing="0" cellpadding="0">
<tr><td style="padding:32px"><p style="margin:0 0 8px;color:#8a6f57">Atelie Guadalupe</p>
<h1 style="font-size:26px;margin:0 0 24px">${escapeHtml(title)}</h1>
<p>${escapeHtml(greeting)}</p>${content}
${cta ? `<p style="margin-top:28px"><a href="${escapeHtml(cta.url)}" style="background:#6b4f3a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">${escapeHtml(cta.label)}</a></p>` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

function orderSummary(data: ReturnType<typeof orderData>) {
    const items = data.items
        .map(
            (item) =>
                `<li>${escapeHtml(item.name)} x ${item.quantity} - ${escapeHtml(currency(item.totalInCents))}</li>`
        )
        .join("");
    return `<p>Pedido <strong>#${escapeHtml(data.orderUuid)}</strong></p>
<ul>${items}</ul>
<p>Subtotal: ${escapeHtml(currency(data.subtotalInCents))}<br>
Frete: ${escapeHtml(data.shippingInCents > 0 ? currency(data.shippingInCents) : "a confirmar")}<br>
Desconto: ${escapeHtml(currency(data.discountInCents))}<br>
<strong>Total atual: ${escapeHtml(currency(data.totalInCents))}</strong></p>`;
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
            html: layout(subject, `Ola, ${name}!`, `<p>${message}</p>`),
            text: `Ola, ${name}!\n\n${message}`
        };
    }

    const data = orderData(payloadValue);
    const orderUrl = `${frontendUrl.replace(/\/$/, "")}/pedidos/${encodeURIComponent(data.orderUuid)}`;
    const greeting = `Ola, ${data.customerName}!`;
    const summary = orderSummary(data);
    const baseText = orderText(data);

    if (type === EmailJobType.ORDER_CREATED) {
        const subject = "Recebemos seu pedido";
        const message = "O frete e o total final serao confirmados antes da criacao do pagamento.";
        return {
            subject,
            html: layout(subject, greeting, `<p>${message}</p>${summary}`, {
                label: "Ver pedido",
                url: orderUrl
            }),
            text: `${greeting}\n\n${message}\n\n${baseText}\n\n${orderUrl}`
        };
    }

    if (type === EmailJobType.PAYMENT_CONFIRMED) {
        const subject = "Pagamento confirmado";
        const message = "Recebemos seu pagamento e seu pedido agora esta em preparacao.";
        return {
            subject,
            html: layout(subject, greeting, `<p>${message}</p>${summary}`, {
                label: "Acompanhar pedido",
                url: orderUrl
            }),
            text: `${greeting}\n\n${message}\n\n${baseText}\n\n${orderUrl}`
        };
    }

    if (type === EmailJobType.ORDER_SHIPPED) {
        const subject = "Seu pedido foi enviado";
        const tracking = data.trackingCode ?? "consulte os detalhes do pedido";
        const message = `Codigo de rastreamento: ${tracking}`;
        return {
            subject,
            html: layout(
                subject,
                greeting,
                `<p>Seu pedido esta a caminho.</p><p><strong>${escapeHtml(message)}</strong></p>`,
                { label: "Acompanhar pedido", url: orderUrl }
            ),
            text: `${greeting}\n\nSeu pedido esta a caminho.\n${message}\n\n${orderUrl}`
        };
    }

    if (type === EmailJobType.ORDER_DELIVERED) {
        const subject = "Seu pedido foi entregue";
        const message = "A entrega foi confirmada. Esperamos que voce aproveite sua compra.";
        return {
            subject,
            html: layout(subject, greeting, `<p>${message}</p>`, {
                label: "Ver pedido",
                url: orderUrl
            }),
            text: `${greeting}\n\n${message}\n\n${orderUrl}`
        };
    }

    throw new Error(`Tipo de email nao suportado: ${type}`);
}
