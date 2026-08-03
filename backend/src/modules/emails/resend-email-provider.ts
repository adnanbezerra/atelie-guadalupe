import { Resend } from "resend";

export type EmailProviderMessage = {
    to: string;
    subject: string;
    html: string;
    text: string;
    idempotencyKey: string;
};

export class EmailProviderError extends Error {
    public constructor(
        public readonly code: string,
        message: string
    ) {
        super(message);
    }
}

export interface EmailProvider {
    send(message: EmailProviderMessage): Promise<{ messageId: string }>;
}

export class ResendEmailProvider implements EmailProvider {
    private resend?: Resend;

    public constructor(
        private readonly apiKey = process.env.RESEND_API_KEY ?? "",
        private readonly from = process.env.EMAIL_FROM ?? "",
        private readonly replyTo = process.env.EMAIL_REPLY_TO
    ) {}

    public async send(message: EmailProviderMessage) {
        if (!this.apiKey || !this.from) {
            throw new EmailProviderError(
                "CONFIGURATION_ERROR",
                "RESEND_API_KEY e EMAIL_FROM devem estar configurados"
            );
        }

        this.resend ??= new Resend(this.apiKey);
        const { data, error } = await this.resend.emails.send(
            {
                from: this.from,
                to: message.to,
                subject: message.subject,
                html: message.html,
                text: message.text,
                replyTo: this.replyTo || undefined
            },
            {
                idempotencyKey: message.idempotencyKey
            }
        );

        if (error) {
            throw new EmailProviderError(error.name, error.message);
        }
        if (!data?.id) {
            throw new EmailProviderError("INVALID_RESPONSE", "Resend nao retornou o id do email");
        }

        return { messageId: data.id };
    }
}
