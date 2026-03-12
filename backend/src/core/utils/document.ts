export function normalizeDocument(document: string): string {
    return document.replace(/\D/g, "");
}
