"use client";

import Link from "next/link";
import { useProductCatalog, useProductLines } from "@/hooks/use-products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { Skeleton } from "@/components/ui/skeleton";
import { firstPriceInCents, formatCurrency } from "@/lib/utils";

const heroImages = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAivgAEmKgpjW-wT8pfHxE1eiEQxhZaT3EPrRTHf96grXE05DQEDfOXC8Pt-2IwNT3207NdubuzDD4XmSUlWxIfTmbaM0BkMvHMqvWGyxRcjzXn2cnM8JliEfCgo4CacbjPb_akkkfGty3a78SSFYehVSUUK_g7n32E7EMJYKsdS6-po5gXNpSWMJT8_grJOMlTRiByZQHtIdYFJv-3_8H9-_LQU0uKwU7L8O3HxgZvHIXzy-_92nx8wrolsQ_ytwOVYyWG6s051Xee",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAA7OuOGNrTthlijfwKWCNTjrKcGBfOCwbGVphviKgQOxho_GDdHTD1thjyOiv4c_izz8e0xaXQ-limWOPlU2vXLh7KGTmpSHC_9EcxX2CDFj3E7neX5umsdnhH62AQtr2E6jgSAlW7a6lr4K2xfExu4Pb_7L95bsP5ZsSB2FmhXcFulEIjT-CRp-33jK-UOxqYi_XFibKUG3mY2H3INCkXPFidU_qztLQjnq5lHmA44jcTCpgu5Nvm0Jia3Wfv40AV85eOtNf9h7Kv",
];

export function HomePageClient() {
    const { data, isLoading, error } = useProductCatalog({
        page: 1,
        pageSize: 6,
    });
    const { lines } = useProductLines();

    return (
        <>
            <section className="relative overflow-hidden px-4 pb-24 pt-12 sm:px-6 lg:px-8">
                <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
                    <Card className="overflow-hidden border-none bg-[linear-gradient(135deg,rgba(255,249,240,0.88),rgba(255,255,255,0.72))] p-8 sm:p-12">
                        <Badge className="bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                            Tradição e Oração
                        </Badge>
                        <h1 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-none text-[var(--color-foreground)] sm:text-7xl">
                            A harmonia da criação como dom cotidiano.
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">
                            O novo frontend traduz as telas do Stitch para uma
                            experiência contemplativa, com catálogo botânico,
                            artes sacras e integração com a API do ateliê.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-4">
                            <Link href="/beleza-natural">
                                <Button size="lg">Beleza da Criação</Button>
                            </Link>
                            <Link href="/artesanato">
                                <Button size="lg" variant="secondary">
                                    Explorar Artesanato
                                </Button>
                            </Link>
                        </div>
                        <div className="mt-12 grid gap-4 sm:grid-cols-3">
                            <Card className="bg-white/75 p-5">
                                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                                    Fórmulas
                                </p>
                                <p className="mt-2 font-display text-3xl font-semibold">
                                    100%
                                </p>
                                <p className="mt-1 text-sm text-[var(--color-muted)]">
                                    foco em cuidado natural e ritual.
                                </p>
                            </Card>
                            <Card className="bg-white/75 p-5">
                                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                                    Catálogo
                                </p>
                                <p className="mt-2 font-display text-3xl font-semibold">
                                    {data?.pagination.total ?? 0}
                                </p>
                                <p className="mt-1 text-sm text-[var(--color-muted)]">
                                    itens vindos da API.
                                </p>
                            </Card>
                            <Card className="bg-white/75 p-5">
                                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                                    Linhas
                                </p>
                                <p className="mt-2 font-display text-3xl font-semibold">
                                    {lines.length}
                                </p>
                                <p className="mt-1 text-sm text-[var(--color-muted)]">
                                    coleções disponíveis.
                                </p>
                            </Card>
                        </div>
                    </Card>
                    <div className="grid gap-6">
                        {heroImages.map((image, index) => (
                            <Card className="overflow-hidden p-0" key={image}>
                                <div className="relative min-h-[280px]">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{
                                            backgroundImage: `url(${image})`,
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(44,31,14,0.72))]" />
                                    <div className="relative flex min-h-[280px] items-end p-6 text-white">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.25em] text-white/70">
                                                {index === 0
                                                    ? "Beleza Natural"
                                                    : "Artesanato"}
                                            </p>
                                            <p className="mt-2 font-display text-3xl font-semibold">
                                                {index === 0
                                                    ? "Botica & Cremes personalizados"
                                                    : "Cerâmica, devoção e matéria viva"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                        <div>
                            <Badge className="bg-white text-[var(--color-primary)]">
                                Destaques do catálogo
                            </Badge>
                            <h2 className="mt-4 font-display text-4xl font-semibold">
                                Produtos puxados da API
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                                Esta seção depende do backend. Durante o
                                carregamento, exibimos skeletons para manter a
                                página fluida.
                            </p>
                        </div>
                        <Link href="/beleza-natural">
                            <Button variant="outline">
                                Ver catálogo completo
                            </Button>
                        </Link>
                    </div>

                    {error ? (
                        <div className="mt-8">
                            <ErrorState
                                description={error}
                                title="Não foi possível carregar os destaques."
                            />
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <Card
                                    className="overflow-hidden p-0"
                                    key={index}
                                >
                                    <Skeleton className="h-64 rounded-none" />
                                    <div className="space-y-4 p-6">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-8 w-3/4" />
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-2/3" />
                                        <Skeleton className="h-11 w-full" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : null}

                    {!isLoading && !error && data?.items.length === 0 ? (
                        <div className="mt-8">
                            <EmptyState
                                description="Nenhum produto ativo retornou do backend. Assim que houver itens na API, eles aparecem aqui automaticamente."
                                title="Sem produtos em destaque"
                            />
                        </div>
                    ) : null}

                    {!isLoading && !error && data?.items.length ? (
                        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {data.items.map((product) => (
                                <Card
                                    className="overflow-hidden p-0"
                                    key={product.uuid}
                                >
                                    <div
                                        className="h-64 bg-cover bg-center"
                                        style={{
                                            backgroundImage: `url(${product.imageUrl})`,
                                        }}
                                    />
                                    <div className="p-6">
                                        <Badge className="bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                                            {product.line.name}
                                        </Badge>
                                        <h3 className="mt-4 font-display text-3xl font-semibold">
                                            {product.name}
                                        </h3>
                                        <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                                            {product.shortDescription}
                                        </p>
                                        <div className="mt-5 flex items-center justify-between">
                                            <p className="text-lg font-semibold text-[var(--color-primary)]">
                                                {formatCurrency(
                                                    firstPriceInCents(
                                                        product.priceOptions,
                                                    ),
                                                )}
                                            </p>
                                            <Link href="/carrinho">
                                                <Button size="sm">
                                                    Adicionar
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : null}
                </div>
            </section>
        </>
    );
}
