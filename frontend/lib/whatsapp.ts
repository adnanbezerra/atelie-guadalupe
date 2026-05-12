export const WHATSAPP_PHONE = "5583988337598";

export function buildWhatsappLink(message: string) {
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}
