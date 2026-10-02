export function normalizeDocument(document: string): string {
    return document.replace(/\D/g, "");
}

export function isCpfOrCnpj(document?: string | null): document is string {
    if (!document) return false;
    return /^\d{11}$|^\d{14}$/.test(normalizeDocument(document));
}
