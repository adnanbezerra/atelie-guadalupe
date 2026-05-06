import type { Metadata } from "next";
import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { ServerHeader } from "@/components/header/server";
import { SiteFooter } from "@/components/site/site-footer";

export const metadata: Metadata = {
    title: "Meu Perfil | Ateliê Guadalupe",
};

export default function ProfilePage() {
    return (
        <div className="min-h-screen bg-[#FAFAFA] text-slate-900">
            <ServerHeader />
            <ProfilePageClient />
            <SiteFooter />
        </div>
    );
}
