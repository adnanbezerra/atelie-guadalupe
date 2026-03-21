import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function PageShell({
    children,
    title,
    eyebrow,
    description,
}: {
    children: React.ReactNode;
    title?: string;
    eyebrow?: string;
    description?: string;
}) {
    return (
        <>
            <SiteHeader />
            <main className="pb-16">
                {title ? (
                    <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
                        <div className="max-w-3xl">
                            {eyebrow ? (
                                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                                    {eyebrow}
                                </p>
                            ) : null}
                            <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-foreground">
                                {title}
                            </h1>
                            {description ? (
                                <p className="mt-5 text-lg leading-8 text-muted-foreground">
                                    {description}
                                </p>
                            ) : null}
                        </div>
                    </section>
                ) : null}
                {children}
            </main>
            <SiteFooter />
        </>
    );
}
