import type { ProductLine } from "@/lib/types";

type ProductLineFilterProps = {
    lines: ProductLine[];
    selectedUuid: string;
    variant: "beauty" | "crafts";
    onChange: (uuid: string) => void;
};

export function ProductLineFilter({
    lines,
    selectedUuid,
    variant,
    onChange,
}: ProductLineFilterProps) {
    const isCraft = variant === "crafts";
    const name = isCraft ? "craft-product-line" : "product-line";
    const content = (
        <>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white">
                <input
                    className="size-4 accent-primary"
                    checked={!selectedUuid}
                    name={name}
                    onChange={() => onChange("")}
                    type="radio"
                />
                Todas as linhas
            </label>
            {lines.map((line) => (
                <label
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-white"
                    key={line.uuid}
                >
                    <input
                        className="size-4 accent-primary"
                        checked={selectedUuid === line.uuid}
                        name={name}
                        onChange={() => onChange(line.uuid)}
                        type="radio"
                    />
                    {line.name}
                </label>
            ))}
            {!lines.length ? (
                <p
                    className={`text-sm ${isCraft ? "text-neutral-500" : "text-slate-500"}`}
                >
                    Nenhuma linha cadastrada.
                </p>
            ) : null}
        </>
    );

    if (!isCraft) {
        return (
            <fieldset>
                <legend className="mb-2 w-full border-b border-slate-200 pb-3 text-sm font-bold">
                    Linhas de produtos
                </legend>
                <div className="space-y-1">{content}</div>
            </fieldset>
        );
    }

    return (
        <fieldset>
            <legend className="mb-2 flex w-full items-center gap-2 font-public font-semibold text-neutral-900">
                <span className="material-symbols-outlined text-secondary">
                    filter_list
                </span>
                Linhas de produtos
            </legend>
            <div className="space-y-1">{content}</div>
        </fieldset>
    );
}
