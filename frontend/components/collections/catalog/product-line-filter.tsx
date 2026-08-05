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
            <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                    checked={!selectedUuid}
                    name={name}
                    onChange={() => onChange("")}
                    type="radio"
                />
                Todas as linhas
            </label>
            {lines.map((line) => (
                <label
                    className="flex cursor-pointer items-center gap-3 text-sm"
                    key={line.uuid}
                >
                    <input
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
            <div>
                <h4 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider">
                    Linhas de produtos
                </h4>
                <div className="space-y-2">{content}</div>
            </div>
        );
    }

    return (
        <div>
            <h3 className="mb-4 flex items-center gap-2 font-public font-semibold text-neutral-900">
                <span className="material-symbols-outlined text-[#D4AF37]">
                    filter_list
                </span>
                Linhas de produtos
            </h3>
            <div className="space-y-3">{content}</div>
        </div>
    );
}
