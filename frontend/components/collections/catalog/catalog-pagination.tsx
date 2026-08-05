type CatalogPaginationProps = {
    currentPage: number;
    onChange: (page: number) => void;
    pageNumbers: number[];
    totalPages: number;
};

export function CatalogPagination({
    currentPage,
    onChange,
    pageNumbers,
    totalPages,
}: CatalogPaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="mt-16 flex items-center justify-center gap-3">
            <PageButton
                ariaLabel="Página anterior"
                disabled={currentPage <= 1}
                onClick={() => onChange(currentPage - 1)}
            >
                <span className="material-symbols-outlined text-sm">
                    chevron_left
                </span>
            </PageButton>
            {pageNumbers.map((pageNumber) => (
                <button
                    aria-current={
                        pageNumber === currentPage ? "page" : undefined
                    }
                    className={
                        pageNumber === currentPage
                            ? "flex h-10 w-10 items-center justify-center rounded-full bg-[#4A3728] font-bold text-white"
                            : "flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200"
                    }
                    key={pageNumber}
                    onClick={() => onChange(pageNumber)}
                    type="button"
                >
                    {pageNumber}
                </button>
            ))}
            <PageButton
                ariaLabel="Próxima página"
                disabled={currentPage >= totalPages}
                onClick={() => onChange(currentPage + 1)}
            >
                <span className="material-symbols-outlined text-sm">
                    chevron_right
                </span>
            </PageButton>
        </div>
    );
}

function PageButton({
    ariaLabel,
    children,
    disabled,
    onClick,
}: {
    ariaLabel: string;
    children: React.ReactNode;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            aria-label={ariaLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled}
            onClick={onClick}
            type="button"
        >
            {children}
        </button>
    );
}
