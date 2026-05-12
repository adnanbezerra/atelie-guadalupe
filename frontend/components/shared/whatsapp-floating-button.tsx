import Image from "next/image";

const WHATSAPP_PHONE = "5583988337598";
const WHATSAPP_MESSAGE =
    "Olá, vim pelo website e gostaria de fazer um diagnóstico personalizado!";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    WHATSAPP_MESSAGE,
)}`;

export function WhatsappFloatingButton() {
    return (
        <a
            aria-label="Falar com atendimento no WhatsApp"
            className="fixed right-5 bottom-5 z-50 flex size-14 items-center justify-center rounded-full shadow-2xl shadow-emerald-900/20 transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300 md:right-8 md:bottom-8 md:size-16"
            href={WHATSAPP_LINK}
            rel="noopener noreferrer"
            target="_blank"
        >
            <Image
                alt=""
                className="size-8 md:size-10"
                height={40}
                src="/zap.png"
                width={40}
            />
        </a>
    );
}
