import Link from "next/link";
import { PersonalDiagnosisDialog } from "@/components/home/personal-diagnosis-dialog";
import { SiteFooter } from "@/components/site/site-footer";
import { fetchActiveTestimonials } from "@/lib/server-api";
import { ServerHeader } from "@/components/header/server";
import type { Testimonial } from "@/lib/types";

type HomePageProps = {
    searchParams?: Promise<{
        search?: string | string[];
    }>;
};

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
    const title =
        testimonial.title ??
        (testimonial.type === "VIDEO" ? "Depoimento em vídeo" : "Depoimento");
    const text = testimonial.text ?? "";

    return (
        <article className="flex min-h-[22rem] w-[82vw] max-w-[23rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-primary/5 bg-white shadow-lg md:w-[31%] md:min-w-[20rem]">
            {testimonial.type === "VIDEO" && testimonial.videoUrl ? (
                <div className="h-48 min-h-48 max-h-60 overflow-hidden bg-slate-950 md:h-56">
                    <video
                        className="h-full w-full object-contain"
                        controls
                        preload="metadata"
                        src={testimonial.videoUrl}
                    />
                </div>
            ) : (
                <div className="flex h-48 min-h-48 max-h-60 items-center bg-primary/10 px-6 md:h-56">
                    <span className="material-symbols-outlined text-5xl text-primary">
                        format_quote
                    </span>
                </div>
            )}
            <div className="flex flex-1 flex-col p-6">
                <span className="mb-3 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    {testimonial.type === "VIDEO" ? "Vídeo" : "Texto"}
                </span>
                <h3 className="font-display text-xl font-bold text-slate-900">
                    {title}
                </h3>
                {text ? (
                    <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-600">
                        {text}
                    </p>
                ) : null}
            </div>
        </article>
    );
}

export default async function HomePage({ searchParams }: HomePageProps) {
    const resolvedSearchParams = searchParams ? await searchParams : undefined;
    const search = Array.isArray(resolvedSearchParams?.search)
        ? (resolvedSearchParams.search[0] ?? "")
        : (resolvedSearchParams?.search ?? "");

    const [testimonialsResult] = await Promise.allSettled([
        fetchActiveTestimonials(),
    ]);
    const testimonials =
        testimonialsResult.status === "fulfilled"
            ? testimonialsResult.value.testimonials
            : [];

    return (
        <div className="min-h-screen bg-[#f6f6f8]">
            <ServerHeader search={search} />

            <main>
                <section className="relative flex min-h-[80vh] items-center overflow-hidden">
                    <div className="absolute inset-0 grid grid-cols-2">
                        {[
                            "https://lh3.googleusercontent.com/aida-public/AB6AXuAivgAEmKgpjW-wT8pfHxE1eiEQxhZaT3EPrRTHf96grXE05DQEDfOXC8Pt-2IwNT3207NdubuzDD4XmSUlWxIfTmbaM0BkMvHMqvWGyxRcjzXn2cnM8JliEfCgo4CacbjPb_akkkfGty3a78SSFYehVSUUK_g7n32E7EMJYKsdS6-po5gXNpSWMJT8_grJOMlTRiByZQHtIdYFJv-3_8H9-_LQU0uKwU7L8O3HxgZvHIXzy-_92nx8wrolsQ_ytwOVYyWG6s051Xee",
                            "/crucifixo.png",
                        ].map((image, index) => (
                            <div
                                key={image}
                                className="relative overflow-hidden"
                            >
                                <div className="absolute inset-0 z-10 bg-primary/20" />
                                <div
                                    className={
                                        index === 1
                                            ? "h-full w-full border-l border-white/20 bg-cover"
                                            : "h-full w-full bg-cover bg-center"
                                    }
                                    style={
                                        index === 1
                                            ? {
                                                  backgroundImage: `url(${image})`,
                                                  backgroundPosition:
                                                      "22% center",
                                              }
                                            : {
                                                  backgroundImage: `url(${image})`,
                                              }
                                    }
                                />
                            </div>
                        ))}
                    </div>
                    <div className="relative z-20 mx-auto w-full max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl rounded-xl border border-primary/10 bg-white/90 p-8 shadow-2xl backdrop-blur-md md:p-12">
                            <span className="mb-4 block text-xs font-bold uppercase tracking-[0.3em] text-primary">
                                Tradição e Oração
                            </span>
                            <h1 className="font-display text-4xl font-bold text-slate-900 md:text-6xl">
                                A Harmonia da Criação como Dom de Deus
                            </h1>
                            <p className="mt-6 text-lg leading-relaxed text-slate-600">
                                Cosméticos botânicos e artesanato autoral que
                                celebram a beleza da alma e o cuidado com o
                                templo do Espírito.
                            </p>
                            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                                <Link
                                    href="/beleza-natural"
                                    className="rounded-lg bg-primary px-8 py-4 font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                                >
                                    Beleza Natural
                                </Link>
                                <Link
                                    href="/artesanato"
                                    className="rounded-lg border-2 border-primary bg-white px-8 py-4 font-bold text-primary transition hover:bg-primary/5"
                                >
                                    Explorar Artesanato
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white py-24">
                    <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
                        <div className="relative">
                            <div className="absolute -left-4 -top-4 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
                            <div className="relative aspect-square overflow-hidden rounded-2xl shadow-2xl">
                                <div
                                    className="h-full w-full bg-cover bg-center"
                                    style={{
                                        backgroundImage:
                                            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCVTRf9ZTFuVLnLr5PbOvlfcpn7zNt8ky36c8ZT3uHUUgJ7SZKGsMXU76rKMyktMHS-GIAwHLJ90S-_w-XEJ3M4bZdtlGxxs2tXa_RbK2EF9g-ZGHBK9gZ3qpOnijul-MfvCY56-thEruYxnyf9sV6X4dGrgQzYbXrxaknZ-9AJM53xaRnZTD-DCOBk8zUyKyfK1n1b0whKgHXoL1M2duVZY3YGoim3WvD1Wo_FoPc7G5IZU4pLYH_Ikxc4WOZ-4GW8fnSSRxuZnmns')",
                                    }}
                                />
                            </div>
                            <div className="absolute -bottom-6 -right-6 hidden rounded-xl bg-primary p-6 text-white shadow-xl md:block">
                                <p className="font-display text-2xl font-bold">
                                    100%
                                </p>
                                <p className="text-xs font-bold uppercase tracking-wider">
                                    Natural e Puro
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-8">
                            <div>
                                <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                                    CUIDADO COMO TEMPLO
                                </span>
                                <h2 className="font-display text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
                                    Creme Personalizado: Unicidade de Cada
                                    Criatura
                                </h2>
                            </div>
                            <p className="text-lg leading-relaxed text-slate-600">
                                Reconhecemos que cada pessoa é uma obra singular
                                do Criador. Nossos especialistas preparam
                                fórmulas botânicas exclusivas que respeitam a
                                identidade de sua pele.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Óleos essenciais que honram a natureza",
                                    "Extratos botânicos frescos e puros",
                                    "Embalagem artesanal feita por mãos cristãs",
                                ].map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-center gap-3 text-slate-700"
                                    >
                                        <span className="material-symbols-outlined text-primary">
                                            check_circle
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                            <PersonalDiagnosisDialog />
                        </div>
                    </div>
                </section>

                <section className="bg-primary/5 py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div className="max-w-3xl">
                                <h2 className="font-display text-3xl font-bold text-slate-900">
                                    Testemunhos e Feedbacks
                                </h2>
                                <p className="mt-4 text-lg leading-relaxed text-slate-600">
                                    Algumas das palavras que nossos clientes
                                    fiéis falaram sobre a qualidade dos nossos
                                    produtos.
                                </p>
                            </div>
                            <Link
                                href="/artesanato"
                                className="flex items-center gap-2 font-bold text-primary hover:underline"
                            >
                                Conhecer produtos
                                <span className="material-symbols-outlined">
                                    north_east
                                </span>
                            </Link>
                        </div>
                        <div className="-mx-4 flex snap-x gap-6 overflow-x-auto px-4 pb-2">
                            {testimonials.length > 0 ? (
                                testimonials.map((testimonial) => (
                                    <TestimonialCard
                                        key={testimonial.uuid}
                                        testimonial={testimonial}
                                    />
                                ))
                            ) : (
                                <div className="min-h-[18rem] w-full rounded-2xl border border-primary/5 bg-white p-8 shadow-lg">
                                    <span className="material-symbols-outlined text-4xl text-primary">
                                        format_quote
                                    </span>
                                    <h3 className="mt-6 font-display text-2xl font-bold text-slate-900">
                                        Em breve
                                    </h3>
                                    <p className="mt-3 max-w-xl text-slate-600">
                                        Novos testemunhos de clientes serão
                                        exibidos aqui quando estiverem
                                        disponíveis.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="bg-[#fdfaf6] py-24">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid items-center gap-12 lg:grid-cols-12">
                            <div className="relative lg:col-span-5">
                                <div className="aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl">
                                    <img
                                        alt="Ambiente familiar acolhedor"
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzxA4l5o3xuESk9knRAj7aRT0ZrWPCDRA2vDN4dGK8-PEieFWb4_ogkeWMnPUPo4JGC-ICWHAh2Fcjkai4DFU48wPyBo9_pGV6lzc1DfCyNmS5iOTxRNNalJIhDqM09rqzePtTlTMHwtaVDZC3XHek3rWmxGUbxA2Zmz0zrB47ZKyGKu-QPv1Fm7JK944geZvhWnJmIXy20l_ZXTQXsxP-09Cjauz8uJcxHL51zsjpss-9uUf3LVggLNlan99ASa8Mm-9kttZTN0rI"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                                <div className="absolute -bottom-8 -left-8 hidden rounded-xl border border-primary/5 bg-white p-8 shadow-xl md:block">
                                    <span
                                        className="material-symbols-outlined mb-2 block text-5xl text-primary"
                                        style={{
                                            fontVariationSettings:
                                                '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 48',
                                        }}
                                    >
                                        family_restroom
                                    </span>
                                    <p className="text-sm font-bold uppercase tracking-widest text-primary">
                                        Legado de Fé
                                    </p>
                                </div>
                            </div>

                            <div className="lg:col-span-7 lg:pl-12">
                                <span className="mb-4 block text-xs font-bold uppercase tracking-[0.2em] text-primary">
                                    Nossa Essência
                                </span>
                                <h2 className="mb-8 font-display text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
                                    Nossa História: Uma Vocação de Amor
                                </h2>

                                <div className="space-y-6">
                                    <p className="border-l-4 border-primary/20 py-2 pl-6 text-xl font-medium italic text-slate-700">
                                        &ldquo;Somos uma família católica que,
                                        sob o olhar da Providência Divina e
                                        inspirada pela beleza da Criação,
                                        decidiu transformar dons em
                                        serviço.&rdquo;
                                    </p>
                                    <p className="text-lg leading-relaxed text-slate-600">
                                        Com o coração em nossos oito filhos —
                                        cinco que caminham conosco e três que
                                        intercedem por nós no Céu — o Ateliê
                                        Guadalupe nasceu do desejo de partilhar
                                        talentos confiados por Deus para o bem
                                        das famílias.
                                    </p>
                                    <p className="text-lg leading-relaxed text-slate-600">
                                        Cada produto que você encontra aqui é
                                        fruto desse abandono e gratidão.
                                        Resolvemos utilizar ao nosso favor e em
                                        favor das famílias, todos os dons e
                                        talentos confiados a nós por nosso Bom
                                        Deus, colocando à disposição o que há de
                                        mais puro em nosso trabalho manual e em
                                        nossa oração.
                                    </p>
                                </div>

                                <div className="mt-10 flex items-center gap-6">
                                    <div className="flex -space-x-3 overflow-hidden">
                                        <span className="material-symbols-outlined text-4xl text-primary/40">
                                            favorite
                                        </span>
                                        <span className="material-symbols-outlined text-4xl text-primary/60">
                                            favorite
                                        </span>
                                        <span className="material-symbols-outlined text-4xl text-primary/80">
                                            favorite
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                        Trabalho • Família • Oração
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <SiteFooter />
        </div>
    );
}
