"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ProfileDataView } from "@/components/profile/profile-data-view";
import { ProfileOrdersView } from "@/components/profile/profile-orders-view";
import { ProfilePaymentView } from "@/components/profile/profile-payment-view";
import {
    buildDirtyProfilePayload,
    fetchViaCepAddress,
    getInitialView,
    getPrimaryAddress,
    navItems,
    onlyDigits,
    type ProfileView,
} from "@/components/profile/profile-page-helpers";
import { useOrders } from "@/hooks/use-orders";
import { useProfile } from "@/hooks/use-profile";
import { clearAuthSession } from "@/lib/auth-session";

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
    const [isCepLoading, setIsCepLoading] = useState(false);
    const [cepError, setCepError] = useState<string | null>(null);
    const [successToast, setSuccessToast] = useState<string | null>(null);
    const profileFormRef = useRef<HTMLFormElement | null>(null);
    const birthCalendarRef = useRef<HTMLDivElement | null>(null);
    const lastCepRequestRef = useRef("");

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
        const payload = buildDirtyProfilePayload(
            formData,
            user,
            primaryAddress,
        );

        if (Object.keys(payload).length === 0) {
            return;
        }

        const updatedUser = await profile.updateProfile(payload);

        if (updatedUser && payload.address) {
            setSuccessToast("Endereço atualizado com sucesso.");
            window.setTimeout(() => setSuccessToast(null), 3500);
        }
    }

    function setAddressField(name: string, value: string) {
        const field = profileFormRef.current?.elements.namedItem(name);

        if (field instanceof HTMLInputElement) {
            field.value = value;
        }
    }

    async function handleZipCodeChange(value: string) {
        const cepLimpo = onlyDigits(value, 8);
        setCepError(null);

        if (cepLimpo.length !== 8) {
            lastCepRequestRef.current = "";
            setIsCepLoading(false);
            return;
        }

        lastCepRequestRef.current = cepLimpo;
        setIsCepLoading(true);

        try {
            const payload = await fetchViaCepAddress(cepLimpo);

            if (lastCepRequestRef.current !== cepLimpo) {
                return;
            }

            if (!payload) {
                setCepError("CEP não encontrado.");
                return;
            }

            setAddressField("street", payload.logradouro ?? "");
            setAddressField("neighborhood", payload.bairro ?? "");
            setAddressField("city", payload.localidade ?? "");
            setAddressField("state", payload.uf ?? "");
            setAddressField("country", "Brasil");
        } catch {
            if (lastCepRequestRef.current === cepLimpo) {
                setCepError("Não foi possível consultar o CEP.");
            }
        } finally {
            if (lastCepRequestRef.current === cepLimpo) {
                setIsCepLoading(false);
            }
        }
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
                        <ProfileDataView
                            birthCalendarRef={birthCalendarRef}
                            birthDate={birthDate}
                            calendarMonth={calendarMonth}
                            cepError={cepError}
                            error={profile.error}
                            isBirthCalendarOpen={isBirthCalendarOpen}
                            isCepLoading={isCepLoading}
                            isLoading={profile.isLoading}
                            isSubmitting={profile.isSubmitting}
                            onSubmit={handleSubmit}
                            onZipCodeChange={(value) => {
                                void handleZipCodeChange(value);
                            }}
                            primaryAddress={primaryAddress}
                            profileFormRef={profileFormRef}
                            setBirthDate={setBirthDate}
                            setCalendarMonth={setCalendarMonth}
                            setIsBirthCalendarOpen={setIsBirthCalendarOpen}
                            successToast={successToast}
                            user={user}
                        />
                    ) : null}

                    {activeView === "pedidos" ? (
                        <ProfileOrdersView
                            error={orders.error}
                            isLoading={orders.isLoading}
                            orders={orders.data}
                        />
                    ) : null}

                    {/* {activeView === "pagamento" ? <ProfilePaymentView /> : null} */}
                </section>
            </div>
        </main>
    );
}
