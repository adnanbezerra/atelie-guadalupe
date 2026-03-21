import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProductCard } from "@/components/shared/product-card";
import type { Product } from "@/lib/types";

export function HomePage({
    featuredProducts,
}: {
    featuredProducts: Product[];
}) {
    return (
        <>
            <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
                <Card className="overflow-hidden p-8 md:p-12">
                    <Badge className="mb-6">Tradição e oração</Badge>
                    <h1 className="max-w-3xl font-display text-5xl font-bold leading-tight md:text-7xl">
                        A harmonia da criação traduzida em cuidado botânico e
                        arte sacra.
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                        A página inicial segue o Stitch: hero solene, chamada
                        para o creme personalizado, dois universos de catálogo e
                        uma atmosfera editorial.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href="/beleza-natural">
                            <Button className="px-6 py-3">
                                Beleza da Criação
                            </Button>
                        </Link>
                        <Link href="/artesanato">
                            <Button variant="outline" className="px-6 py-3">
                                Explorar Artesanato
                            </Button>
                        </Link>
                    </div>
                </Card>
                <div className="grid gap-6">
                    <Card className="overflow-hidden">
                        <div className="aspect-[4/3] bg-[url('https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80')] bg-cover bg-center" />
                    </Card>
                    <Card className="p-6">
                        <Badge tone="muted">Creme personalizado</Badge>
                        <h2 className="mt-4 font-display text-3xl font-bold">
                            Unicidade de cada criatura
                        </h2>
                        <p className="mt-4 text-sm leading-7 text-muted-foreground">
                            Fórmulas botânicas exclusivas, pensadas para pele,
                            rotina e intenção.
                        </p>
                        <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
                            <p>Óleos essenciais e extratos botânicos.</p>
                            <p>Ritual de produção com acabamento artesanal.</p>
                            <p>
                                Fluxo preparado para o admin personalizar
                                pedidos.
                            </p>
                        </div>
                    </Card>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">
                            Nossos universos
                        </p>
                        <h2 className="mt-3 font-display text-4xl font-bold">
                            Duas rotas principais, uma mesma linguagem de
                            contemplação.
                        </h2>
                    </div>
                    <Link
                        href="/beleza-natural"
                        className="text-sm font-semibold text-primary"
                    >
                        Ver catálogo completo
                    </Link>
                </div>
                <div className="mt-10 grid gap-6 md:grid-cols-3">
                    {[
                        {
                            title: "Cuidados Faciais",
                            text: "Séruns, bálsamos e preparos botânicos alinhados com a categoria de Beleza Natural.",
                        },
                        {
                            title: "Cerâmica Manual",
                            text: "Peças com presença tátil e acabamento caloroso, puxando o repertório do Stitch para artesanato.",
                        },
                        {
                            title: "Tear e Fibras",
                            text: "A seção assume o papel de artes sacras e objetos contemplativos no catálogo.",
                        },
                    ].map((item) => (
                        <Card key={item.title} className="p-6">
                            <h3 className="font-display text-2xl font-bold">
                                {item.title}
                            </h3>
                            <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                {item.text}
                            </p>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary">
                            Curadoria
                        </p>
                        <h2 className="mt-3 font-display text-4xl font-bold">
                            Produtos em destaque
                        </h2>
                    </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {featuredProducts.slice(0, 3).map((product) => (
                        <ProductCard key={product.uuid} product={product} />
                    ))}
                </div>
            </section>
        </>
    );
}
