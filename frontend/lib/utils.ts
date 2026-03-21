export function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function formatCurrency(valueInCents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(valueInCents / 100);
}

export function formatDate(value?: string) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));
}

export function initialsFromName(name: string) {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");
}

export const getInitials = initialsFromName;

export function firstPriceInCents(
    prices: Array<{ priceInCents: number }> | undefined,
) {
    return prices?.[0]?.priceInCents ?? 0;
}

export function getPriceLabel(
    prices: Array<{ priceInCents: number }> | undefined,
) {
    const value = firstPriceInCents(prices);
    return value > 0 ? formatCurrency(value) : "Sob consulta";
}

export function matchesCollection(kind: "beauty" | "craft", text: string) {
    const normalized = text.toLowerCase();
    const beautyTerms = [
        "creme",
        "bot",
        "lavanda",
        "oleo",
        "sabonete",
        "aroma",
        "hidrat",
        "cosm",
        "beleza",
    ];
    const craftTerms = [
        "art",
        "cer",
        "sacro",
        "ter",
        "vela",
        "orat",
        "cruci",
        "decor",
        "tecido",
    ];

    const terms = kind === "beauty" ? beautyTerms : craftTerms;
    return terms.some((term) => normalized.includes(term));
}

export function buildQuery(
    params: Record<string, string | number | boolean | undefined | null>,
) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
            return;
        }

        searchParams.set(key, String(value));
    });

    return searchParams.toString();
}
