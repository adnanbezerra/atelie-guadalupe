export default function Loading() {
    return (
        <main
            aria-busy="true"
            aria-label="Carregando detalhes do pedido"
            className="mx-auto min-h-screen max-w-6xl animate-pulse px-4 py-10 md:px-8 md:py-14"
        >
            <div className="h-11 w-40 rounded-lg bg-slate-200" />
            <div className="mt-10 h-44 rounded-2xl bg-white" />
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
                <div className="h-[34rem] rounded-2xl bg-white" />
                <div className="h-96 rounded-2xl bg-white" />
            </div>
        </main>
    );
}
