"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, ...props }: CalendarProps) {
    return (
        <DayPicker
            locale={ptBR}
            className={cn(
                "rounded-lg border bg-white p-3 text-slate-900",
                className,
            )}
            classNames={{
                root: "relative w-fit min-w-[18rem]",
                months: "flex flex-col gap-4",
                month: "space-y-4",
                month_caption: "hidden",
                caption_label: "text-sm font-bold",
                nav: "hidden",
                button_previous:
                    "flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 [&_svg]:h-4 [&_svg]:w-4",
                button_next:
                    "flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 [&_svg]:h-4 [&_svg]:w-4",
                month_grid: "w-full border-collapse",
                weekdays: "grid grid-cols-7",
                weekday:
                    "py-1 text-center text-[11px] font-bold text-slate-400",
                week: "grid grid-cols-7",
                day: "p-0 text-center",
                day_button:
                    "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-slate-700 transition hover:bg-slate-100",
                selected:
                    "[&>button]:bg-slate-900 [&>button]:text-white [&>button]:hover:bg-slate-900",
                today: "[&>button]:border [&>button]:border-slate-300",
                outside: "text-slate-300 opacity-50",
                disabled: "text-slate-300 opacity-50",
                ...classNames,
            }}
            {...props}
        />
    );
}
