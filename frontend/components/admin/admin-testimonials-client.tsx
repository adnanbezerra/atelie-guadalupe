"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useAdminTestimonials } from "@/hooks/use-admin-testimonials";
import type {
    CreateTestimonialInput,
    Testimonial,
    TestimonialsPayload,
    TestimonialType,
} from "@/lib/types";

type AdminTestimonialsClientProps = {
    initialData: TestimonialsPayload;
};

const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];
const maxVideoSizeInBytes = 100 * 1024 * 1024;

function formatDate(value: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
}

function getPreview(testimonial: Testimonial) {
    if (testimonial.title) {
        return testimonial.title;
    }

    return getBodyPreview(testimonial);
}

function getBodyPreview(testimonial: Testimonial) {
    if (testimonial.type === "VIDEO") {
        return testimonial.videoUrl ? "Vídeo enviado" : "Vídeo sem URL";
    }

    return testimonial.text ?? "";
}

export function AdminTestimonialsClient({
    initialData,
}: AdminTestimonialsClientProps) {
    const testimonials = useAdminTestimonials(initialData);
    const [typeFilter, setTypeFilter] = useState<"ALL" | TestimonialType>(
        "ALL",
    );
    const [open, setOpen] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!toastMessage) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setToastMessage(null);
        }, 3500);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [toastMessage]);

    const filteredItems = useMemo(() => {
        if (typeFilter === "ALL") {
            return testimonials.data.testimonials;
        }

        return testimonials.data.testimonials.filter(
            (testimonial) => testimonial.type === typeFilter,
        );
    }, [testimonials.data.testimonials, typeFilter]);

    const stats = useMemo(() => {
        const items = testimonials.data.testimonials;

        return {
            total: items.length,
            active: items.filter((item) => item.isActive).length,
            text: items.filter((item) => item.type === "TEXT").length,
            video: items.filter((item) => item.type === "VIDEO").length,
        };
    }, [testimonials.data.testimonials]);

    return (
        <div className="flex min-h-full flex-col">
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
                <div>
                    <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                        Testemunhos
                    </h2>
                </div>
                <div className="flex items-center gap-4">
                    <button className="relative rounded-full p-2 text-slate-500">
                        <span className="material-symbols-outlined">
                            notifications
                        </span>
                        <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500" />
                    </button>
                </div>
            </header>

            <div className="mx-auto w-full max-w-7xl p-8">
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="font-display text-3xl font-bold text-slate-900">
                            Testemunhos dos Produtos
                        </h1>
                        <p className="mt-1 text-slate-500">
                            Gerencie depoimentos em texto e vídeo usados na
                            vitrine.
                        </p>
                    </div>
                    <Dialog
                        open={open}
                        onOpenChange={(nextOpen) => {
                            setOpen(nextOpen);
                            setFeedback(null);
                        }}
                    >
                        <DialogTrigger asChild>
                            <button className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white">
                                <span className="material-symbols-outlined">
                                    add
                                </span>
                                Novo Testemunho
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl bg-slate-50">
                            <DialogHeader className="border-b border-slate-200 bg-white p-6">
                                <DialogTitle className="text-2xl font-extrabold tracking-tight text-slate-900">
                                    Cadastrar testemunho
                                </DialogTitle>
                                <DialogDescription className="text-sm text-slate-500">
                                    Use texto ou vídeo conforme contrato de `PUT
                                    /testimonials`.
                                </DialogDescription>
                            </DialogHeader>
                            <TestimonialForm
                                feedback={feedback}
                                onSubmit={async (payload, options) => {
                                    try {
                                        setFeedback(null);
                                        await testimonials.createTestimonial(
                                            payload,
                                            options,
                                        );
                                        setOpen(false);
                                        setToastMessage(
                                            "Testemunho criado com sucesso.",
                                        );
                                    } catch (error) {
                                        setFeedback(
                                            error instanceof Error
                                                ? error.message
                                                : "Falha ao salvar testemunho.",
                                        );
                                        throw error;
                                    }
                                }}
                            />
                        </DialogContent>
                    </Dialog>
                </div>

                {toastMessage ? (
                    <div className="fixed right-6 top-6 z-[70] flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg">
                        <span className="material-symbols-outlined text-lg">
                            check_circle
                        </span>
                        {toastMessage}
                    </div>
                ) : null}

                <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {[
                        {
                            icon: "reviews",
                            tone: "bg-primary/10 text-primary",
                            label: "Total Testemunhos",
                            value: `${stats.total}`,
                        },
                        {
                            icon: "verified",
                            tone: "bg-emerald-100 text-emerald-600",
                            label: "Ativos",
                            value: `${stats.active}`,
                        },
                        {
                            icon: "abc",
                            tone: "bg-amber-100 text-amber-600",
                            label: "Texto",
                            value: `${stats.text}`,
                        },
                        {
                            icon: "movie",
                            tone: "bg-purple-100 text-purple-600",
                            label: "Vídeo",
                            value: `${stats.video}`,
                        },
                    ].map((item) => (
                        <div
                            className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                            key={item.label}
                        >
                            <div
                                className={`flex size-12 items-center justify-center rounded-lg ${item.tone}`}
                            >
                                <span className="material-symbols-outlined">
                                    {item.icon}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    {item.label}
                                </p>
                                <p className="text-xl font-bold">
                                    {item.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex flex-wrap gap-2">
                            {[
                                ["ALL", "Todos"],
                                ["TEXT", "Texto"],
                                ["VIDEO", "Vídeo"],
                            ].map(([value, label]) => (
                                <button
                                    className={
                                        typeFilter === value
                                            ? "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                                            : "rounded-lg px-4 py-2 text-sm font-semibold text-slate-600"
                                    }
                                    key={value}
                                    onClick={() =>
                                        setTypeFilter(
                                            value as "ALL" | TestimonialType,
                                        )
                                    }
                                    type="button"
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {testimonials.error ? (
                            <p className="text-sm text-red-600">
                                {testimonials.error}
                            </p>
                        ) : null}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Testemunho</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Criado em</th>
                                    <th className="px-6 py-4 text-right">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredItems.map((testimonial) => (
                                    <tr
                                        className="group transition-colors hover:bg-slate-50"
                                        key={testimonial.uuid}
                                    >
                                        <td className="max-w-xl px-6 py-4">
                                            <p className="line-clamp-2 font-bold text-slate-900">
                                                {getPreview(testimonial)}
                                            </p>
                                            {testimonial.title ? (
                                                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                                    {getBodyPreview(
                                                        testimonial,
                                                    )}
                                                </p>
                                            ) : null}
                                            {testimonial.videoUrl ? (
                                                <a
                                                    className="mt-1 block text-xs font-medium text-primary"
                                                    href={testimonial.videoUrl}
                                                    rel="noreferrer"
                                                    target="_blank"
                                                >
                                                    Abrir vídeo
                                                </a>
                                            ) : null}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                                {testimonial.type === "TEXT"
                                                    ? "Texto"
                                                    : "Vídeo"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={
                                                    testimonial.isActive
                                                        ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
                                                        : "inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                                                }
                                            >
                                                {testimonial.isActive
                                                    ? "Ativo"
                                                    : "Inativo"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                            {formatDate(testimonial.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {testimonial.isActive ? (
                                                    <button
                                                        className="rounded-lg p-2 transition-colors hover:bg-amber-100 hover:text-amber-600"
                                                        onClick={() =>
                                                            void testimonials.deactivateTestimonial(
                                                                testimonial.uuid,
                                                            )
                                                        }
                                                        type="button"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            visibility_off
                                                        </span>
                                                    </button>
                                                ) : null}
                                                <button
                                                    className="rounded-lg p-2 transition-colors hover:bg-red-100 hover:text-red-600"
                                                    onClick={() =>
                                                        void testimonials.deleteTestimonial(
                                                            testimonial.uuid,
                                                        )
                                                    }
                                                    type="button"
                                                >
                                                    <span className="material-symbols-outlined text-lg">
                                                        delete
                                                    </span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 ? (
                                    <tr>
                                        <td
                                            className="px-6 py-10 text-center text-sm text-slate-500"
                                            colSpan={5}
                                        >
                                            Nenhum testemunho encontrado.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TestimonialForm({
    feedback,
    onSubmit,
}: {
    feedback: string | null;
    onSubmit: (
        payload: CreateTestimonialInput,
        options?: { onUploadProgress?: (progress: number) => void },
    ) => Promise<void>;
}) {
    const [type, setType] = useState<TestimonialType>("TEXT");
    const [title, setTitle] = useState("");
    const [text, setText] = useState("");
    const [video, setVideo] = useState<File | null>(null);
    const [isActive, setIsActive] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    return (
        <form
            className="grid grid-cols-1 items-start gap-6 p-6 lg:grid-cols-3"
            onSubmit={(event) => {
                event.preventDefault();

                if (isSubmitting) {
                    return;
                }

                if (type === "TEXT" && !text.trim()) {
                    setFormError("Informe o texto do testemunho.");
                    return;
                }

                if (type === "VIDEO" && !video) {
                    setFormError(null);
                    setVideoError("Informe um vídeo para cadastrar.");
                    return;
                }

                setFormError(null);
                setVideoError(null);

                const payload: CreateTestimonialInput =
                    type === "TEXT"
                        ? {
                              type,
                              ...(title.trim() ? { title: title.trim() } : {}),
                              text: text.trim(),
                              isActive,
                          }
                        : {
                              type,
                              ...(title.trim() ? { title: title.trim() } : {}),
                              video: video as File,
                              isActive,
                          };

                setIsSubmitting(true);
                setUploadProgress(type === "VIDEO" ? 0 : null);

                void onSubmit(payload, {
                    onUploadProgress: (progress) => {
                        setUploadProgress(progress);
                    },
                })
                    .catch(() => undefined)
                    .finally(() => {
                        setIsSubmitting(false);
                        setUploadProgress(null);
                    });
            }}
        >
            <div className="space-y-6 lg:col-span-2">
                <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-400">
                        Conteúdo
                    </h3>
                    <div className="space-y-4">
                        <Field label="Título">
                            <input
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                                placeholder="Ex: Cliente de Curitiba"
                                value={title}
                            />
                        </Field>
                        <Field label="Tipo">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <TypeOption
                                    checked={type === "TEXT"}
                                    description="Depoimento escrito"
                                    icon="abc"
                                    label="Texto"
                                    onChange={() => {
                                        setType("TEXT");
                                        setVideo(null);
                                        setVideoError(null);
                                    }}
                                />
                                <TypeOption
                                    checked={type === "VIDEO"}
                                    description="Arquivo MP4, WebM ou MOV"
                                    icon="movie"
                                    label="Vídeo"
                                    onChange={() => {
                                        setType("VIDEO");
                                        setText("");
                                        setFormError(null);
                                    }}
                                />
                            </div>
                        </Field>

                        {type === "TEXT" ? (
                            <Field label="Texto do testemunho">
                                <textarea
                                    className="min-h-40 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    onChange={(event) =>
                                        setText(event.target.value)
                                    }
                                    placeholder="Atendimento excelente e produto impecável."
                                    value={text}
                                />
                            </Field>
                        ) : (
                            <Field label="Vídeo">
                                <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition hover:border-primary hover:text-primary">
                                    <span className="material-symbols-outlined">
                                        upload_file
                                    </span>
                                    <span className="text-xs font-bold uppercase">
                                        {video
                                            ? video.name
                                            : "Selecionar vídeo"}
                                    </span>
                                    <span className="text-xs">
                                        MP4, WebM ou MOV até 100 MB
                                    </span>
                                    <input
                                        accept="video/mp4,video/webm,video/quicktime"
                                        className="sr-only"
                                        onChange={(event) => {
                                            const file =
                                                event.target.files?.[0] ?? null;

                                            if (!file) return;

                                            if (
                                                !videoTypes.includes(file.type)
                                            ) {
                                                setVideoError(
                                                    "Formato de vídeo inválido.",
                                                );
                                                return;
                                            }

                                            if (
                                                file.size > maxVideoSizeInBytes
                                            ) {
                                                setVideoError(
                                                    "Vídeo deve ter no máximo 100 MB.",
                                                );
                                                return;
                                            }

                                            setFormError(null);
                                            setVideoError(null);
                                            setVideo(file);
                                        }}
                                        type="file"
                                    />
                                </label>
                                {videoError ? (
                                    <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                                        {videoError}
                                    </p>
                                ) : null}
                                {uploadProgress !== null ? (
                                    <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                                        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700">
                                            <span>Enviando vídeo</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div
                                            aria-label="Progresso do envio do vídeo"
                                            aria-valuemax={100}
                                            aria-valuemin={0}
                                            aria-valuenow={uploadProgress}
                                            className="h-2 overflow-hidden rounded-full bg-white"
                                            role="progressbar"
                                        >
                                            <div
                                                className="h-full rounded-full bg-primary transition-all"
                                                style={{
                                                    width: `${uploadProgress}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : null}
                            </Field>
                        )}
                    </div>
                </section>
            </div>

            <div className="space-y-6">
                <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h3 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-400">
                        Publicação
                    </h3>
                    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
                        <span>
                            <span className="block text-sm font-bold text-slate-800">
                                Status ativo
                            </span>
                            <span className="block text-xs text-slate-500">
                                Exibir na área pública
                            </span>
                        </span>
                        <input
                            checked={isActive}
                            className="size-4 text-primary focus:ring-primary"
                            disabled={isSubmitting}
                            onChange={(event) =>
                                setIsActive(event.target.checked)
                            }
                            type="checkbox"
                        />
                    </label>
                </section>

                {formError || feedback ? (
                    <p
                        className={
                            formError
                                ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                                : "rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                        }
                    >
                        {formError ?? feedback}
                    </p>
                ) : null}

                <button
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-white shadow-lg shadow-blue-200 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting}
                    type="submit"
                >
                    <span className="material-symbols-outlined text-sm">
                        {isSubmitting ? "progress_activity" : "save"}
                    </span>
                    {isSubmitting ? "Enviando..." : "Cadastrar Testemunho"}
                </button>
            </div>
        </form>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">
                {label}
            </span>
            {children}
        </label>
    );
}

function TypeOption({
    checked,
    label,
    description,
    icon,
    onChange,
}: {
    checked: boolean;
    label: string;
    description: string;
    icon: string;
    onChange: () => void;
}) {
    return (
        <label className="flex cursor-pointer items-center rounded-lg border border-slate-200 p-3 transition hover:border-primary">
            <input
                checked={checked}
                className="text-primary focus:ring-primary"
                name="testimonial_type"
                onChange={onChange}
                type="radio"
            />
            <span className="material-symbols-outlined ml-3 text-primary">
                {icon}
            </span>
            <span className="ml-3">
                <span className="block text-sm font-bold text-slate-800">
                    {label}
                </span>
                <span className="block text-[10px] text-slate-500">
                    {description}
                </span>
            </span>
        </label>
    );
}
