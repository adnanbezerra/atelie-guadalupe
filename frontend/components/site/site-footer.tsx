import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="border-t border-white/5 bg-[#111521] px-4 py-16 text-slate-300 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-12 grid gap-12 md:grid-cols-4">
                    <div>
                        <div className="mb-6 flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl text-primary">
                                auto_awesome
                            </span>
                            <span className="font-display text-xl font-bold text-white">
                                Ateliê Guadalupe
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400">
                            Honrando as tradições artesanais e a sabedoria da
                            terra em cada detalhe.
                        </p>
                    </div>
                    <div>
                        <h4 className="mb-6 font-bold text-white">
                            Beleza da Criação
                        </h4>
                        <div className="space-y-4 text-sm">
                            <Link
                                className="block transition-colors hover:text-primary"
                                href="/beleza-natural"
                            >
                                Cremes botânicos
                            </Link>
                            <Link
                                className="block transition-colors hover:text-primary"
                                href="/beleza-natural"
                            >
                                Séruns faciais
                            </Link>
                            <Link
                                className="block transition-colors hover:text-primary"
                                href="/carrinho"
                            >
                                Meu carrinho
                            </Link>
                        </div>
                    </div>
                    <div>
                        <h4 className="mb-6 font-bold text-white">
                            Artesanato
                        </h4>
                        <div className="space-y-4 text-sm">
                            <Link
                                className="block transition-colors hover:text-primary"
                                href="/artesanato"
                            >
                                Arte sacra
                            </Link>
                            <Link
                                className="block transition-colors hover:text-primary"
                                href="/artesanato"
                            >
                                Cerâmica manual
                            </Link>
                            <Link
                                className="block transition-colors hover:text-primary"
                                href="/artesanato"
                            >
                                Oratórios
                            </Link>
                        </div>
                    </div>
                    <div>
                        <h4 className="mb-6 font-bold text-white">Admin</h4>
                        <div className="space-y-4 text-sm">
                            <Link
                                className="block transition-colors hover:text-primary"
                                href="/admin"
                            >
                                Dashboard
                            </Link>
                            <Link
                                className="block transition-colors hover:text-primary"
                                href="/admin/produtos"
                            >
                                Produtos
                            </Link>
                            <Link
                                className="block transition-colors hover:text-primary"
                                href="/admin/usuarios"
                            >
                                Usuários
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-6 border-t border-white/5 pt-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
                    <p>Produzido com carinho em Guadalupe.</p>
                    <div className="flex gap-8">
                        <Link href="/" className="hover:text-primary">
                            Contato
                        </Link>
                        <Link href="/" className="hover:text-primary">
                            Sustentabilidade
                        </Link>
                        <Link href="/" className="hover:text-primary">
                            Política de devolução
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
