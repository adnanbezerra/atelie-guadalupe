"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useProductLines, useProducts } from "@/hooks/use-products";
import { filterProductsByCollection } from "@/lib/catalog";
import { CollectionKey, ProductLine, ProductsPayload } from "@/lib/types";
import { getPriceLabel } from "@/lib/utils";
import Header from "../header";

type CollectionCatalogProps = {
    collectionKey: CollectionKey;
    config: {
        title: string;
        description: string;
        heroAccent: string;
    };
    initialCatalog?: ProductsPayload;
    initialSearch?: string;
    lines: ProductLine[];
};

const beautyFallbacks = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuByKdOx5QYbNjO2Vt0bSCqox-wwT1fwHrvMchPharYB04gwPSd862O6w3RtFc0FcqIIpcAadjRj5CIh4Jy-WbsmE-iKHKAxw-2CjkQtDuBzOG_KUr8jIXOkJAJQOOi50ra3Ncd_0vUqufn_hp6jxruPIOEgJf0OSv4Qyo5YDU48YW1XYPmLqhX10Hj1RUFlpd8DohTgoG0LKQKtRE_sOJHqgFuuBW6Db7R2Vyp6g4KNRCiPrCMYmBkvBtnphrgWY8KbksoHK_w8kqRy",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCHAJdYTAjSnRLfcNtvEdh9ExOZcn31vkfLOD3hqiSW-vhfa46YsuxN0xlhRylhI1_-SQxN4jtrR_Rc_sfGHrSbkFMJGeA-Uy5anogwnREmdl1Mss5R2oA3T9AG407UUGSwTCjEwBlpAj0pME2pe7WrbQVG3drfTurVKeBXGr14TQpnLJpORjVxRdeqofaAktWRUB-y4yYzpu8pZis689RELHxdRy1WITBHaHpQt6v-SPvdEP_jRDDtzboasgbSR4MRZxXW9rLSi-cx",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDJJUXqZO2gN314pFSGnG3xAg4Ey9TR8J8yihYWyuD12jOmLct2Np1oGWSNSVv4uOonBlLWM36oLb1ZISH_IkenphXjvxq2xzv8GS85lHGZAX4IYt3UaPu1k5FnwfXopRNd3Ts1itit1rfjDaH3oAd1GeGhvIuidGsdh1XHaiMiR7AzHn_VcrhU4wT2RZFj-CeIccc2MEjiuozPqnf_IOts4uyxaBfsUYU1lTczJD63Yse4-1IL5hkBurTAkDy7poRyvY1EU9FPjmuq",
];

const craftsFallbacks = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuA4r6sNAjhfRfhb4GyLGm_4o6s4CU_A6eomoq2JVAHOWcBKeLb8npAEwwdhrrucRkb4XmvyF3nGUmg7bXKeQf5Ps8H-k57MmWtJQ4SYOEFLbPxzGFESUg_6CaXJ7z_TNb0mvlJTx4THdQhp43EPTw_h8g2M8msWd5sObB5z0BT74web-GQlQ0VfAUzrOPAifR24mJYSAl6ej8HUUp6SuZNtQsIcZCXg0SOSFj8xU9GMnBLF5I5pLyjMR9AKioDLRo-KUYXFVGpBhG7a",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAi7JoDNtZs4KgPn5FmKlRvhfmY3KQjAshhM3-Cx_ToldiQXJbs2mUHxAcgn3KSD9F3rIEqc9kzmg3UgDUeC4zpBHTcEuWF9QoVD5RLcG3-NaCPkGEpmt1bQCfa18SMh29e-bqupTZTqCoxk0v73aAXHuji5MVGpHU2IPJ_jkxT0moFWOM1IoItwHUqZ0s1Ys77igjd00pHFw_vHmLspghkKdXXLPfjXY_Q-1OHFtVbisZGamguwa8WvjUZbijWaH5aq_g5_nZRjbh2",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCTXQhvncRD8SkL6AzLTBn3A-KdZkThgqViHub1exi8EG-VlI-LOdltxN4XNSTsCL0t-FvvDd5AGTyYPKWFoGiltGa5FVaj9wo_Ic97AkojqwTI54-Hhpk2XmpX-29XHN5qqQFYIdjdZMpUxSeRbPPI0Lgs93_worHaab2G0hdp3mXNra64jPA2ZB0Wn71WtlbWo9_0YMSPqPSjdVewpdOHQ5o81L_8tKNxi6ixFQQteGbVdIDorc_zm71ouJbcB5QvHeBjo2oXKMn4",
];

export function CollectionCatalog({
    collectionKey,
    config,
    initialCatalog,
    initialSearch = "",
    lines: initialLines,
}: CollectionCatalogProps) {
    void config;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(initialSearch);
    const [lineUuid, setLineUuid] = useState("");
    const [inStockOnly, setInStockOnly] = useState(false);
    const [, startTransition] = useTransition();
    const linesResource = useProductLines(initialLines);
    const productsResource = useProducts(initialCatalog, {
        page: 1,
        pageSize: 24,
        search,
        lineUuid: lineUuid || undefined,
        inStock: inStockOnly || undefined,
    });

    const filteredProducts = useMemo(() => {
        const items = productsResource.data?.items ?? [];
        return filterProductsByCollection(items, collectionKey);
    }, [collectionKey, productsResource.data?.items]);

    useEffect(() => {
        setSearch(initialSearch);
    }, [initialSearch]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const nextParams = new URLSearchParams(searchParams.toString());

            if (search.trim()) {
                nextParams.set("search", search.trim());
            } else {
                nextParams.delete("search");
            }

            const query = nextParams.toString();
            const href = query ? `${pathname}?${query}` : pathname;
            const currentHref = searchParams.toString()
                ? `${pathname}?${searchParams.toString()}`
                : pathname;

            if (href === currentHref) {
                return;
            }

            startTransition(() => {
                router.replace(href, { scroll: false });
            });
        }, 250);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [pathname, router, search, searchParams, startTransition]);

    if (collectionKey === "crafts") {
        return (
            <div className="min-h-screen bg-neutral-50 text-neutral-900">
                <Header
                    activeCollection="crafts"
                    search={search}
                    setSearch={setSearch}
                />

                <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <nav className="mb-8 flex items-center gap-2 text-sm text-neutral-500">
                        <Link href="/">Home</Link>
                        <span className="material-symbols-outlined text-xs">
                            chevron_right
                        </span>
                        <span className="font-medium text-[#4A3728]">
                            Artesanato
                        </span>
                    </nav>

                    <header className="mb-12">
                        <h1 className="font-public text-4xl font-bold text-neutral-900">
                            Artesanato Autoral e Sacro
                        </h1>
                        <p className="mt-4 max-w-3xl text-lg text-neutral-600">
                            Peças exclusivas que unem a tradição da arte sacra
                            católica à delicadeza do fazer manual. Cada item é
                            criado com oração e técnica, transformando materiais
                            nobres em expressões de fé e beleza para o seu lar e
                            liturgia.
                        </p>
                    </header>

                    <div className="flex flex-col gap-12 lg:flex-row">
                        <aside className="w-full lg:w-64 lg:flex-shrink-0">
                            <div className="sticky top-28 space-y-8">
                                <div>
                                    <h3 className="mb-4 flex items-center gap-2 font-public font-semibold text-neutral-900">
                                        <span className="material-symbols-outlined text-[#D4AF37]">
                                            filter_list
                                        </span>
                                        Categorias
                                    </h3>
                                    <ul className="space-y-3">
                                        {[
                                            "Esculturas Sacras",
                                            "Têxteis Litúrgicos",
                                            "Cerâmica Manual",
                                            "Oratórios",
                                            "Terços e Sacramentais",
                                        ].map((label) => (
                                            <li key={label}>
                                                <label className="flex cursor-pointer items-center gap-3 text-sm">
                                                    <input type="checkbox" />
                                                    {label}
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="mb-4 font-public font-semibold text-neutral-900">
                                        Material
                                    </h3>
                                    <ul className="space-y-3">
                                        {[
                                            "Madeira Nobre",
                                            "Cerâmica",
                                            "Linho e Seda",
                                        ].map((label) => (
                                            <li key={label}>
                                                <label className="flex cursor-pointer items-center gap-3 text-sm">
                                                    <input
                                                        name="material"
                                                        type="radio"
                                                    />
                                                    {label}
                                                </label>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="mb-4 font-public font-semibold text-neutral-900">
                                        Faixa de Preço
                                    </h3>
                                    <input
                                        className="w-full accent-[#4A3728]"
                                        type="range"
                                    />
                                    <div className="mt-4 flex justify-between text-xs text-neutral-500">
                                        <span>R$ 0</span>
                                        <span>R$ 2.000+</span>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        <div className="flex-1">
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
                                {filteredProducts.map((product, index) => (
                                    <div className="group" key={product.uuid}>
                                        <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-lg bg-neutral-100">
                                            <img
                                                alt={product.name}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                src={
                                                    product.imageUrl ||
                                                    craftsFallbacks[
                                                        index %
                                                            craftsFallbacks.length
                                                    ]
                                                }
                                            />
                                            <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[#4A3728]">
                                                {product.line.name}
                                            </div>
                                        </div>
                                        <h4 className="font-public text-lg font-medium text-neutral-900">
                                            {product.name}
                                        </h4>
                                        <p className="mt-1 text-sm text-neutral-500">
                                            {product.shortDescription}
                                        </p>
                                        <div className="mt-3 flex items-center justify-between">
                                            <span className="text-xl font-bold text-[#4A3728]">
                                                {getPriceLabel(
                                                    product.priceOptions,
                                                )}
                                            </span>
                                            <Link
                                                className="rounded bg-[#4A3728] px-4 py-2 text-xs font-medium tracking-wider text-white uppercase"
                                                href="/carrinho"
                                            >
                                                Ver Detalhes
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-16 flex items-center justify-center gap-4">
                                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200">
                                    <span className="material-symbols-outlined text-sm">
                                        chevron_left
                                    </span>
                                </button>
                                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4A3728] font-bold text-white">
                                    1
                                </button>
                                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200">
                                    2
                                </button>
                                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200">
                                    3
                                </button>
                                <button className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200">
                                    <span className="material-symbols-outlined text-sm">
                                        chevron_right
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f6f6f8] text-slate-900">
            <Header
                activeCollection="beauty"
                search={search}
                setSearch={setSearch}
            />
            <main className="mx-auto w-full max-w-7xl px-6 py-8 md:px-10">
                <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
                    <Link href="/">Home</Link>
                    <span className="material-symbols-outlined text-xs">
                        chevron_right
                    </span>
                    <Link href="/beleza-natural">Beleza Natural</Link>
                    <span className="material-symbols-outlined text-xs">
                        chevron_right
                    </span>
                    <span className="font-medium text-slate-900">Cremes</span>
                </nav>

                <section className="mb-12">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="flex flex-col justify-center lg:col-span-2">
                            <h1 className="font-display text-5xl font-bold">
                                Cremes Botânicos
                            </h1>
                            <p className="mt-4 max-w-xl text-lg text-slate-600">
                                Fórmulas artesanais ricas em óleos essenciais
                                puros. Hidratação profunda que respeita o
                                equilíbrio natural da sua pele.
                            </p>
                        </div>
                        <div className="relative flex aspect-[4/3] items-end overflow-hidden rounded-xl bg-primary p-8 lg:aspect-auto">
                            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.7)),url('https://lh3.googleusercontent.com/aida-public/AB6AXuDlA75ZIl1MTF9dZEkw8ZGtS2qRo3TYuYP0CuYTOQk8Z-W2LDeQo-HR46KdtUBc2QJKagrRvuU7WUJIb-j-5SPkN7gQ-ziWitpDvK479fJiWYaET-A6PbOyS7Zu1SrdzFu131HDyAbJZwxj1YovX4SHJomGK-yZkX8gVhqX_Am41hncNcdje8k80OT8J0WXf-Kea2LLaGSzBcy0VofU8dJkJEggzkaFJOaIM_5cCluHjgrYPTShqlqC_a7o44zzlYLEz44zxXh5VMYN')] bg-cover bg-center" />
                            <div className="relative z-10 w-full">
                                <h3 className="font-display text-2xl font-bold text-white">
                                    Crie seu Creme Personalizado
                                </h3>
                                <p className="mt-2 text-sm text-white/80">
                                    Escolha os óleos e a textura ideal para
                                    você.
                                </p>
                                <Link
                                    className="mt-4 block w-full rounded-lg bg-white py-3 text-center font-bold text-primary"
                                    href="/admin/cobranca"
                                >
                                    Começar agora
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex flex-col gap-10 md:flex-row">
                    <aside className="w-full space-y-8 md:w-64 md:flex-shrink-0">
                        <div>
                            <h4 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider">
                                Fragrâncias
                            </h4>
                            <div className="space-y-2">
                                {[
                                    "Lavanda Francesa",
                                    "Alecrim & Limão",
                                    "Capim-Limão",
                                    "Bergamota",
                                    "Sem Perfume",
                                ].map((label) => (
                                    <label
                                        className="flex items-center gap-3 text-sm"
                                        key={label}
                                    >
                                        <input type="checkbox" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider">
                                Benefícios
                            </h4>
                            <div className="space-y-2">
                                {[
                                    "Relaxamento",
                                    "Energizante",
                                    "Hidratação Intensa",
                                    "Pele Sensível",
                                ].map((label) => (
                                    <label
                                        className="flex items-center gap-3 text-sm"
                                        key={label}
                                    >
                                        <input type="checkbox" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                            <p className="mb-2 text-xs font-bold uppercase text-primary">
                                Dica Pro
                            </p>
                            <p className="text-sm leading-relaxed text-slate-600">
                                Cremes com base de Karité são ideais para as
                                áreas mais secas como cotovelos e pés.
                            </p>
                        </div>
                    </aside>

                    <div className="flex-1">
                        <div className="mb-6 flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Mostrando{" "}
                                <span className="font-bold text-slate-900">
                                    {filteredProducts.length}
                                </span>{" "}
                                produtos
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">
                                    Ordenar por:
                                </span>
                                <select
                                    className="cursor-pointer border-none bg-transparent text-sm font-bold outline-none"
                                    onChange={(event) =>
                                        setLineUuid(event.target.value)
                                    }
                                    value={lineUuid}
                                >
                                    <option value="">Mais populares</option>
                                    <option value="lancamentos">
                                        Lançamentos
                                    </option>
                                    <option value="menor-preco">
                                        Menor preço
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredProducts.map((product, index) => (
                                <div className="group" key={product.uuid}>
                                    <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-slate-100">
                                        <img
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            src={
                                                product.imageUrl ||
                                                beautyFallbacks[
                                                    index %
                                                        beautyFallbacks.length
                                                ]
                                            }
                                        />
                                        <button className="absolute top-3 right-3 rounded-full bg-white/80 p-2 backdrop-blur">
                                            <span className="material-symbols-outlined text-sm">
                                                favorite
                                            </span>
                                        </button>
                                        <div className="absolute bottom-3 left-3">
                                            <span className="rounded bg-white/90 px-2 py-1 text-[10px] font-bold tracking-widest text-primary uppercase">
                                                {product.line.name}
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="font-display text-lg font-bold">
                                        {product.name}
                                    </h3>
                                    <p className="mb-3 text-sm text-slate-500">
                                        {product.shortDescription}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-bold">
                                            {getPriceLabel(
                                                product.priceOptions,
                                            )}
                                        </span>
                                        <Link
                                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                                            href="/carrinho"
                                        >
                                            Comprar
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
