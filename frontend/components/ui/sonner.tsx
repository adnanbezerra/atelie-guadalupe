"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
    return (
        <Sonner
            closeButton
            position="top-right"
            richColors
            toastOptions={{
                classNames: {
                    toast: "font-public",
                    title: "text-sm font-semibold",
                    description: "text-sm",
                },
            }}
            {...props}
        />
    );
}
