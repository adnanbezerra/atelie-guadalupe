import Image from "next/image";
import Link from "next/link";
import logo from "public/logo-empty.png";

export function PaymentFlowHeader() {
    return (
        <header className="border-b border-[#d1a054] bg-white">
            <div className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-center px-5 sm:justify-start sm:px-8">
                <Link
                    aria-label="Ir para a página inicial do Ateliê Guadalupe"
                    className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
                    href="/"
                >
                    <Image
                        alt="Logo do Ateliê Guadalupe"
                        className="h-12 w-auto"
                        priority
                        src={logo}
                    />
                    <span className="font-display text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                        Ateliê Guadalupe
                    </span>
                </Link>
            </div>
        </header>
    );
}
