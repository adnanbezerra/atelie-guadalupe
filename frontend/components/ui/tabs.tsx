"use client";

import {
    ButtonHTMLAttributes,
    HTMLAttributes,
    createContext,
    useContext,
} from "react";
import { cn } from "@/lib/utils";

const TabsContext = createContext<{
    value: string;
    onValueChange: (value: string) => void;
} | null>(null);

export function Tabs({
    value,
    onValueChange,
    className,
    children,
}: HTMLAttributes<HTMLDivElement> & {
    value: string;
    onValueChange: (value: string) => void;
}) {
    return (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div className={className}>{children}</div>
        </TabsContext.Provider>
    );
}

export function TabsList({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "inline-flex flex-wrap items-center gap-2 rounded-full border border-white/60 bg-white/80 p-1 shadow-sm",
                className,
            )}
            {...props}
        />
    );
}

export function TabsTrigger({
    value,
    className,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
}) {
    const context = useContext(TabsContext);

    if (!context) {
        throw new Error("TabsTrigger must be used inside Tabs.");
    }

    return (
        <button
            className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold",
                context.value === value
                    ? "bg-primary text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100",
                className,
            )}
            onClick={() => context.onValueChange(value)}
            type="button"
            {...props}
        >
            {children}
        </button>
    );
}

export function TabsContent({
    value,
    className,
    children,
    ...props
}: HTMLAttributes<HTMLDivElement> & {
    value: string;
}) {
    const context = useContext(TabsContext);

    if (!context || context.value !== value) {
        return null;
    }

    return (
        <div className={className} {...props}>
            {children}
        </div>
    );
}
