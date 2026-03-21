import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif, Public_Sans } from "next/font/google";
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
    title: "Atelie Guadalupe",
    description:
        "Cosmeticos botanicos e artesanato autoral com experiencia publica e painel administrativo.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
            <head>
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body
                className={`${notoSans.variable} ${notoSerif.variable} ${publicSans.variable} antialiased`}
            >
                {children}
            </body>
        </html>
    );
}
