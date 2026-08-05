import Link from "next/link";
import { ProductImage } from "@/components/shared/product-image";
import type { Product } from "@/lib/types";
import { CatalogPrice } from "./catalog-price";

type ProductCardProps = {
    isPending: boolean;
    onBuy: (product: Product) => void;
    product: Product;
    variant: "beauty" | "crafts";
};

export function ProductCard({
    isPending,
    onBuy,
    product,
    variant,
}: ProductCardProps) {
    const isCraft = variant === "crafts";

    return (
        <div className="group">
            <div
                className={`relative mb-4 overflow-hidden bg-neutral-100 ${isCraft ? "aspect-[4/5] rounded-lg" : "aspect-square rounded-xl"}`}
            >
                <Link
                    aria-label={`Ver ${product.name}`}
                    href={`/produto/${product.slug}`}
                >
                    <ProductImage
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        src={product.imageUrl}
                    />
                </Link>
                <div
                    className={
                        isCraft
                            ? "absolute top-4 right-4 bg-white/90 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-[#4A3728]"
                            : "absolute bottom-3 left-3 rounded bg-white/90 px-2 py-1 text-[10px] font-bold tracking-widest text-primary uppercase"
                    }
                >
                    {product.line.name}
                </div>
            </div>
            <Link href={`/produto/${product.slug}`}>
                {isCraft ? (
                    <h4 className="font-public text-lg font-medium text-neutral-900 transition hover:text-[#4A3728]">
                        {product.name}
                    </h4>
                ) : (
                    <h3 className="font-display text-lg font-bold transition hover:text-primary">
                        {product.name}
                    </h3>
                )}
            </Link>
            <p
                className={
                    isCraft
                        ? "mt-1 text-sm text-neutral-500"
                        : "mb-3 text-sm text-slate-500"
                }
            >
                {product.shortDescription}
            </p>
            <div
                className={`${isCraft ? "mt-3" : ""} flex items-center justify-between`}
            >
                <span
                    className={
                        isCraft
                            ? "text-xl font-bold text-[#4A3728]"
                            : "text-lg font-bold"
                    }
                >
                    <CatalogPrice product={product} />
                </span>
                <button
                    className={
                        isCraft
                            ? "rounded bg-[#4A3728] px-4 py-2 text-xs font-medium tracking-wider text-white uppercase disabled:cursor-not-allowed disabled:opacity-60"
                            : "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    }
                    disabled={isPending || product.priceOptions.length === 0}
                    onClick={() => onBuy(product)}
                    type="button"
                >
                    {isPending ? "Adicionando" : "Comprar"}
                </button>
            </div>
        </div>
    );
}
