import Image from "next/image";
import Link from "next/link";
import logo from "public/logo-empty.png";

type AdminSidebarProps = {
    pathname: string;
};

const navItems = [
    { href: "/admin", icon: "dashboard", label: "Painel" },
    { href: "/admin/produtos", icon: "inventory_2", label: "Produtos" },
    {
        href: "/admin/cobranca",
        icon: "shopping_cart",
        label: "Vendas/Links",
    },
    { href: "/admin/usuarios", icon: "group", label: "Usuários" },
];

export function AdminSidebar({ pathname }: AdminSidebarProps) {
    return (
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <Image
                        src={logo}
                        alt="Logo do Ateliê Guadalupe"
                        className="h-[50px] w-auto"
                    />
                    <div>
                        <h1 className="text-lg font-bold leading-tight text-primary">
                            Ateliê Guadalupe
                        </h1>
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Administração
                        </p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 space-y-1 px-4">
                {navItems.map((item) => {
                    const isActive =
                        item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.href}
                            className={
                                isActive
                                    ? "flex items-center gap-3 rounded-lg bg-primary px-3 py-2.5 text-white"
                                    : "flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600"
                            }
                            href={item.href}
                        >
                            <span className="material-symbols-outlined">
                                {item.icon}
                            </span>
                            <span className="text-sm font-medium">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
            <div className="border-t border-slate-200 p-4">
                <Link
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-600"
                    href="/"
                >
                    Visão de usuário
                </Link>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-600">
                    <span className="material-symbols-outlined">logout</span>
                    <span className="text-sm font-medium">Sair</span>
                </button>
            </div>
        </aside>
    );
}
