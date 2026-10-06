"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ProfileDataView } from "@/components/profile/profile-data-view";
import { ProfileOrdersView } from "@/components/profile/profile-orders-view";
import { FeedbackDialog } from "@/components/shared/feedback-dialog";
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
    const [ordersPage, setOrdersPage] = useState(1);
    const orders = useOrders([], {
        scope: "me",
        page: ordersPage,
        pageSize: 10,
    });
    const user = profile.user;
    const primaryAddress = getPrimaryAddress(user?.address, user?.addresses);
    const [activeView, setActiveView] = useState<ProfileView>("dados");
    const [birthDate, setBirthDate] = useState<Date | undefined>();
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [isBirthCalendarOpen, setIsBirthCalendarOpen] = useState(false);
    const [isCepLoading, setIsCepLoading] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [pendingDestination, setPendingDestination] = useState<
        { type: "href"; href: string } | { type: "logout" } | null
    >(null);
    const [feedback, setFeedback] = useState<{
        title: string;
        description: string;
    } | null>(null);
    const [dismissedError, setDismissedError] = useState<string | null>(null);
    const profileFormRef = useRef<HTMLFormElement | null>(null);
    const birthCalendarRef = useRef<HTMLDivElement | null>(null);
    const lastCepRequestRef = useRef("");
    const resourceError = profile.error ?? orders.error;

    useEffect(() => {
        function syncViewWithHash() {
            const view = getInitialView();
            setActiveView(view);

            if (window.location.hash && window.location.hash !== "#pedidos") {
                window.history.replaceState(null, "", "/perfil");
            }
        }

        syncViewWithHash();

        function handleHashChange() {
            syncViewWithHash();
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

    useEffect(() => {
        if (!isDirty) return;

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
        }

        function handleLinkClick(event: MouseEvent) {
            if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
            ) {
                return;
            }

            const target = event.target;
            const anchor =
                target instanceof Element ? target.closest("a[href]") : null;
            if (!(anchor instanceof HTMLAnchorElement) || anchor.target) return;

            const destination = new URL(anchor.href, window.location.href);
            if (destination.origin !== window.location.origin) return;

            const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            const href = `${destination.pathname}${destination.search}${destination.hash}`;
            if (href === current) return;

            event.preventDefault();
            event.stopPropagation();
            setPendingDestination({ type: "href", href });
        }

        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("click", handleLinkClick, true);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener("click", handleLinkClick, true);
        };
    }, [isDirty]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setDismissedError(null);
        const formData = new FormData(event.currentTarget);
        const documentDigits = onlyDigits(
            String(formData.get("document") ?? ""),
            14,
        );

        if (
            documentDigits &&
            documentDigits.length !== 11 &&
            documentDigits.length !== 14
        ) {
            setFeedback({
                title: "Confira o CPF ou CNPJ",
                description:
                    "Informe um CPF com 11 dígitos ou um CNPJ com 14 dígitos.",
            });
            return;
        }

        const payload = buildDirtyProfilePayload(
            formData,
            user,
            primaryAddress,
        );

        if (Object.keys(payload).length === 0) {
            return;
        }

        const updatedUser = await profile.updateProfile(payload);

        if (updatedUser) {
            setIsDirty(false);
            setFeedback({
                title: "Dados atualizados",
                description: payload.address
                    ? "Seus dados e endereço foram atualizados com sucesso."
                    : "Seus dados foram atualizados com sucesso.",
            });
        }
    }

    function setAddressField(name: string, value: string) {
        const field = profileFormRef.current?.elements.namedItem(name);

        if (field instanceof HTMLInputElement) {
            field.value = value;
            setIsDirty(true);
        }
    }

    function handleProfileChange() {
        if (!profileFormRef.current) return;

        const payload = buildDirtyProfilePayload(
            new FormData(profileFormRef.current),
            user,
            primaryAddress,
        );
        setIsDirty(Object.keys(payload).length > 0);
    }

    function handleCancel() {
        profileFormRef.current?.reset();
        const initialBirthDate = user?.birthDate
            ? new Date(user.birthDate)
            : undefined;
        setBirthDate(initialBirthDate);
        if (initialBirthDate && !Number.isNaN(initialBirthDate.getTime())) {
            setCalendarMonth(initialBirthDate);
        }
        setIsBirthCalendarOpen(false);
        setIsDirty(false);
    }

    async function handleZipCodeChange(value: string) {
        const cepLimpo = onlyDigits(value, 8);
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
                setFeedback({
                    title: "CEP não encontrado",
                    description:
                        "Confira os números informados e tente novamente.",
                });
                return;
            }

            setAddressField("street", (payload.logradouro ?? "").slice(0, 30));
            setAddressField("neighborhood", payload.bairro ?? "");
            setAddressField("city", payload.localidade ?? "");
            setAddressField("state", payload.uf ?? "");
            setAddressField("country", "Brasil");
        } catch {
            if (lastCepRequestRef.current === cepLimpo) {
                setFeedback({
                    title: "Não foi possível consultar o CEP",
                    description:
                        "Confira sua conexão e tente novamente em instantes.",
                });
            }
        } finally {
            if (lastCepRequestRef.current === cepLimpo) {
                setIsCepLoading(false);
            }
        }
    }

    function handleLogout() {
        if (isDirty) {
            setPendingDestination({ type: "logout" });
            return;
        }

        clearAuthSession();
        router.push("/");
        router.refresh();
    }

    function confirmLeave() {
        const destination = pendingDestination;
        setPendingDestination(null);
        setIsDirty(false);

        if (destination?.type === "logout") {
            clearAuthSession();
            router.push("/");
            router.refresh();
            return;
        }

        if (destination?.type === "href") {
            router.push(destination.href);
            if (destination.href.endsWith("#pedidos")) {
                setActiveView("pedidos");
            } else if (destination.href === "/perfil") {
                setActiveView("dados");
            }
        }
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
                                aria-current={
                                    item.view === activeView
                                        ? "page"
                                        : undefined
                                }
                            >
                                <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined text-xl"
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
                                <span
                                    aria-hidden="true"
                                    className="material-symbols-outlined text-xl"
                                >
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
                            isBirthCalendarOpen={isBirthCalendarOpen}
                            isCepLoading={isCepLoading}
                            isDirty={isDirty}
                            isLoading={profile.isLoading}
                            isSubmitting={profile.isSubmitting}
                            onCancel={handleCancel}
                            onChange={handleProfileChange}
                            onDirty={() => setIsDirty(true)}
                            onSubmit={handleSubmit}
                            onZipCodeChange={(value) => {
                                void handleZipCodeChange(value);
                            }}
                            primaryAddress={primaryAddress}
                            profileFormRef={profileFormRef}
                            setBirthDate={setBirthDate}
                            setCalendarMonth={setCalendarMonth}
                            setIsBirthCalendarOpen={setIsBirthCalendarOpen}
                            user={user}
                        />
                    ) : null}

                    {activeView === "pedidos" ? (
                        <ProfileOrdersView
                            isLoading={orders.isLoading}
                            onPageChange={setOrdersPage}
                            orders={orders.data}
                            pagination={orders.pagination}
                        />
                    ) : null}
                </section>
            </div>
            <FeedbackDialog
                description={feedback?.description ?? resourceError ?? ""}
                onOpenChange={(open) => {
                    if (open) return;

                    if (feedback) {
                        setFeedback(null);
                    } else {
                        setDismissedError(resourceError);
                    }
                }}
                open={
                    Boolean(feedback) ||
                    Boolean(resourceError && resourceError !== dismissedError)
                }
                title={feedback?.title ?? "Não foi possível carregar os dados"}
            />
            <FeedbackDialog
                confirmLabel="Sair sem salvar"
                description="Há alterações que ainda não foram salvas. Se você sair agora, elas serão perdidas."
                onConfirm={confirmLeave}
                onOpenChange={(open) => {
                    if (!open) setPendingDestination(null);
                }}
                open={Boolean(pendingDestination)}
                secondaryLabel="Continuar editando"
                title="Descartar alterações?"
            />
        </main>
    );
}
