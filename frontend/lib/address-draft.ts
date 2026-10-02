const ADDRESS_ZIP_CODE_DRAFT_KEY = "atelie-guadalupe:address-zip-code-draft";

export function readAddressZipCodeDraft() {
    if (typeof window === "undefined") return "";

    const zipCode = window.sessionStorage
        .getItem(ADDRESS_ZIP_CODE_DRAFT_KEY)
        ?.replace(/\D/g, "")
        .slice(0, 8);

    return zipCode?.length === 8 ? zipCode : "";
}

export function saveAddressZipCodeDraft(zipCode: string) {
    window.sessionStorage.setItem(
        ADDRESS_ZIP_CODE_DRAFT_KEY,
        zipCode.replace(/\D/g, "").slice(0, 8),
    );
}

export function clearAddressZipCodeDraft() {
    if (typeof window === "undefined") return;
    window.sessionStorage.removeItem(ADDRESS_ZIP_CODE_DRAFT_KEY);
}
