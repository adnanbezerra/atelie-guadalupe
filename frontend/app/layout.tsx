import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif, Public_Sans } from "next/font/google";
import { AppCartProvider } from "@/components/providers/cart-provider";
import { AppUserProvider } from "@/components/providers/user-provider";
import { WhatsappFloatingButtonGate } from "@/components/shared/whatsapp-floating-button-gate";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const notoSans = Noto_Sans({
    subsets: ["latin"],
    variable: "--font-noto-sans",
});

const notoSerif = Noto_Serif({
    subsets: ["latin"],
    variable: "--font-noto-serif",
});

const publicSans = Public_Sans({
    subsets: ["latin"],
    variable: "--font-public-sans",
});

export const metadata: Metadata = {
    title: "Ateliê Guadalupe",
    description:
        "Cosméticos naturais à base de sebo e artesanato autoral feitos à mão no Ateliê Guadalupe.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
            <body
                className={`${notoSans.variable} ${notoSerif.variable} ${publicSans.variable} antialiased`}
            >
                <AppUserProvider>
                    <AppCartProvider>{children}</AppCartProvider>
                </AppUserProvider>
                <WhatsappFloatingButtonGate />
                <Toaster />
            </body>
        </html>
    );
}
