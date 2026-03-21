import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
    const firstPrice = product.priceOptions[0];

    return (
        <Card className="group overflow-hidden">
            <div className="aspect-[4/5] bg-secondary/50">
                <img
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={product.imageUrl}
                />
            </div>
            <div className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                    <Badge>{product.line.name}</Badge>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {product.stock > 0
                            ? `${product.stock} em estoque`
                            : "Indisponível"}
                    </span>
                </div>
                <div>
                    <h3 className="font-display text-xl font-bold">
                        {product.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {product.shortDescription}
                    </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            a partir de
                        </p>
                        <p className="text-lg font-bold text-primary">
                            {firstPrice
                                ? formatCurrency(firstPrice.priceInCents)
                                : "Sob consulta"}
                        </p>
                    </div>
                    <Button variant="secondary">Ver Detalhes</Button>
                </div>
            </div>
        </Card>
    );
}
