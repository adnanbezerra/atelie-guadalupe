import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";

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
            <body
                className="antialiased"
                style={
                    {
                        "--font-sans":
                            '"Segoe UI", "Helvetica Neue", sans-serif',
                        "--font-display":
                            '"Iowan Old Style", "Times New Roman", serif',
                    } as CSSProperties
                }
            >
                {children}
            </body>
        </html>
    );
}
