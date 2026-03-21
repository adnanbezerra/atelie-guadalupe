export function formatCurrency(valueInCents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(valueInCents / 100);
}

export function formatDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
    }).format(new Date(value));
}
