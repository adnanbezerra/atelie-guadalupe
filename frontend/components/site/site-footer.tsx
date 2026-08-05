import Link from "next/link";
import logo from "public/logo-empty.png";
import Image from "next/image";

export function SiteFooter() {
    return (
        <footer className="mt-4 border-t border-white/5 bg-[#111521] px-4 py-14 text-slate-300 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-12 grid gap-10 md:grid-cols-[1.2fr_0.8fr_1fr]">
                    <div className="max-w-sm">
                        <div className="mb-6 flex items-center gap-3">
                            <Image
                                src={logo}
                                alt="Logo do Guadalupe Ateliê"
                                className="h-[30px] w-auto"
                            />
                            <span className="font-display text-xl font-bold text-white">
                                Ateliê Guadalupe
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-400">
                            Honrando as tradições artesanais e a sabedoria da
                            terra em cada detalhe.
                        </p>
                    </div>
                    <nav aria-label="Links do rodapé" className="space-y-3">
                        <Link
                            className="block rounded-sm text-sm font-bold text-white hover:text-secondary"
                            href="/beleza-natural"
                        >
                            Beleza da Criação
                        </Link>
                        <Link
                            className="block rounded-sm text-sm font-bold text-white hover:text-secondary"
                            href="/artesanato"
                        >
                            Artesanato católico
                        </Link>
                    </nav>
                    <div>
                        <p className="max-w-sm text-sm leading-relaxed text-slate-300">
                            Artesanato católico e cremes terapêuticos
                            diretamente de Patos - Paraíba
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-6 border-t border-white/5 pt-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
                    <div className="flex gap-8">
                        <Link
                            href="https://adnanbezerra.tech"
                            className="hover:text-primary"
                        >
                            Desenvolvido por Adnan Bezerra
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
