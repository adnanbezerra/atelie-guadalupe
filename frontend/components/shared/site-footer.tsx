import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="mt-20 border-t border-black/5 bg-[#1d2433] text-slate-200">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-4 lg:px-8">
                <div className="space-y-4 lg:col-span-2">
                    <p className="font-display text-2xl font-bold">
                        Ateliê Guadalupe
                    </p>
                    <p className="max-w-xl text-sm leading-7 text-slate-300">
                        Cosmética botânica, arte sacra e peças autorais
                        apresentadas com a mesma delicadeza que inspira as telas
                        do Stitch e os contratos do backend.
                    </p>
                </div>
                <div>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Navegação
                    </p>
                    <div className="space-y-3 text-sm">
                        <Link
                            href="/beleza-natural"
                            className="block hover:text-white"
                        >
                            Beleza Natural
                        </Link>
                        <Link
                            href="/artesanato"
                            className="block hover:text-white"
                        >
                            Artesanato
                        </Link>
                        <Link
                            href="/carrinho"
                            className="block hover:text-white"
                        >
                            Meu Carrinho
                        </Link>
                    </div>
                </div>
                <div>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Gestão
                    </p>
                    <div className="space-y-3 text-sm">
                        <Link href="/admin" className="block hover:text-white">
                            Dashboard
                        </Link>
                        <Link
                            href="/admin/produtos"
                            className="block hover:text-white"
                        >
                            Produtos
                        </Link>
                        <Link
                            href="/admin/cobranca"
                            className="block hover:text-white"
                        >
                            Cobrança
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
