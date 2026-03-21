import Link from "next/link";
import { HomeCollections } from "@/components/site/home-collections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import {
    getCollectionCopy,
    getFeaturedCollections,
    getHeroHighlights,
} from "@/lib/catalog";
import { fetchProductLines, fetchProducts } from "@/lib/server-api";

export default async function HomePage() {
    const [linesResult, productsResult] = await Promise.allSettled([
        fetchProductLines(),
        fetchProducts({ page: 1, pageSize: 18 }),
    ]);

    const lines =
        linesResult.status === "fulfilled" ? linesResult.value.lines : [];
    const products =
        productsResult.status === "fulfilled" ? productsResult.value.items : [];
    const collections = getFeaturedCollections(products);
    const highlights = getHeroHighlights(products);
    const beautyCopy = getCollectionCopy("beauty");
    const craftCopy = getCollectionCopy("crafts");

    return (
        <div className="min-h-screen">
            <SiteHeader lines={lines} />
            <main>
                <section className="px-4 pt-8 sm:px-6 lg:px-8">
                    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(25,64,179,0.96),rgba(10,23,74,0.96))] p-8 text-white shadow-2xl shadow-primary/15 md:p-12">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(209,160,84,0.24),transparent_28%)]" />
                            <div className="relative max-w-2xl">
                                <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                                    Tradicao e Criacao
                                </span>
                                <h1 className="mt-6 font-display text-4xl font-bold leading-tight md:text-6xl">
                                    Beleza botânica e arte sacra feitas com
                                    intenção.
                                </h1>
                                <p className="mt-6 max-w-xl text-base leading-8 text-white/80 md:text-lg">
                                    O Ateliê Guadalupe une cuidado pessoal,
                                    ofício manual e um catálogo sensível para
                                    casa, presentes e devoção.
                                </p>
                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <Link
                                        href="/beleza-natural"
                                        className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg"
                                    >
                                        Explorar beleza natural
                                    </Link>
                                    <Link
                                        href="/artesanato"
                                        className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white"
                                    >
                                        Conhecer o artesanato
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-6">
                            <div className="glass-panel relative overflow-hidden rounded-[2rem] border border-white/70 p-6 shadow-xl">
                                <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#d1a054,#1940b3)]" />
                                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
                                    Creme Personalizado
                                </p>
                                <h2 className="mt-4 font-display text-3xl font-bold text-slate-900">
                                    Formula feita para a sua rotina.
                                </h2>
                                <p className="mt-4 text-sm leading-7 text-slate-600">
                                    A tela do Stitch pede um fluxo de cuidado
                                    autoral. Enquanto o endpoint de customizacao
                                    nao chega, destacamos os produtos com maior
                                    aderencia para inspirar o pedido especial.
                                </p>
                                <div className="mt-6 space-y-3">
                                    {highlights.map((item) => (
                                        <div
                                            key={item.uuid}
                                            className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-3"
                                        >
                                            <div className="size-14 overflow-hidden rounded-2xl bg-slate-100">
                                                {item.imageUrl ? (
                                                    <img
                                                        alt={item.name}
                                                        className="h-full w-full object-cover"
                                                        src={item.imageUrl}
                                                    />
                                                ) : null}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-900">
                                                    {item.name}
                                                </p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {item.shortDescription}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-[2rem] border border-primary/10 bg-[linear-gradient(145deg,#fffdf9,#efe7da)] p-6 shadow-lg">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    {[
                                        {
                                            label: "Colecao",
                                            value: beautyCopy.title,
                                            tone: "bg-primary/10 text-primary",
                                        },
                                        {
                                            label: "Colecao",
                                            value: craftCopy.title,
                                            tone: "bg-secondary/20 text-amber-800",
                                        },
                                        {
                                            label: "Linhas",
                                            value: `${lines.length || 0} ativas`,
                                            tone: "bg-slate-100 text-slate-700",
                                        },
                                    ].map((stat) => (
                                        <div
                                            key={stat.label + stat.value}
                                            className="rounded-2xl border border-white/70 bg-white/80 p-4"
                                        >
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${stat.tone}`}
                                            >
                                                {stat.label}
                                            </span>
                                            <p className="mt-4 font-display text-xl font-bold text-slate-900">
                                                {stat.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="px-4 py-16 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/70 bg-white/75 p-8 shadow-xl">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl">
                                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">
                                    Nossos Universos
                                </span>
                                <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 md:text-4xl">
                                    Dois caminhos de descoberta, a mesma
                                    assinatura artesanal.
                                </h2>
                                <p className="mt-4 text-sm leading-7 text-slate-600">
                                    A vitrine puxa dados reais do backend e
                                    encaixa cada produto nas colecoes publicas
                                    para aproximar a experiencia do Stitch do
                                    contrato atual da API.
                                </p>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Link
                                    href="/beleza-natural"
                                    className="rounded-[1.75rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(25,64,179,0.07),rgba(255,255,255,0.95))] p-6 shadow-sm"
                                >
                                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
                                        Beleza Natural
                                    </p>
                                    <p className="mt-4 font-display text-2xl font-bold text-slate-900">
                                        Sabonetes, seruns, oleos e formulas
                                        botânicas.
                                    </p>
                                </Link>
                                <Link
                                    href="/artesanato"
                                    className="rounded-[1.75rem] border border-secondary/30 bg-[linear-gradient(180deg,rgba(209,160,84,0.14),rgba(255,255,255,0.95))] p-6 shadow-sm"
                                >
                                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-800">
                                        Artesanato e Artes Sacras
                                    </p>
                                    <p className="mt-4 font-display text-2xl font-bold text-slate-900">
                                        Cerâmica, presentes de fe e pecas para o
                                        lar.
                                    </p>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <HomeCollections initialCollections={collections} />
            </main>
            <SiteFooter />
        </div>
    );
}
