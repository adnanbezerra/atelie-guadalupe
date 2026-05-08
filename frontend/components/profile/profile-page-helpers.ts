import type {
    Address,
    Order,
    ProfileAddressInput,
    UpdateCurrentUserInput,
} from "@/lib/types";

export const navItems = [
    { href: "/perfil", icon: "person", label: "Dados Pessoais", view: "dados" },
    {
        href: "/perfil#pedidos",
        icon: "shopping_bag",
        label: "Meus Pedidos",
        view: "pedidos",
    },
    // {
    //     href: "/perfil#pagamento",
    //     icon: "payments",
    //     label: "Informações de Pagamento",
    //     view: "pagamento",
    // },
] as const;

export type ProfileView = (typeof navItems)[number]["view"];

export type ProfileOrder = Order & {
    paymentMethod?: string | null;
    payment?: {
        method?: string | null;
    } | null;
};

export type ViaCepResponse = {
    cep?: string;
    logradouro?: string;
    complemento?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: boolean;
};

export const orderStatusLabels: Record<string, string> = {
    PENDING: "Pagamento pendente",
    AWAITING_PAYMENT: "Pagamento pendente",
    PAID: "Pagamento confirmado",
    PROCESSING: "Pagamento confirmado",
    SHIPPED: "Enviado",
    DELIVERED: "Entregue",
    CANCELLED: "Cancelado",
};

export const orderStatusClasses: Record<string, string> = {
    PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
    AWAITING_PAYMENT: "bg-amber-50 text-amber-700 ring-amber-200",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    PROCESSING: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    SHIPPED: "bg-sky-50 text-sky-700 ring-sky-200",
    DELIVERED: "bg-slate-900 text-white ring-slate-900",
    CANCELLED: "bg-red-50 text-red-700 ring-red-200",
};

const paymentMethodLabels: Record<string, string> = {
    CREDIT: "Crédito",
    CREDIT_CARD: "Crédito",
    credit: "Crédito",
    credito: "Crédito",
    DEBIT: "Débito",
    DEBIT_CARD: "Débito",
    debit: "Débito",
    debito: "Débito",
    PIX: "Pix",
    pix: "Pix",
};

export const monthOptions = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
];

export const yearOptions = Array.from(
    { length: new Date().getFullYear() - 1919 },
    (_, index) => 1920 + index,
).reverse();

export function formatDateLabel(date?: Date) {
    if (!date) {
        return "";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

export function formatDateValue(date?: Date) {
    if (!date) {
        return "";
    }

    return date.toISOString().slice(0, 10);
}

export function getPrimaryAddress(
    address?: Address | null,
    addresses?: Address[],
) {
    return address ?? addresses?.[0] ?? null;
}

function getFormString(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
}

export function cleanDigits(value: string, maxLength: number) {
    return onlyDigits(value, maxLength);
}

export function onlyDigits(value: string, maxLength: number) {
    return value.replace(/\D/g, "").slice(0, maxLength);
}

export function formatCpf(value: string) {
    const digits = onlyDigits(value, 11);

    return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function formatPhone(value: string) {
    const digits = onlyDigits(value, 11);

    if (digits.length <= 2) {
        return digits.length ? `(${digits}` : "";
    }

    if (digits.length <= 6) {
        return digits.replace(/^(\d{2})(\d+)/, "($1) $2");
    }

    if (digits.length <= 10) {
        return digits.replace(/^(\d{2})(\d{4})(\d+)/, "($1) $2-$3");
    }

    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
}

export function formatCep(value: string) {
    const digits = onlyDigits(value, 8);

    return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function formatBirthDateInput(value?: string | null) {
    return value ? value.slice(0, 10) : "";
}

function addDirtyField<T extends Record<string, unknown>>(
    payload: T,
    key: keyof T,
    currentValue: string,
    initialValue?: string | null,
) {
    if (currentValue !== (initialValue ?? "")) {
        payload[key] = currentValue as T[keyof T];
    }
}

export function buildDirtyProfilePayload(
    formData: FormData,
    user?: {
        name?: string;
        email?: string;
        document?: string;
        phone?: string | null;
        birthDate?: string | null;
    } | null,
    address?: Address | null,
) {
    const payload: UpdateCurrentUserInput = {};

    addDirtyField(payload, "name", getFormString(formData, "name"), user?.name);
    addDirtyField(
        payload,
        "email",
        getFormString(formData, "email"),
        user?.email,
    );
    addDirtyField(
        payload,
        "document",
        cleanDigits(getFormString(formData, "document"), 11),
        user?.document,
    );
    addDirtyField(
        payload,
        "phone",
        cleanDigits(getFormString(formData, "phone"), 11),
        user?.phone,
    );
    addDirtyField(
        payload,
        "birthDate",
        getFormString(formData, "birthDate"),
        formatBirthDateInput(user?.birthDate),
    );

    const addressPayload: ProfileAddressInput = {};

    addDirtyField(
        addressPayload,
        "zipCode",
        cleanDigits(getFormString(formData, "zipCode"), 8),
        address?.zipCode,
    );
    addDirtyField(
        addressPayload,
        "street",
        getFormString(formData, "street"),
        address?.street,
    );
    addDirtyField(
        addressPayload,
        "number",
        getFormString(formData, "number"),
        address?.number,
    );
    addDirtyField(
        addressPayload,
        "apartmentNumber",
        getFormString(formData, "apartmentNumber"),
        address?.apartmentNumber,
    );
    addDirtyField(
        addressPayload,
        "complement",
        getFormString(formData, "complement"),
        address?.complement,
    );
    addDirtyField(
        addressPayload,
        "neighborhood",
        getFormString(formData, "neighborhood"),
        address?.neighborhood,
    );
    addDirtyField(
        addressPayload,
        "city",
        getFormString(formData, "city"),
        address?.city,
    );
    addDirtyField(
        addressPayload,
        "state",
        getFormString(formData, "state").toUpperCase(),
        address?.state,
    );
    addDirtyField(
        addressPayload,
        "country",
        getFormString(formData, "country"),
        address?.country,
    );

    if (Object.keys(addressPayload).length > 0) {
        payload.address = address?.uuid
            ? { uuid: address.uuid, ...addressPayload }
            : addressPayload;
    }

    return payload;
}

export function getInitialView(): ProfileView {
    if (typeof window === "undefined") {
        return "dados";
    }

    return window.location.hash === "#pedidos" ||
        window.location.hash === "#pagamento"
        ? (window.location.hash.slice(1) as ProfileView)
        : "dados";
}

export function formatAddress(order: Order) {
    if (!order.address) {
        return "Endereço não informado";
    }

    const address = order.address;
    return [
        `${address.street}, ${address.number}`,
        address.complement,
        address.neighborhood,
        address.city,
        address.state,
        address.zipCode ? `CEP ${formatCep(address.zipCode)}` : null,
    ]
        .filter(Boolean)
        .join(" - ");
}

export function formatPaymentMethod(order: ProfileOrder) {
    const method = order.paymentMethod ?? order.payment?.method ?? "";
    return (paymentMethodLabels[method] ?? method) || "Não informado";
}

export async function fetchViaCepAddress(cepLimpo: string) {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const payload = (await response.json()) as ViaCepResponse;

    if (!response.ok || payload.erro) {
        return null;
    }

    return payload;
}
