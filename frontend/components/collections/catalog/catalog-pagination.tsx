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
        <nav
            aria-label="Paginação do catálogo"
            className="mt-14 flex flex-wrap items-center justify-center gap-2"
        >
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
                            ? "flex h-11 w-11 items-center justify-center rounded-lg bg-primary font-bold text-white"
                            : "flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:border-primary hover:text-primary"
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
        </nav>
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
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            disabled={disabled}
            onClick={onClick}
            type="button"
        >
            {children}
        </button>
    );
}
