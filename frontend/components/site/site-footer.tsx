import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="mt-16 border-t border-white/70 bg-slate-950 px-4 py-12 text-slate-300 sm:px-6 lg:px-8">
            <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
                <div className="md:col-span-2">
                    <p className="font-display text-2xl font-bold text-white">
                        Atelie Guadalupe
                    </p>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-slate-400">
                        Frontend alinhado ao Stitch, mas conectado ao contrato
                        real do backend para produtos, carrinho, pedidos e
                        operacoes administrativas ja documentadas.
                    </p>
                </div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                        Rotas
                    </p>
                    <div className="mt-4 space-y-3 text-sm">
                        <Link
                            className="block hover:text-white"
                            href="/beleza-natural"
                        >
                            Beleza Natural
                        </Link>
                        <Link
                            className="block hover:text-white"
                            href="/artesanato"
                        >
                            Artesanato
                        </Link>
                        <Link
                            className="block hover:text-white"
                            href="/carrinho"
                        >
                            Meu Carrinho
                        </Link>
                    </div>
                </div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                        Painel
                    </p>
                    <div className="mt-4 space-y-3 text-sm">
                        <Link className="block hover:text-white" href="/admin">
                            Dashboard
                        </Link>
                        <Link
                            className="block hover:text-white"
                            href="/admin/produtos"
                        >
                            Produtos
                        </Link>
                        <Link
                            className="block hover:text-white"
                            href="/admin/usuarios"
                        >
                            Usuarios
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
