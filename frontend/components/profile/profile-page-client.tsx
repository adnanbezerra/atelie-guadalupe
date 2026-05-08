"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useOrders } from "@/hooks/use-orders";
import { useProfile } from "@/hooks/use-profile";
import { clearAuthSession } from "@/lib/auth-session";
import { formatCurrency } from "@/lib/format";
import type { Address, Order, ProfileAddressInput } from "@/lib/types";

const navItems = [
    { href: "/perfil", icon: "person", label: "Dados Pessoais", view: "dados" },
    {
        href: "/perfil#pedidos",
        icon: "shopping_bag",
        label: "Meus Pedidos",
        view: "pedidos",
    },
    {
        href: "/perfil#pagamento",
        icon: "payments",
        label: "Informações de Pagamento",
        view: "pagamento",
    },
] as const;

type ProfileView = (typeof navItems)[number]["view"];

type ProfileOrder = Order & {
    paymentMethod?: string | null;
    payment?: {
        method?: string | null;
    } | null;
};

const orderStatusLabels: Record<string, string> = {
    PENDING: "Pagamento pendente",
    AWAITING_PAYMENT: "Pagamento pendente",
    PAID: "Pagamento confirmado",
    PROCESSING: "Pagamento confirmado",
    SHIPPED: "Enviado",
    DELIVERED: "Entregue",
    CANCELLED: "Cancelado",
};

const orderStatusClasses: Record<string, string> = {
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

const monthOptions = [
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

const yearOptions = Array.from(
    { length: new Date().getFullYear() - 1919 },
    (_, index) => 1920 + index,
).reverse();

function formatDateLabel(date?: Date) {
    if (!date) {
        return "";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function formatDateValue(date?: Date) {
    if (!date) {
        return "";
    }

    return date.toISOString().slice(0, 10);
}

function getPrimaryAddress(address?: Address | null, addresses?: Address[]) {
    return address ?? addresses?.[0] ?? null;
}

function getFormString(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
}

function cleanDigits(value: string, maxLength: number) {
    return onlyDigits(value, maxLength);
}

function buildAddressPayload(formData: FormData, uuid?: string) {
    const address: ProfileAddressInput = {
        uuid,
        street: getFormString(formData, "street"),
        number: getFormString(formData, "number"),
        apartmentNumber: getFormString(formData, "apartmentNumber"),
        complement: getFormString(formData, "complement"),
        neighborhood: getFormString(formData, "neighborhood"),
        city: getFormString(formData, "city"),
        state: getFormString(formData, "state").toUpperCase(),
        country: getFormString(formData, "country"),
        zipCode: cleanDigits(getFormString(formData, "zipCode"), 8),
    };

    return Object.fromEntries(
        Object.entries(address).filter(([, value]) => value !== ""),
    ) as ProfileAddressInput;
}

function onlyDigits(value: string, maxLength: number) {
    return value.replace(/\D/g, "").slice(0, maxLength);
}

function formatCpf(value: string) {
    const digits = onlyDigits(value, 11);

    return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function formatPhone(value: string) {
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

function formatCep(value: string) {
    const digits = onlyDigits(value, 8);

    return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function getInitialView(): ProfileView {
    if (typeof window === "undefined") {
        return "dados";
    }

    return window.location.hash === "#pedidos" ||
        window.location.hash === "#pagamento"
        ? (window.location.hash.slice(1) as ProfileView)
        : "dados";
}

function formatAddress(order: Order) {
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

function formatPaymentMethod(order: ProfileOrder) {
    const method = order.paymentMethod ?? order.payment?.method ?? "";
    return (paymentMethodLabels[method] ?? method) || "Não informado";
}

export function ProfilePageClient() {
    const router = useRouter();
    const profile = useProfile();
    const orders = useOrders([], { scope: "me", page: 1, pageSize: 10 });
    const user = profile.user;
    const primaryAddress = getPrimaryAddress(user?.address, user?.addresses);
    const [activeView, setActiveView] = useState<ProfileView>("dados");
    const [birthDate, setBirthDate] = useState<Date | undefined>();
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [isBirthCalendarOpen, setIsBirthCalendarOpen] = useState(false);
    const birthCalendarRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setActiveView(getInitialView());

        function handleHashChange() {
            setActiveView(getInitialView());
        }

        window.addEventListener("hashchange", handleHashChange);

        return () => {
            window.removeEventListener("hashchange", handleHashChange);
        };
    }, []);

    useEffect(() => {
        if (!user?.birthDate) {
            return;
        }

        const date = new Date(user.birthDate);
        if (Number.isNaN(date.getTime())) {
            return;
        }

        setBirthDate(date);
        setCalendarMonth(date);
    }, [user?.birthDate]);

    useEffect(() => {
        if (!isBirthCalendarOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                event.target instanceof Node &&
                birthCalendarRef.current?.contains(event.target)
            ) {
                return;
            }

            setIsBirthCalendarOpen(false);
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [isBirthCalendarOpen]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        await profile.updateProfile({
            name: getFormString(formData, "name"),
            email: getFormString(formData, "email"),
            document: cleanDigits(getFormString(formData, "document"), 11),
            phone: cleanDigits(getFormString(formData, "phone"), 11),
            birthDate: getFormString(formData, "birthDate"),
            address: buildAddressPayload(formData, primaryAddress?.uuid),
        });
    }

    function handleLogout() {
        clearAuthSession();
        router.push("/");
        router.refresh();
    }

    return (
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-12 font-public md:px-8">
            <div className="flex flex-col gap-12 md:flex-row">
                <aside className="w-full flex-shrink-0 self-start md:sticky md:top-28 md:w-64">
                    <div className="mb-8 px-2">
                        <h1 className="text-xl font-bold text-slate-900">
                            Minha Conta
                        </h1>
                        <p className="text-sm text-slate-500">
                            Gerencie seus dados e pedidos
                        </p>
                    </div>
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <Link
                                className={
                                    item.view === activeView
                                        ? "flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-sm transition-all"
                                        : "flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition-all hover:bg-slate-100"
                                }
                                href={item.href}
                                key={item.href}
                                onClick={() => setActiveView(item.view)}
                            >
                                <span
                                    className="material-symbols-outlined text-[20px]"
                                    style={
                                        item.view === activeView
                                            ? {
                                                  fontVariationSettings:
                                                      "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                                              }
                                            : undefined
                                    }
                                >
                                    {item.icon}
                                </span>
                                <span
                                    className={
                                        item.view === activeView
                                            ? "text-sm font-semibold"
                                            : "text-sm font-medium"
                                    }
                                >
                                    {item.label}
                                </span>
                            </Link>
                        ))}
                        <div className="mt-8 border-t border-slate-100 pt-8">
                            <button
                                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-red-500 transition-all hover:bg-red-50"
                                onClick={handleLogout}
                                type="button"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    logout
                                </span>
                                <span className="text-sm font-medium">
                                    Sair da conta
                                </span>
                            </button>
                        </div>
                    </nav>
                </aside>

                <section className="flex-grow">
                    {activeView === "dados" ? (
                        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:p-12">
                            <div className="mb-10 flex items-start justify-between gap-6">
                                <div>
                                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                                        Dados Pessoais
                                    </h2>
                                    <p className="mt-1 text-slate-500">
                                        Mantenha suas informações de contato
                                        atualizadas.
                                    </p>
                                </div>
                            </div>

                            {profile.error ? (
                                <p className="mb-8 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
                                    {profile.error}
                                </p>
                            ) : null}

                            <form
                                className="space-y-8"
                                key={user?.uuid ?? "empty-profile"}
                                onSubmit={handleSubmit}
                            >
                                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                            Nome Completo
                                        </label>
                                        <input
                                            className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                            defaultValue={user?.name ?? ""}
                                            name="name"
                                            placeholder={
                                                profile.isLoading
                                                    ? "Carregando..."
                                                    : "Seu nome"
                                            }
                                            type="text"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                            E-mail
                                        </label>
                                        <input
                                            className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                            defaultValue={user?.email ?? ""}
                                            name="email"
                                            placeholder={
                                                profile.isLoading
                                                    ? "Carregando..."
                                                    : "seu@email.com"
                                            }
                                            type="email"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                            CPF
                                        </label>
                                        <input
                                            className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                            defaultValue={formatCpf(
                                                user?.document ?? "",
                                            )}
                                            inputMode="numeric"
                                            maxLength={14}
                                            name="document"
                                            onChange={(event) => {
                                                event.currentTarget.value =
                                                    formatCpf(
                                                        event.currentTarget
                                                            .value,
                                                    );
                                            }}
                                            placeholder="123.456.789-00"
                                            type="text"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                            Telefone
                                        </label>
                                        <input
                                            className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                            defaultValue={formatPhone(
                                                user?.phone ?? "",
                                            )}
                                            inputMode="tel"
                                            maxLength={15}
                                            name="phone"
                                            onChange={(event) => {
                                                event.currentTarget.value =
                                                    formatPhone(
                                                        event.currentTarget
                                                            .value,
                                                    );
                                            }}
                                            placeholder="(11) 98765-4321"
                                            type="tel"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                            Data de Nascimento
                                        </label>
                                        <div
                                            className="relative"
                                            ref={birthCalendarRef}
                                        >
                                            <button
                                                className="flex w-full items-center justify-between rounded-2xl border-none bg-slate-50 px-5 py-4 text-left font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                                onClick={() =>
                                                    setIsBirthCalendarOpen(
                                                        (current) => !current,
                                                    )
                                                }
                                                type="button"
                                            >
                                                <span
                                                    className={
                                                        birthDate
                                                            ? "text-slate-800"
                                                            : "text-slate-400"
                                                    }
                                                >
                                                    {formatDateLabel(
                                                        birthDate,
                                                    ) || "12/08/1988"}
                                                </span>
                                                <span className="material-symbols-outlined text-slate-400">
                                                    calendar_today
                                                </span>
                                            </button>
                                            <input
                                                name="birthDate"
                                                type="hidden"
                                                value={formatDateValue(
                                                    birthDate,
                                                )}
                                            />
                                            {isBirthCalendarOpen ? (
                                                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl shadow-slate-200">
                                                    <div className="mb-4 flex items-center gap-2">
                                                        <button
                                                            aria-label="Mês anterior"
                                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
                                                            onClick={() =>
                                                                setCalendarMonth(
                                                                    (current) =>
                                                                        new Date(
                                                                            current.getFullYear(),
                                                                            current.getMonth() -
                                                                                1,
                                                                            1,
                                                                        ),
                                                                )
                                                            }
                                                            type="button"
                                                        >
                                                            <span className="material-symbols-outlined">
                                                                chevron_left
                                                            </span>
                                                        </button>
                                                        <select
                                                            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                                                            onChange={(event) =>
                                                                setCalendarMonth(
                                                                    (current) =>
                                                                        new Date(
                                                                            current.getFullYear(),
                                                                            Number(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            ),
                                                                            1,
                                                                        ),
                                                                )
                                                            }
                                                            value={calendarMonth.getMonth()}
                                                        >
                                                            {monthOptions.map(
                                                                (
                                                                    month,
                                                                    index,
                                                                ) => (
                                                                    <option
                                                                        key={
                                                                            month
                                                                        }
                                                                        value={
                                                                            index
                                                                        }
                                                                    >
                                                                        {month}
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                        <select
                                                            className="h-10 w-24 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900"
                                                            onChange={(event) =>
                                                                setCalendarMonth(
                                                                    (current) =>
                                                                        new Date(
                                                                            Number(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            ),
                                                                            current.getMonth(),
                                                                            1,
                                                                        ),
                                                                )
                                                            }
                                                            value={calendarMonth.getFullYear()}
                                                        >
                                                            {yearOptions.map(
                                                                (year) => (
                                                                    <option
                                                                        key={
                                                                            year
                                                                        }
                                                                        value={
                                                                            year
                                                                        }
                                                                    >
                                                                        {year}
                                                                    </option>
                                                                ),
                                                            )}
                                                        </select>
                                                        <button
                                                            aria-label="Próximo mês"
                                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100"
                                                            onClick={() =>
                                                                setCalendarMonth(
                                                                    (current) =>
                                                                        new Date(
                                                                            current.getFullYear(),
                                                                            current.getMonth() +
                                                                                1,
                                                                            1,
                                                                        ),
                                                                )
                                                            }
                                                            type="button"
                                                        >
                                                            <span className="material-symbols-outlined">
                                                                chevron_right
                                                            </span>
                                                        </button>
                                                    </div>
                                                    <Calendar
                                                        className="w-full border-0 p-0"
                                                        endMonth={new Date()}
                                                        formatters={{
                                                            formatWeekdayName: (
                                                                date,
                                                            ) =>
                                                                new Intl.DateTimeFormat(
                                                                    "pt-BR",
                                                                    {
                                                                        weekday:
                                                                            "short",
                                                                    },
                                                                )
                                                                    .format(
                                                                        date,
                                                                    )
                                                                    .replace(
                                                                        ".",
                                                                        "",
                                                                    ),
                                                        }}
                                                        mode="single"
                                                        month={calendarMonth}
                                                        onMonthChange={
                                                            setCalendarMonth
                                                        }
                                                        onSelect={(date) => {
                                                            setBirthDate(date);
                                                            if (date) {
                                                                setCalendarMonth(
                                                                    date,
                                                                );
                                                            }
                                                            setIsBirthCalendarOpen(
                                                                false,
                                                            );
                                                        }}
                                                        selected={birthDate}
                                                        startMonth={
                                                            new Date(1920, 0)
                                                        }
                                                    />
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-50 pt-8">
                                    <div className="mb-8">
                                        <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
                                            Endereço
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Cadastre o endereço principal para
                                            entregas do Ateliê.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                Rua
                                            </label>
                                            <input
                                                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                                defaultValue={
                                                    primaryAddress?.street ?? ""
                                                }
                                                name="street"
                                                placeholder="Rua das Oliveiras"
                                                type="text"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                Número
                                            </label>
                                            <input
                                                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                                defaultValue={
                                                    primaryAddress?.number ?? ""
                                                }
                                                name="number"
                                                placeholder="123"
                                                type="text"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                Bairro
                                            </label>
                                            <input
                                                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                                defaultValue={
                                                    primaryAddress?.neighborhood ??
                                                    ""
                                                }
                                                name="neighborhood"
                                                placeholder="Centro"
                                                type="text"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                CEP
                                            </label>
                                            <input
                                                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                                defaultValue={formatCep(
                                                    primaryAddress?.zipCode ??
                                                        "",
                                                )}
                                                inputMode="numeric"
                                                maxLength={9}
                                                name="zipCode"
                                                onChange={(event) => {
                                                    event.currentTarget.value =
                                                        formatCep(
                                                            event.currentTarget
                                                                .value,
                                                        );
                                                }}
                                                placeholder="01001-000"
                                                type="text"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                Estado
                                            </label>
                                            <input
                                                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                                defaultValue={
                                                    primaryAddress?.state ?? ""
                                                }
                                                name="state"
                                                placeholder="SP"
                                                type="text"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                País
                                            </label>
                                            <input
                                                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                                defaultValue={
                                                    primaryAddress?.country ??
                                                    ""
                                                }
                                                name="country"
                                                placeholder="Brasil"
                                                type="text"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                Cidade
                                            </label>
                                            <input
                                                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                                defaultValue={
                                                    primaryAddress?.city ?? ""
                                                }
                                                name="city"
                                                placeholder="São Paulo"
                                                type="text"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                Apartamento
                                            </label>
                                            <input
                                                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                                defaultValue={
                                                    primaryAddress?.apartmentNumber ??
                                                    ""
                                                }
                                                name="apartmentNumber"
                                                placeholder="Apto 12"
                                                type="text"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                Complemento
                                            </label>
                                            <input
                                                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                                defaultValue={
                                                    primaryAddress?.complement ??
                                                    ""
                                                }
                                                name="complement"
                                                placeholder="Apto, bloco ou referência"
                                                type="text"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 flex flex-col items-center gap-4 border-t border-slate-50 pt-6 sm:flex-row">
                                    <button
                                        className="w-full rounded-2xl bg-slate-900 px-10 py-4 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 sm:w-auto"
                                        disabled={profile.isSubmitting}
                                        type="submit"
                                    >
                                        {profile.isSubmitting
                                            ? "Salvando..."
                                            : "Salvar Alterações"}
                                    </button>
                                    <button
                                        className="w-full px-10 py-4 font-bold text-slate-500 transition-all hover:text-slate-900 sm:w-auto"
                                        type="button"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : null}

                    {activeView === "pedidos" ? (
                        <div className="space-y-5">
                            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:p-12">
                                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                                    <div>
                                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                                            Meus Pedidos
                                        </h2>
                                        <p className="mt-1 text-slate-500">
                                            Acompanhe status, itens e entrega
                                            dos pedidos recentes.
                                        </p>
                                    </div>
                                    <span className="w-fit rounded-full bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                                        {orders.data.length} pedidos
                                    </span>
                                </div>

                                {orders.error ? (
                                    <p className="rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
                                        {orders.error}
                                    </p>
                                ) : null}

                                {orders.isLoading ? (
                                    <div className="space-y-4">
                                        {[0, 1, 2].map((item) => (
                                            <div
                                                className="h-44 animate-pulse rounded-3xl bg-slate-50"
                                                key={item}
                                            />
                                        ))}
                                    </div>
                                ) : null}

                                {!orders.isLoading && !orders.data.length ? (
                                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-300">
                                            shopping_bag
                                        </span>
                                        <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                                            Nenhum pedido recente
                                        </h3>
                                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                            Quando uma compra for finalizada,
                                            ela aparece aqui com status,
                                            endereço, pagamento e itens.
                                        </p>
                                    </div>
                                ) : null}

                                <div className="space-y-4">
                                    {orders.data.map((order) => (
                                        <article
                                            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-50 md:p-6"
                                            key={order.uuid}
                                        >
                                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                        Pedido
                                                    </p>
                                                    <h3 className="mt-1 text-xl font-extrabold text-slate-900">
                                                        #
                                                        {order.uuid.slice(0, 8)}
                                                    </h3>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        {new Date(
                                                            order.createdAt,
                                                        ).toLocaleDateString(
                                                            "pt-BR",
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <span
                                                        className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest ring-1 ${
                                                            orderStatusClasses[
                                                                order.status
                                                            ] ??
                                                            "bg-slate-50 text-slate-600 ring-slate-200"
                                                        }`}
                                                    >
                                                        {orderStatusLabels[
                                                            order.status
                                                        ] ?? order.status}
                                                    </span>
                                                    <span className="text-lg font-extrabold text-slate-900">
                                                        {formatCurrency(
                                                            order.totalInCents,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                                                <div className="rounded-2xl bg-slate-50 p-4">
                                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                        Itens pedidos
                                                    </p>
                                                    <div className="mt-3 space-y-3">
                                                        {order.items.map(
                                                            (item) => (
                                                                <div
                                                                    className="flex items-center justify-between gap-4 text-sm"
                                                                    key={
                                                                        item.uuid
                                                                    }
                                                                >
                                                                    <div>
                                                                        <p className="font-bold text-slate-800">
                                                                            {
                                                                                item.productNameSnapshot
                                                                            }
                                                                        </p>
                                                                        <p className="text-slate-500">
                                                                            {
                                                                                item.quantity
                                                                            }
                                                                            x{" "}
                                                                            {
                                                                                item.grams
                                                                            }
                                                                            g
                                                                        </p>
                                                                    </div>
                                                                    <p className="font-bold text-slate-900">
                                                                        {formatCurrency(
                                                                            item.totalPriceInCents,
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid gap-4">
                                                    <div className="rounded-2xl bg-slate-50 p-4">
                                                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                            Endereço de entrega
                                                        </p>
                                                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                                                            {formatAddress(
                                                                order,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-2xl bg-slate-50 p-4">
                                                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                                            Método de pagamento
                                                        </p>
                                                        <p className="mt-2 text-sm font-semibold text-slate-700">
                                                            {formatPaymentMethod(
                                                                order as ProfileOrder,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {activeView === "pagamento" ? (
                        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:p-12">
                            <div className="mb-10">
                                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                                    Informações de Pagamento
                                </h2>
                                <p className="mt-1 text-slate-500">
                                    Métodos salvos ainda não estão disponíveis.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-300">
                                    payments
                                </span>
                                <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                                    Sem métodos salvos
                                </h3>
                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                    Por enquanto, escolha Pix, crédito ou débito
                                    ao finalizar o pedido.
                                </p>
                            </div>
                        </div>
                    ) : null}
                </section>
            </div>
        </main>
    );
}
