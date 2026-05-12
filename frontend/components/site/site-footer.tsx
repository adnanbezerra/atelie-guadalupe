import Link from "next/link";
import logo from "public/logo-empty.png";
import Image from "next/image";

export function SiteFooter() {
    return (
        <footer className="border-t border-white/5 bg-[#111521] px-4 py-16 text-slate-300 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-12 grid gap-12 md:grid-cols-4">
                    <div>
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
                    <div>
                        <Link
                            className="mb-6 text-white"
                            href="/beleza-natural"
                        >
                            Beleza da Criação
                        </Link>
                        <br className="mb-4"></br>
                        <Link className="mb-6 text-white" href="/artesanato">
                            Artesanato católico
                        </Link>
                    </div>
                    <div>
                        <h4 className="mb-6 text-white">
                            Artesanato católico e cremes terapêuticos
                            diretamente de Patos - Paraíba
                        </h4>
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
