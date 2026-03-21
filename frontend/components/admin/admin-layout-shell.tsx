import Link from "next/link";
import { cn } from "@/lib/utils";

const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/produtos", label: "Produtos" },
    { href: "/admin/cobranca", label: "Cobrança" },
    { href: "/admin/usuarios", label: "Usuários" },
];

export function AdminLayoutShell({
    pathname,
    children,
}: {
    pathname: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#f5f6fb] text-foreground">
            <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[280px_1fr]">
                <aside className="border-r border-black/5 bg-white px-6 py-8">
                    <div>
                        <p className="font-display text-2xl font-bold text-primary">
                            Ateliê Guadalupe
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                            Administração
                        </p>
                    </div>
                    <nav className="mt-10 space-y-2">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                className={cn(
                                    "block rounded-2xl px-4 py-3 text-sm font-semibold",
                                    pathname === link.href
                                        ? "bg-primary text-white"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                                )}
                                href={link.href}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </aside>
                <div className="p-6 md:p-8">{children}</div>
            </div>
        </div>
    );
}
