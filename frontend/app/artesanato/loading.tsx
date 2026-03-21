import { LoadingPage } from "@/components/shared/loading-page";
import { PageShell } from "@/components/shared/page-shell";

export default function Loading() {
    return (
        <PageShell eyebrow="Artesanato e Artes Sacras" title="Artesanato">
            <LoadingPage title="Artesanato" />
        </PageShell>
    );
}
