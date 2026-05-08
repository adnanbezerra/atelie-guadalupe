"use client";

import type {
    Dispatch,
    FormEventHandler,
    RefObject,
    SetStateAction,
} from "react";
import { Calendar } from "@/components/ui/calendar";
import type { Address, User } from "@/lib/types";
import {
    formatCep,
    formatCpf,
    formatDateLabel,
    formatDateValue,
    formatPhone,
    monthOptions,
    yearOptions,
} from "@/components/profile/profile-page-helpers";

type ProfileDataViewProps = {
    user: User | null;
    primaryAddress: Address | null;
    error: string | null;
    isLoading: boolean;
    isSubmitting: boolean;
    birthDate?: Date;
    calendarMonth: Date;
    isBirthCalendarOpen: boolean;
    isCepLoading: boolean;
    cepError: string | null;
    successToast: string | null;
    profileFormRef: RefObject<HTMLFormElement | null>;
    birthCalendarRef: RefObject<HTMLDivElement | null>;
    onSubmit: FormEventHandler<HTMLFormElement>;
    onZipCodeChange: (value: string) => void;
    setBirthDate: Dispatch<SetStateAction<Date | undefined>>;
    setCalendarMonth: Dispatch<SetStateAction<Date>>;
    setIsBirthCalendarOpen: Dispatch<SetStateAction<boolean>>;
};

export function ProfileDataView({
    user,
    primaryAddress,
    error,
    isLoading,
    isSubmitting,
    birthDate,
    calendarMonth,
    isBirthCalendarOpen,
    isCepLoading,
    cepError,
    successToast,
    profileFormRef,
    birthCalendarRef,
    onSubmit,
    onZipCodeChange,
    setBirthDate,
    setCalendarMonth,
    setIsBirthCalendarOpen,
}: ProfileDataViewProps) {
    return (
        <div className="relative rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:p-12">
            {successToast ? (
                <div
                    className="fixed right-4 top-24 z-50 flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-2xl shadow-slate-200 md:right-8"
                    role="status"
                >
                    <span className="material-symbols-outlined text-emerald-600">
                        check_circle
                    </span>
                    {successToast}
                </div>
            ) : null}

            <div className="mb-10 flex items-start justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                        Dados Pessoais
                    </h2>
                    <p className="mt-1 text-slate-500">
                        Mantenha suas informações de contato atualizadas.
                    </p>
                </div>
            </div>

            {error ? (
                <p className="mb-8 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
                    {error}
                </p>
            ) : null}

            <form
                className="space-y-8"
                key={user?.uuid ?? "empty-profile"}
                onSubmit={onSubmit}
                ref={profileFormRef}
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
                                isLoading ? "Carregando..." : "Seu nome"
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
                                isLoading ? "Carregando..." : "seu@email.com"
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
                            defaultValue={formatCpf(user?.document ?? "")}
                            inputMode="numeric"
                            maxLength={14}
                            name="document"
                            onChange={(event) => {
                                event.currentTarget.value = formatCpf(
                                    event.currentTarget.value,
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
                            defaultValue={formatPhone(user?.phone ?? "")}
                            inputMode="tel"
                            maxLength={15}
                            name="phone"
                            onChange={(event) => {
                                event.currentTarget.value = formatPhone(
                                    event.currentTarget.value,
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
                        <div className="relative" ref={birthCalendarRef}>
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
                                    {formatDateLabel(birthDate) || "12/08/1988"}
                                </span>
                                <span className="material-symbols-outlined text-slate-400">
                                    calendar_today
                                </span>
                            </button>
                            <input
                                name="birthDate"
                                type="hidden"
                                value={formatDateValue(birthDate)}
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
                                                                event.target
                                                                    .value,
                                                            ),
                                                            1,
                                                        ),
                                                )
                                            }
                                            value={calendarMonth.getMonth()}
                                        >
                                            {monthOptions.map(
                                                (month, index) => (
                                                    <option
                                                        key={month}
                                                        value={index}
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
                                                                event.target
                                                                    .value,
                                                            ),
                                                            current.getMonth(),
                                                            1,
                                                        ),
                                                )
                                            }
                                            value={calendarMonth.getFullYear()}
                                        >
                                            {yearOptions.map((year) => (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            ))}
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
                                            formatWeekdayName: (date) =>
                                                new Intl.DateTimeFormat(
                                                    "pt-BR",
                                                    {
                                                        weekday: "short",
                                                    },
                                                )
                                                    .format(date)
                                                    .replace(".", ""),
                                        }}
                                        mode="single"
                                        month={calendarMonth}
                                        onMonthChange={setCalendarMonth}
                                        onSelect={(date) => {
                                            setBirthDate(date);
                                            if (date) {
                                                setCalendarMonth(date);
                                            }
                                            setIsBirthCalendarOpen(false);
                                        }}
                                        selected={birthDate}
                                        startMonth={new Date(1920, 0)}
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
                            Cadastre o endereço principal para entregas do
                            Ateliê.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <div className="flex items-center justify-between gap-4 px-1">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                    CEP
                                </label>
                                {isCepLoading ? (
                                    <span className="text-xs font-semibold text-slate-400">
                                        Buscando endereço...
                                    </span>
                                ) : null}
                            </div>
                            <input
                                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                                defaultValue={formatCep(
                                    primaryAddress?.zipCode ?? "",
                                )}
                                inputMode="numeric"
                                maxLength={9}
                                name="zipCode"
                                onChange={(event) => {
                                    event.currentTarget.value = formatCep(
                                        event.currentTarget.value,
                                    );
                                    onZipCodeChange(event.currentTarget.value);
                                }}
                                placeholder="01001-000"
                                type="text"
                            />
                            {cepError ? (
                                <p className="px-1 text-xs font-semibold text-red-500">
                                    {cepError}
                                </p>
                            ) : null}
                        </div>

                        <AddressInput
                            defaultValue={primaryAddress?.street ?? ""}
                            label="Rua"
                            name="street"
                            placeholder="Rua das Oliveiras"
                            wide
                        />
                        <AddressInput
                            defaultValue={primaryAddress?.number ?? ""}
                            label="Número"
                            name="number"
                            placeholder="123"
                        />
                        <AddressInput
                            defaultValue={primaryAddress?.neighborhood ?? ""}
                            label="Bairro"
                            name="neighborhood"
                            placeholder="Centro"
                        />
                        <AddressInput
                            defaultValue={primaryAddress?.state ?? ""}
                            label="Estado"
                            name="state"
                            placeholder="SP"
                        />
                        <AddressInput
                            defaultValue={primaryAddress?.country ?? ""}
                            label="País"
                            name="country"
                            placeholder="Brasil"
                        />
                        <AddressInput
                            defaultValue={primaryAddress?.city ?? ""}
                            label="Cidade"
                            name="city"
                            placeholder="São Paulo"
                        />
                        <AddressInput
                            defaultValue={primaryAddress?.complement ?? ""}
                            label="Complemento"
                            name="complement"
                            placeholder="Apto, bloco ou referência"
                        />
                    </div>
                </div>

                <div className="mt-10 flex flex-col items-center gap-4 border-t border-slate-50 pt-6 sm:flex-row">
                    <button
                        className="w-full rounded-2xl bg-slate-900 px-10 py-4 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 sm:w-auto"
                        disabled={isSubmitting}
                        type="submit"
                    >
                        {isSubmitting ? "Salvando..." : "Salvar Alterações"}
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
    );
}

function AddressInput({
    defaultValue,
    label,
    name,
    placeholder,
    wide,
}: {
    defaultValue: string;
    label: string;
    name: string;
    placeholder: string;
    wide?: boolean;
}) {
    return (
        <div className={wide ? "space-y-2 md:col-span-2" : "space-y-2"}>
            <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {label}
            </label>
            <input
                className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium text-slate-800 transition-all focus:ring-2 focus:ring-slate-900"
                defaultValue={defaultValue}
                name={name}
                placeholder={placeholder}
                type="text"
            />
        </div>
    );
}
