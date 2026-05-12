"use client";

import { usePathname } from "next/navigation";
import { WhatsappFloatingButton } from "@/components/shared/whatsapp-floating-button";

const hiddenPrefixes = ["/admin", "/login", "/cadastro"];

export function WhatsappFloatingButtonGate() {
    const pathname = usePathname();

    if (hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
        return null;
    }

    return <WhatsappFloatingButton />;
}
