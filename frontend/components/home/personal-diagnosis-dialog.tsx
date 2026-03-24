"use client";

import Link from "next/link";
import { ReactNode } from "react";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

const WHATSAPP_PHONE = "5583988337598";
const WHATSAPP_MESSAGE =
    "Olá, vim pelo website e gostaria de fazer um diagnóstico personalizado!";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const previewImage =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCVTRf9ZTFuVLnLr5PbOvlfcpn7zNt8ky36c8ZT3uHUUgJ7SZKGsMXU76rKMyktMHS-GIAwHLJ90S-_w-XEJ3M4bZdtlGxxs2tXa_RbK2EF9g-ZGHBK9gZ3qpOnijul-MfvCY56-thEruYxnyf9sV6X4dGrgQzYbXrxaknZ-9AJM53xaRnZTD-DCOBk8zUyKyfK1n1b0whKgHXoL1M2duVZY3YGoim3WvD1Wo_FoPc7G5IZU4pLYH_Ikxc4WOZ-4GW8fnSSRxuZnmns";

function WhatsAppIcon() {
    return (
        <svg
            aria-hidden="true"
            className="h-5 w-5 shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
        >
            <path d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.61 2 2.2 6.4 2.2 11.82c0 1.74.45 3.43 1.31 4.93L2 22l5.41-1.42a9.8 9.8 0 0 0 4.62 1.18h.01c5.42 0 9.82-4.41 9.82-9.83a9.75 9.75 0 0 0-2.81-7.02Zm-7.02 15.2h-.01a8.14 8.14 0 0 1-4.15-1.14l-.3-.18-3.21.84.86-3.13-.2-.32a8.12 8.12 0 0 1-1.25-4.36c0-4.5 3.66-8.16 8.17-8.16 2.18 0 4.22.85 5.76 2.39a8.1 8.1 0 0 1 2.38 5.77c0 4.5-3.66 8.16-8.15 8.16Zm4.47-6.1c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.18-.7-.63-1.17-1.4-1.31-1.64-.14-.24-.01-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.46-.39-.39-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.68 2.56 4.06 3.59.57.25 1.02.4 1.36.51.57.18 1.08.15 1.49.09.46-.07 1.4-.57 1.6-1.12.2-.55.2-1.03.14-1.12-.06-.09-.22-.14-.46-.26Z" />
        </svg>
    );
}

type PersonalDiagnosisDialogProps = {
    trigger?: ReactNode;
};

const defaultTrigger = (
    <button
        className="flex w-fit items-center gap-4 rounded-xl bg-primary px-10 py-5 font-bold text-white shadow-xl shadow-primary/30 transition hover:scale-[1.02]"
        type="button"
    >
        Iniciar Diagnóstico Pessoal
        <span className="material-symbols-outlined">arrow_forward</span>
    </button>
);

export function PersonalDiagnosisDialog({
    trigger = defaultTrigger,
}: PersonalDiagnosisDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="overflow-hidden">
                <div className="grid md:grid-cols-[1.02fr_1fr]">
                    <div className="relative min-h-[280px] bg-[#e9dcc8] md:min-h-[560px]">
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${previewImage})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-[#40241a]/20 via-transparent to-[#5f3a25]/45" />
                        <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/20 bg-white/15 p-5 backdrop-blur-md">
                            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/85">
                                Atendimento humano
                            </p>
                            <p className="mt-2 max-w-xs font-display text-2xl font-bold text-white">
                                Fórmula pensada para a história única da sua
                                pele.
                            </p>
                        </div>
                    </div>

                    <div className="relative flex flex-col justify-between bg-[#f8f5ef] p-8 md:p-10">
                        <DialogClose
                            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/10 bg-white/80 text-slate-500 transition hover:bg-white hover:text-slate-900"
                            aria-label="Fechar"
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                close
                            </span>
                        </DialogClose>

                        <div className="space-y-8 pr-10">
                            <DialogHeader className="space-y-4">
                                <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-primary">
                                    Diagnóstico pessoal
                                </span>
                                <DialogTitle asChild>
                                    <h1 className="font-display text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
                                        Diagnóstico pessoal personalizado
                                    </h1>
                                </DialogTitle>
                                <DialogDescription asChild>
                                    <h2 className="text-base font-medium leading-relaxed text-slate-600 md:text-lg">
                                        O nosso diagnóstico pessoal serve para
                                        criarmos cremes específicos para a sua
                                        questão de saúde.
                                    </h2>
                                </DialogDescription>
                            </DialogHeader>

                            <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                                Feito 100% para você, ele requer atendimento
                                personalizado em nosso WhatsApp.
                            </p>
                        </div>

                        <div className="mt-8 flex flex-col gap-4">
                            <Link
                                href={WHATSAPP_LINK}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#25D366] px-6 py-4 text-base font-bold text-white shadow-[0_18px_40px_-20px_rgba(37,211,102,0.95)] transition hover:brightness-105"
                            >
                                <WhatsAppIcon />
                                Falar no WhatsApp
                            </Link>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
